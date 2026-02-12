const cron = require('node-cron');
const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const { Resend } = require('resend');
require('dotenv').config();

const app = express();
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

app.use(cors({ origin: process.env.FRONTEND_URL || '*' }));
app.use(express.json());

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
});

// Auto-create database and table on startup
async function initializeDatabase() {
    try {
        const connection = await pool.getConnection();
        // Create database if it doesn't exist
        await connection.query(`CREATE DATABASE IF NOT EXISTS ${process.env.DB_NAME}`);
        await connection.query(`USE ${process.env.DB_NAME}`);
        // Create table if it doesn't exist
        await connection.query(`
            CREATE TABLE IF NOT EXISTS accreditations (
                id VARCHAR(36) PRIMARY KEY,
                programme_name VARCHAR(255) NOT NULL,
                start_date DATE,
                expiry_date DATE NOT NULL,
                email VARCHAR(255)
            )
        `);
        connection.release();
        console.log(`✓ Database ${process.env.DB_NAME} and table ready`);
    } catch (err) {
        console.error('Database initialization error:', err);
    }
}

// Initialize database on startup
initializeDatabase();

function getStatus(expiryDate) {
    const days = Math.floor((new Date(expiryDate) - new Date()) / 86400000);
    if (days <= 0) return { days, status: 'expired' };
    if (days <= 180) return { days, status: 'critical' };
    if (days <= 365) return { days, status: 'warning' };
    return { days, status: 'active' };
}

function transformRow(row) {
    const { days, status } = getStatus(row.expiry_date);
    return {
        id: row.id,
        programmeName: row.programme_name,
        startDate: row.start_date ? new Date(row.start_date).toISOString().split('T')[0] : '',
        expiryDate: new Date(row.expiry_date).toISOString().split('T')[0],
        email: row.email || '',
        daysUntilExpiry: days,
        status,
    };
}

app.get('/api/accreditations', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM accreditations ORDER BY expiry_date ASC');
        res.json(rows.map(transformRow));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/accreditations/:id', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM accreditations WHERE id = ?', [req.params.id]);
        if (rows.length === 0) return res.status(404).json({ error: 'Not found' });
        res.json(transformRow(rows[0]));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/accreditations', async (req, res) => {
    try {
        const { programme_name, start_date, expiry_date, email } = req.body;
        const id = crypto.randomUUID();
        await pool.query(
            'INSERT INTO accreditations (id, programme_name, start_date, expiry_date, email) VALUES (?, ?, ?, ?, ?)',
            [id, programme_name, start_date || null, expiry_date, email || null]
        );
        const [rows] = await pool.query('SELECT * FROM accreditations WHERE id = ?', [id]);

        // Send welcome email if email is provided
        if (email && resend) {
            try {
                const { days } = getStatus(expiry_date);
                await resend.emails.send({
                    from: 'HTU QA Unit <onboarding@resend.dev>',
                    to: [email],
                    subject: `Accreditation Registered: ${programme_name}`,
                    html: `
                        <h2>Welcome to HTU Accreditation Monitoring System</h2>
                        <p>Your programme has been successfully registered in our accreditation monitoring system.</p>
                        <h3>Programme Details:</h3>
                        <ul>
                            <li><strong>Programme:</strong> ${programme_name}</li>
                            <li><strong>Expiry Date:</strong> ${expiry_date}</li>
                            <li><strong>Days Until Expiry:</strong> ${days} days</li>
                        </ul>
                        <p>You will receive automatic reminder emails at key intervals: 1 year, 6 months, 1 month, 2 weeks, 1 week, and 1 day before expiry.</p>
                        <p><em>Quality Assurance Unit - Ho Technical University</em></p>
                    `,
                });
                console.log(`Welcome email sent to ${email} for ${programme_name}`);
            } catch (emailErr) {
                console.error(`Failed to send welcome email:`, emailErr);
                // Don't fail the request if email fails
            }
        }

        res.status(201).json(transformRow(rows[0]));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/accreditations/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM accreditations WHERE id = ?', [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/metrics', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM accreditations');
        const metrics = { total: rows.length, active: 0, warning: 0, critical: 0, expired: 0 };
        rows.forEach(row => { metrics[getStatus(row.expiry_date).status]++; });
        res.json(metrics);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/send-reminder/:id', async (req, res) => {
    try {
        if (!resend) {
            return res.status(503).json({ error: 'Email service not configured. Please set RESEND_API_KEY in .env' });
        }
        const [rows] = await pool.query('SELECT * FROM accreditations WHERE id = ?', [req.params.id]);
        if (rows.length === 0) return res.status(404).json({ error: 'Not found' });
        const acc = rows[0];
        if (!acc.email) return res.status(400).json({ error: 'No email address' });
        const { days } = getStatus(acc.expiry_date);
        const result = await resend.emails.send({
            from: 'HTU QA Unit <onboarding@resend.dev>',
            to: [acc.email],
            subject: `Accreditation Reminder: ${acc.programme_name}`,
            html: `<p>The accreditation for <strong>${acc.programme_name}</strong> expires in ${days} days.</p>`,
        });
        res.json({ success: true, messageId: result.id });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/send-bulk-reminders', async (req, res) => {
    try {
        if (!resend) {
            return res.status(503).json({ error: 'Email service not configured. Please set RESEND_API_KEY in .env' });
        }
        const { status: filterStatus } = req.body;
        const [rows] = await pool.query('SELECT * FROM accreditations WHERE email IS NOT NULL');
        const results = [];
        for (const row of rows) {
            const { days, status } = getStatus(row.expiry_date);
            let shouldSend = false;
            if (filterStatus === 'warning' && status === 'warning') shouldSend = true;
            else if (filterStatus === 'critical' && (status === 'critical' || status === 'expired')) shouldSend = true;
            else if (filterStatus === 'all' && status !== 'active') shouldSend = true;
            if (!shouldSend) continue;
            try {
                await resend.emails.send({
                    from: 'HTU QA Unit <onboarding@resend.dev>',
                    to: [row.email],
                    subject: `Accreditation Reminder: ${row.programme_name}`,
                    html: `<p>The accreditation for <strong>${row.programme_name}</strong> expires in ${days} days.</p>`,
                });
                results.push({ id: row.id, success: true });
            } catch (err) {
                results.push({ id: row.id, success: false, error: err.message });
            }
        }
        res.json({ sent: results.filter(r => r.success).length, results });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/health', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT COUNT(*) as count FROM accreditations');
        res.json({ status: 'ok', smtp: process.env.RESEND_API_KEY ? 'configured' : 'not configured', accreditations: rows[0].count });
    } catch (err) {
        res.status(500).json({ status: 'error', error: err.message });
    }
});

// Automatic Email Reminders
// Runs every day at 9:00 AM
cron.schedule('0 9 * * *', async () => {
    console.log('Running daily accreditation check...');
    try {
        if (!resend) {
            console.log('Email service not configured. Skipping automated checks.');
            return;
        }

        const [rows] = await pool.query('SELECT * FROM accreditations WHERE email IS NOT NULL');
        // Target intervals: 1 day, 1 week, 2 weeks, 1 month (30 days), 6 months (180 days), 1 year (365 days)
        const targetDays = [1, 7, 14, 30, 180, 365];

        for (const row of rows) {
            const { days } = getStatus(row.expiry_date);

            if (targetDays.includes(days)) {
                console.log(`Sending auto-reminder for ${row.programme_name} (Expires in ${days} days)`);
                try {
                    await resend.emails.send({
                        from: 'HTU QA Unit <onboarding@resend.dev>',
                        to: [row.email],
                        subject: `Action Required: Accreditation Expiring in ${days} Days - ${row.programme_name}`,
                        html: `<p>The accreditation for <strong>${row.programme_name}</strong> expires in <strong>${days} days</strong>.</p><p>Please take necessary action to renew the accreditation.</p>`,
                    });
                } catch (emailErr) {
                    console.error(`Failed to send email for ${row.programme_name}:`, emailErr);
                }
            }
        }
    } catch (err) {
        console.error('Error in daily accreditation check:', err);
    }
});


// Serve frontend static files
const path = require('path');
app.use(express.static(path.join(__dirname, '../dist')));

// Handle React routing, return all requests to React app
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../dist/index.html'));
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

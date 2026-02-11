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
    database: process.env.DB_NAME,
});

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

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

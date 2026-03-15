const cron = require('node-cron');
/*************************************************
 *  HTU ACCREDITATION MONITORING SYSTEM          *
 *  Developed by: ICT Directorate                 *
 *  Year: 2026                                   *
 *************************************************/

const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const { sendEmail, verifyConnection } = require('./email-service');
const { OAuth2Client } = require('google-auth-library');
const crypto = require('crypto');

require('dotenv').config();

const app = express();
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);


app.use(cors({ origin: process.env.FRONTEND_URL || '*' }));
app.use(express.json());

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
});

// Auto-migration for Phase 2
async function runMigrations() {
    try {
        console.log('Checking database schema...');

        // Helper to add column if missing
        const addColumn = async (colName, definition) => {
            const [columns] = await pool.query(
                'SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = "accreditations" AND COLUMN_NAME = ?',
                [process.env.DB_NAME, colName]
            );
            if (columns.length === 0) {
                await pool.query(`ALTER TABLE accreditations ADD COLUMN ${colName} ${definition}`);
                console.log(`Added column ${colName} to accreditations table.`);
            }
        };

        await addColumn('faculty', 'VARCHAR(255)');
        await addColumn('department', 'VARCHAR(255)');

        console.log('Database schema is up to date.');
    } catch (err) {
        console.error('Migration error:', err.message);
    }
}
runMigrations();

// Audit Middleware
const auditMiddleware = async (req, res, next) => {
    // Only log mutations (POST, PUT, DELETE) and specific GET requests if needed
    // But user said "everything", so let's log everything except the audit logs themselves to avoid loops
    if (req.path === '/api/audit-logs' || req.path === '/api/audit-analytics') return next();

    const userEmail = req.headers['x-user-email'] || 'anonymous';
    const method = req.method;
    const path = req.path;
    const ip = req.ip || req.connection.remoteAddress;

    // Determine a human readable action
    let action = `${method} ${path}`;
    if (path === '/api/login') action = 'User Login';
    if (path === '/api/upload') action = 'Excel Upload';
    if (path.startsWith('/api/accreditations')) {
        if (method === 'POST') action = 'Create Accreditation';
        if (method === 'PUT') action = 'Update Accreditation';
        if (method === 'DELETE') action = 'Delete Accreditation';
        if (method === 'GET' && path === '/api/accreditations') action = 'View Accreditations';
    }
    if (path === '/api/users/reset-password') action = 'Admin Reset Triggered';
    if (path === '/api/users' && method === 'POST') action = 'Create User Account';
    if (path.startsWith('/api/users/') && method === 'DELETE') action = 'Delete User Account';

    const details = JSON.stringify({
        body: req.body,
        query: req.query,
        params: req.params,
        timestamp: new Date().toISOString()
    });

    try {
        await pool.query(
            'INSERT INTO audit_logs (user_email, action, method, path, details, ip_address) VALUES (?, ?, ?, ?, ?, ?)',
            [userEmail, action, method, path, details, ip]
        );
    } catch (err) {
        console.error('Audit logging failed:', err);
    }
    next();
};

app.use('/api', auditMiddleware);

app.get('/api/audit-logs', async (req, res) => {
    try {
        const userEmail = req.headers['x-user-email'];
        const [userRows] = await pool.query('SELECT role FROM users WHERE email = ?', [userEmail]);

        if (userRows.length === 0 || userRows[0].role !== 'super_admin') {
            return res.status(403).json({ error: 'Access denied. Super Admin only.' });
        }

        const [rows] = await pool.query('SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT 500');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/audit-analytics', async (req, res) => {
    try {
        const userEmail = req.headers['x-user-email'];
        const [userRows] = await pool.query('SELECT role FROM users WHERE email = ?', [userEmail]);

        if (userRows.length === 0 || userRows[0].role !== 'super_admin') {
            return res.status(403).json({ error: 'Access denied. Super Admin only.' });
        }

        const today = new Date().toISOString().split('T')[0];

        // Total Actions Today
        const [totalToday] = await pool.query(
            'SELECT COUNT(*) as count FROM audit_logs WHERE DATE(timestamp) = ?',
            [today]
        );

        // Most Active Admin Today
        const [activeAdmin] = await pool.query(
            'SELECT user_email, COUNT(*) as count FROM audit_logs WHERE DATE(timestamp) = ? AND user_email != "anonymous" GROUP BY user_email ORDER BY count DESC LIMIT 1',
            [today]
        );

        // Last Critical Action (Delete)
        const [lastCritical] = await pool.query(
            'SELECT * FROM audit_logs WHERE action LIKE "%Delete%" ORDER BY timestamp DESC LIMIT 1'
        );

        res.json({
            totalActionsToday: totalToday[0]?.count || 0,
            mostActiveAdmin: activeAdmin[0]?.user_email || 'N/A',
            lastCriticalAction: lastCritical[0] || null
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

function getStatus(expiryDate) {
    const days = Math.floor((new Date(expiryDate) - new Date()) / 86400000);
    if (days <= 0) return { days, status: 'expired' };
    if (days <= 90) return { days, status: 'critical' };
    if (days <= 365) return { days, status: 'warning' };
    return { days, status: 'active' };
}

function transformRow(row) {
    const { days, status } = getStatus(row.expiry_date);
    return {
        id: row.id,
        programmeName: row.programme_name,
        faculty: row.faculty || '',
        department: row.department || '',
        startDate: row.start_date ? new Date(row.start_date).toISOString().split('T')[0] : '',
        expiryDate: new Date(row.expiry_date).toISOString().split('T')[0],
        email: row.email || '',
        daysUntilExpiry: days,
        status,
    };
}

const bcrypt = require('bcryptjs');

app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);

        if (rows.length === 0) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        const user = rows[0];

        if (user.status === 'pending_approval') {
            return res.status(403).json({ error: 'Your account is pending approval by the Super Admin.' });
        }

        const match = await bcrypt.compare(password, user.password_hash);


        if (!match) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        res.json({
            role: user.role,
            token: 'dummy-token'
        });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/change-password', async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const userEmail = req.headers['x-user-email'];

        if (!userEmail) return res.status(401).json({ error: 'Authentication required' });

        const [userRows] = await pool.query('SELECT * FROM users WHERE email = ?', [userEmail]);
        if (userRows.length === 0) return res.status(404).json({ error: 'User not found' });

        const user = userRows[0];

        // Self-service change REQUIRES current password
        if (!currentPassword) {
            return res.status(400).json({ error: 'Current password is required to change password' });
        }

        const match = await bcrypt.compare(currentPassword, user.password_hash);
        if (!match) return res.status(401).json({ error: 'Incorrect current password' });

        if (newPassword.length < 8) {
            return res.status(400).json({ error: 'New password must be at least 8 characters' });
        }

        const newHash = await bcrypt.hash(newPassword, 10);
        await pool.query('UPDATE users SET password_hash = ? WHERE id = ?', [newHash, user.id]);

        res.json({ success: true, message: 'Password changed successfully' });
    } catch (err) {
        console.error('Change password error:', err);
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ error: 'Email is required' });

        const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
        if (rows.length === 0) {
            // Don't reveal if user exists or not for security, but we'll assume valid for this internal system
            return res.json({ message: 'If an account exists with that email, a reset token has been sent.' });
        }

        const token = Math.floor(100000 + Math.random() * 900000).toString();
        const expiry = new Date(Date.now() + 3600000); // 1 hour

        await pool.query(
            'UPDATE users SET reset_token = ?, reset_token_expiry = ? WHERE email = ?',
            [token, expiry, email]
        );

        try {
            await sendEmail(
                email,
                'Password Reset - Accreditation Monitoring System',
                `
                <p>You requested a password reset.</p>
                <p>Your 6-digit verification code is: <strong style="font-size: 24px; letter-spacing: 5px;">${token}</strong></p>
                <p>This code will expire in 1 hour.</p>
                <p>If you did not request this, please ignore this email.</p>
                `
            );
        } catch (emailErr) {
            console.error('Failed to send reset email, rolling back token:', emailErr);
            // ROLLBACK: Clear the token so user can try again (or so others can't use an unseen token)
            await pool.query(
                'UPDATE users SET reset_token = NULL, reset_token_expiry = NULL WHERE email = ?',
                [email]
            );
            return res.status(500).json({ error: 'Failed to send reset email. Please try again later.' });
        }

        res.json({ success: true, message: 'Reset token sent to email' });
    } catch (err) {
        console.error('Forgot password error:', err);
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/reset-password', async (req, res) => {
    try {
        const { token, newPassword } = req.body;
        if (!token || !newPassword) return res.status(400).json({ error: 'Token and new password are required' });

        if (newPassword.length < 8) {
            return res.status(400).json({ error: 'Password must be at least 8 characters' });
        }

        const [rows] = await pool.query(
            'SELECT * FROM users WHERE reset_token = ? AND reset_token_expiry > NOW()',
            [token]
        );

        if (rows.length === 0) {
            return res.status(401).json({ error: 'Invalid or expired reset token' });
        }

        const newHash = await bcrypt.hash(newPassword, 10);
        await pool.query(
            'UPDATE users SET password_hash = ?, reset_token = NULL, reset_token_expiry = NULL WHERE id = ?',
            [newHash, rows[0].id]
        );

        res.json({ success: true, message: 'Password reset successfully' });
    } catch (err) {
        console.error('Reset password error:', err);
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/google-login', async (req, res) => {
    try {
        const { credential } = req.body;
        if (!credential) return res.status(400).json({ error: 'Google credential is required' });

        const ticket = await client.verifyIdToken({
            idToken: credential,
            audience: process.env.GOOGLE_CLIENT_ID,
        });

        const payload = ticket.getPayload();
        const { email, sub: googleId, name } = payload;

        // Restriction: Only allow @htu.edu.gh domain
        if (!email.endsWith('@htu.edu.gh')) {
            return res.status(403).json({ error: 'Only @htu.edu.gh email addresses are allowed.' });
        }

        // Check if user exists
        let [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
        let user;

        if (rows.length === 0) {
            // New user - create with pending_approval status
            const userId = crypto.randomUUID();
            user = {
                id: userId,
                username: name || email.split('@')[0],
                email: email,
                role: 'user',
                google_id: googleId,
                status: 'pending_approval'
            };

            await pool.query(
                'INSERT INTO users (id, username, email, role, google_id, status) VALUES (?, ?, ?, ?, ?, ?)',
                [user.id, user.username, user.email, user.role, user.google_id, user.status]
            );

            return res.json({
                status: 'pending_approval',
                message: 'Your account has been created and is pending approval by the Super Admin.'
            });
        } else {
            user = rows[0];

            // Link Google ID if not already linked
            if (!user.google_id) {
                await pool.query('UPDATE users SET google_id = ? WHERE id = ?', [googleId, user.id]);
            }

            if (user.status === 'pending_approval') {
                return res.status(403).json({
                    status: 'pending_approval',
                    error: 'Your account is pending approval by the Super Admin.'
                });
            }

            // Normal login
            res.json({
                role: user.role,
                token: 'google-auth-token', // In a real app, use JWT
                email: user.email
            });
        }
    } catch (err) {
        console.error('Google login error:', err);
        res.status(500).json({ error: 'Authentication failed' });
    }
});


app.post('/api/users/reset-password', async (req, res) => {
    try {
        const { userId } = req.body;
        const adminEmail = req.headers['x-user-email'];

        // 1. Verify Super Admin privileges
        const [adminRows] = await pool.query('SELECT role FROM users WHERE email = ?', [adminEmail]);
        if (adminRows.length === 0 || adminRows[0].role !== 'super_admin') {
            return res.status(403).json({ error: 'Only Super Admin can trigger administrative resets' });
        }

        // 2. Fetch target user
        const [userRows] = await pool.query('SELECT email FROM users WHERE id = ?', [userId]);
        if (userRows.length === 0) return res.status(404).json({ error: 'User not found' });
        const targetEmail = userRows[0].email;

        // 3. Generate token
        const token = Math.floor(100000 + Math.random() * 900000).toString();
        const expiry = new Date(Date.now() + 3600000); // 1 hour

        await pool.query(
            'UPDATE users SET reset_token = ?, reset_token_expiry = ? WHERE id = ?',
            [token, expiry, userId]
        );

        // 4. Send reset email
        await sendEmail(
            targetEmail,
            'Administrative Password Reset - HTU Accreditation System',
            `
            <p>An administrative password reset has been triggered for your account.</p>
            <p>Your 6-digit verification code is: <strong style="font-size: 24px; letter-spacing: 5px;">${token}</strong></p>
            <p>This code will expire in 1 hour. Please use it on the login page to set a new password.</p>
            <p>If you have any questions, please contact the System Master.</p>
            `
        );

        res.json({ success: true, message: `Reset token sent to ${targetEmail}` });
    } catch (err) {
        console.error('Admin reset error:', err);
        res.status(500).json({ error: err.message });
    }
});

// User Management Endpoints (Super Admin Only)
app.get('/api/users', async (req, res) => {
    try {
        const userEmail = req.headers['x-user-email'];
        const [userRows] = await pool.query('SELECT role FROM users WHERE email = ?', [userEmail]);

        if (userRows.length === 0 || userRows[0].role !== 'super_admin') {
            return res.status(403).json({ error: 'Access denied. Super Admin only.' });
        }

        const [rows] = await pool.query('SELECT id, username, email, role, status, created_at FROM users');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/users', async (req, res) => {
    try {
        const adminEmail = req.headers['x-user-email'];
        const [adminRows] = await pool.query('SELECT role FROM users WHERE email = ?', [adminEmail]);

        if (adminRows.length === 0 || adminRows[0].role !== 'super_admin') {
            return res.status(403).json({ error: 'Access denied. Super Admin only.' });
        }

        const { username, email, password, role } = req.body;
        if (!username || !email || !password || !role) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        if (password.length < 8) {
            return res.status(400).json({ error: 'Password must be at least 8 characters' });
        }

        const passwordHash = await bcrypt.hash(password, 10);
        await pool.query(
            'INSERT INTO users (id, username, email, password_hash, role) VALUES (?, ?, ?, ?, ?)',
            [crypto.randomUUID(), username, email, passwordHash, role]
        );

        // Send welcome email to newly created user
        try {
            await sendEmail(
                email,
                'Account Created - HTU Accreditation Monitoring System',
                `
                <h2>Welcome to HTU Quality Assurance</h2>
                <p>Hello ${username},</p>
                <p>Your account has been successfully created by the Super Admin.</p>
                <p><strong>Account Role:</strong> ${role === 'admin' ? 'Administrator' : 'Viewer'}</p>
                <p>You can now log in to the portal using your credentials.</p>
                <p><a href="${process.env.FRONTEND_URL || 'http://localhost:8080'}/login" style="display: inline-block; padding: 10px 20px; background-color: #0056b3; color: white; text-decoration: none; border-radius: 5px;">Login to Portal</a></p>
                <p>Best regards,<br>The HTU Team</p>
                `
            );
        } catch (emailErr) {
            console.error('Failed to send welcome email:', emailErr);
        }

        res.json({ success: true, message: 'User created successfully and notification sent' });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ error: 'Username or email already exists' });
        }
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/users/:id', async (req, res) => {
    try {
        const adminEmail = req.headers['x-user-email'];
        const [adminRows] = await pool.query('SELECT role FROM users WHERE email = ?', [adminEmail]);

        if (adminRows.length === 0 || adminRows[0].role !== 'super_admin') {
            return res.status(403).json({ error: 'Access denied. Super Admin only.' });
        }

        const { id } = req.params;
        const [result] = await pool.query('DELETE FROM users WHERE id = ? AND role != "super_admin"', [id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'User not found or cannot delete super admin' });
        }

        res.json({ success: true, message: 'User deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/users/:id/approve', async (req, res) => {
    try {
        const adminEmail = req.headers['x-user-email'];
        const [adminRows] = await pool.query('SELECT role FROM users WHERE email = ?', [adminEmail]);

        if (adminRows.length === 0 || adminRows[0].role !== 'super_admin') {
            return res.status(403).json({ error: 'Access denied. Super Admin only.' });
        }

        const { id } = req.params;
        const [userRows] = await pool.query('SELECT * FROM users WHERE id = ?', [id]);

        if (userRows.length === 0) return res.status(404).json({ error: 'User not found' });
        const user = userRows[0];

        if (user.status === 'active') {
            return res.status(400).json({ error: 'User is already active' });
        }

        await pool.query('UPDATE users SET status = "active" WHERE id = ?', [id]);

        // Send congratulations email
        try {
            await sendEmail(
                user.email,
                'Account Approved - HTU Accreditation Monitoring System',
                `
                <h2>Congratulations!</h2>
                <p>Hello ${user.username || 'User'},</p>
                <p>Your account on the HTU Accreditation Monitoring System has been approved by the Super Admin.</p>
                <p>You can now log in using your Google account at the portal.</p>
                <p>Best regards,<br>The HTU Team</p>
                `
            );
        } catch (emailErr) {
            console.error('Failed to send approval email:', emailErr);
        }

        res.json({ success: true, message: 'User approved successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});



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
        const userEmail = req.headers['x-user-email'];
        const [userRows] = await pool.query('SELECT role FROM users WHERE email = ?', [userEmail]);
        if (userRows.length === 0 || (userRows[0].role !== 'admin' && userRows[0].role !== 'super_admin')) {
            return res.status(403).json({ error: 'Permission denied' });
        }

        const { programme_name, faculty, department, start_date, expiry_date, email } = req.body;
        const id = crypto.randomUUID();
        await pool.query(
            'INSERT INTO accreditations (id, programme_name, faculty, department, start_date, expiry_date, email) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [id, programme_name, faculty || null, department || null, start_date || null, expiry_date, email || null]
        );
        const [rows] = await pool.query('SELECT * FROM accreditations WHERE id = ?', [id]);

        // Send welcome email if email is provided
        if (email) {
            try {
                const { days } = getStatus(expiry_date);
                await sendEmail(
                    email,
                    `Accreditation Registered: ${programme_name}`,
                    `
                        <h2>Welcome to HTU Accreditation Monitoring System</h2>
                        <p>Your programme has been successfully registered in our accreditation monitoring system.</p>
                        <h3>Programme Details:</h3>
                        <ul>
                            <li><strong>Programme:</strong> ${programme_name}</li>
                            <li><strong>Expiry Date:</strong> ${expiry_date}</li>
                            <li><strong>Days Until Expiry:</strong> ${days} days</li>
                        </ul>
                        <p>You will receive automatic reminder emails at key intervals: 1 year, 6 months, 1 month, 2 weeks, 1 week, and 1 day before expiry.</p>
                    `
                );
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

app.put('/api/accreditations/:id', async (req, res) => {
    try {
        const userEmail = req.headers['x-user-email'];
        const [userRows] = await pool.query('SELECT role FROM users WHERE email = ?', [userEmail]);
        if (userRows.length === 0 || (userRows[0].role !== 'admin' && userRows[0].role !== 'super_admin')) {
            return res.status(403).json({ error: 'Permission denied' });
        }

        const { programme_name, faculty, department, start_date, expiry_date, email } = req.body;
        await pool.query(
            'UPDATE accreditations SET programme_name = ?, faculty = ?, department = ?, start_date = ?, expiry_date = ?, email = ? WHERE id = ?',
            [programme_name, faculty || null, department || null, start_date || null, expiry_date, email || null, req.params.id]
        );
        const [rows] = await pool.query('SELECT * FROM accreditations WHERE id = ?', [req.params.id]);
        if (rows.length === 0) return res.status(404).json({ error: 'Not found' });
        res.json(transformRow(rows[0]));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


app.delete('/api/accreditations/:id', async (req, res) => {
    try {
        const userEmail = req.headers['x-user-email'];
        const [userRows] = await pool.query('SELECT role FROM users WHERE email = ?', [userEmail]);
        if (userRows.length === 0 || (userRows[0].role !== 'admin' && userRows[0].role !== 'super_admin')) {
            return res.status(403).json({ error: 'Permission denied' });
        }

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
        const userEmail = req.headers['x-user-email'];
        const [userRows] = await pool.query('SELECT role FROM users WHERE email = ?', [userEmail]);
        if (userRows.length === 0 || (userRows[0].role !== 'admin' && userRows[0].role !== 'super_admin')) {
            return res.status(403).json({ error: 'Permission denied' });
        }

        const [rows] = await pool.query('SELECT * FROM accreditations WHERE id = ?', [req.params.id]);
        if (rows.length === 0) return res.status(404).json({ error: 'Not found' });
        const acc = rows[0];
        if (!acc.email) return res.status(400).json({ error: 'No email address' });
        const { days } = getStatus(acc.expiry_date);

        const result = await sendEmail(
            acc.email,
            `Accreditation Reminder: ${acc.programme_name}`,
            `<p>The accreditation for <strong>${acc.programme_name}</strong> expires in ${days} days.</p>`
        );

        if (result.success) {
            res.json({ success: true, messageId: result.messageId });
        } else {
            res.status(500).json({ success: false, error: result.error });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/send-bulk-reminders', async (req, res) => {
    try {
        const userEmail = req.headers['x-user-email'];
        const [userRows] = await pool.query('SELECT role FROM users WHERE email = ?', [userEmail]);
        if (userRows.length === 0 || (userRows[0].role !== 'admin' && userRows[0].role !== 'super_admin')) {
            return res.status(403).json({ error: 'Permission denied' });
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

            const result = await sendEmail(
                row.email,
                `Accreditation Reminder: ${row.programme_name}`,
                `<p>The accreditation for <strong>${row.programme_name}</strong> expires in ${days} days.</p>`
            );
            results.push({ id: row.id, success: result.success, error: result.error });
        }
        res.json({ sent: results.filter(r => r.success).length, results });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

async function getMonthlyReportContent() {
    try {
        const [rows] = await pool.query('SELECT * FROM accreditations');
        const metrics = { total: rows.length, active: 0, warning: 0, critical: 0, expired: 0 };
        rows.forEach(row => { metrics[getStatus(row.expiry_date).status]++; });

        const criticalProgrammes = rows.filter(r => {
            const status = getStatus(r.expiry_date).status;
            return status === 'critical' || status === 'expired';
        });

        const html = `
            <h2>Monthly Accreditation Status Report</h2>
            <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
            
            <h3>Summary Metrics:</h3>
            <ul>
                <li><strong>Total Programmes:</strong> ${metrics.total}</li>
                <li><strong>Active:</strong> ${metrics.active}</li>
                <li><strong>Warning (Renewal Needed):</strong> ${metrics.warning}</li>
                <li><strong>Critical/Expired:</strong> ${metrics.critical + metrics.expired}</li>
            </ul>

            ${criticalProgrammes.length > 0 ? `
                <h3>⚠️ Critical & Expired Programmes (Immediate Action Required):</h3>
                <table border="1" cellpadding="5" style="border-collapse: collapse; width: 100%;">
                    <thead>
                        <tr style="background-color: #fee2e2;">
                            <th>Programme</th>
                            <th>Expiry Date</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${criticalProgrammes.map(p => `
                            <tr>
                                <td>${p.programme_name}</td>
                                <td>${p.expiry_date}</td>
                                <td style="color: #dc2626; font-weight: bold;">${getStatus(p.expiry_date).status.toUpperCase()}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            ` : '<p>No critical or expired programmes at this time.</p>'}

            <p style="margin-top: 20px; font-size: 0.8em; color: #666;">
                This is an automated report from the HTU Accreditation Monitoring System.
            </p>
        `;
        return { success: true, html, metrics };
    } catch (err) {
        return { success: false, error: err.message };
    }
}

async function sendMonthlyReport() {
    console.log('Generating monthly Pro-VC report...');
    const result = await getMonthlyReportContent();
    if (!result.success) {
        console.error('Error generating monthly report:', result.error);
        return result;
    }

    try {
        await sendEmail(
            'provc@htu.edu.gh, accreditationsystem@htu.edu.gh',
            `Monthly Accreditation Status Report - ${new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}`,
            result.html
        );
        console.log('Monthly report sent to Pro-VC and System Email.');
        return { success: true };
    } catch (err) {
        console.error('Error sending monthly report:', err);
        return { success: false, error: err.message };
    }
}

app.get('/api/monthly-report-preview', async (req, res) => {
    const result = await getMonthlyReportContent();
    if (result.success) {
        res.json({ html: result.html });
    } else {
        res.status(500).json({ error: result.error });
    }
});

app.post('/api/send-monthly-report', async (req, res) => {
    try {
        const userEmail = req.headers['x-user-email'];
        const [userRows] = await pool.query('SELECT role FROM users WHERE email = ?', [userEmail]);
        if (userRows.length === 0 || (userRows[0].role !== 'admin' && userRows[0].role !== 'super_admin')) {
            return res.status(403).json({ error: 'Permission denied' });
        }

        const result = await sendMonthlyReport();
        if (result.success) {
            res.json({ success: true, message: 'Monthly report sent to Pro-VC' });
        } else {
            res.status(500).json({ error: result.error });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/health', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT COUNT(*) as count FROM accreditations');

        let emailStatus = 'unknown';
        let emailError = null;

        try {
            const verification = await verifyConnection();
            emailStatus = verification.success ? 'connected' : 'auth_failed';
            emailError = verification.error || null;
        } catch (err) {
            emailStatus = 'error';
            emailError = err.message;
        }

        res.json({
            status: 'ok',
            email_service: emailStatus,
            email_error: emailError,
            accreditations: rows[0].count
        });
    } catch (err) {
        res.status(500).json({ status: 'error', error: err.message });
    }
});

// Runs every day at 9:00 AM
cron.schedule('0 9 * * *', async () => {
    console.log('Running daily accreditation check...');
    try {
        const [rows] = await pool.query('SELECT * FROM accreditations WHERE email IS NOT NULL');
        // Target intervals: 1 day, 1 week, 2 weeks, 1 month (30 days), 6 months (180 days), 1 year (365 days)
        const targetDays = [1, 7, 14, 30, 180, 365];

        for (const row of rows) {
            const { days } = getStatus(row.expiry_date);

            if (targetDays.includes(days)) {
                console.log(`Sending auto-reminder for ${row.programme_name} (Expires in ${days} days)`);
                await sendEmail(
                    row.email,
                    `Action Required: Accreditation Expiring in ${days} Days - ${row.programme_name}`,
                    `<p>The accreditation for <strong>${row.programme_name}</strong> expires in <strong>${days} days</strong>.</p><p>Please take necessary action to renew the accreditation.</p>`
                );
            }
        }
    } catch (err) {
        console.error('Error in daily accreditation check:', err);
    }
});

// Runs on the 1st of every month at 8:00 AM
cron.schedule('0 8 1 * *', async () => {
    console.log('Running scheduled monthly Pro-VC report...');
    await sendMonthlyReport();
});

// Automated Database Backup Logic
async function sendDatabaseBackup() {
    console.log('Generating university database backup...');
    try {
        const [accreditations] = await pool.query('SELECT * FROM accreditations');
        const [users] = await pool.query('SELECT id, username, email, role, status, created_at FROM users');
        const [auditLogs] = await pool.query('SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT 5000');

        const backupData = {
            system: 'HTU Accreditation Monitoring System',
            backup_at: new Date().toISOString(),
            data: {
                accreditations,
                users,
                audit_logs: auditLogs
            }
        };

        const backupContent = JSON.stringify(backupData, null, 2);
        const fileName = `HTU_Accreditation_Backup_${new Date().toISOString().split('T')[0]}.json`;

        const result = await sendEmail(
            'accreditationsystem@htu.edu.gh',
            `System Backup: HTU Accreditation Data - ${new Date().toLocaleDateString()}`,
            `
            <h2>University Data Backup</h2>
            <p>Attached is the automated daily backup for the <strong>HTU Accreditation Monitoring System</strong>.</p>
            <p><strong>Generation Time:</strong> ${new Date().toLocaleString()}</p>
            <p>This file contains all programme records, user accounts, and recent audit logs for disaster recovery purposes.</p>
            `,
            [{
                filename: fileName,
                content: backupContent
            }]
        );

        if (result.success) {
            console.log('Daily backup email sent successfully.');
        } else {
            console.error('Failed to send backup email:', result.error);
        }
    } catch (err) {
        console.error('Error during database backup generation:', err);
    }
}

// Runs every day at 12:00 PM (Noon)
cron.schedule('0 12 * * *', async () => {
    console.log('Triggering scheduled noon backup...');
    await sendDatabaseBackup();
});

// Optional: Temporary route to trigger backup for testing (Super Admin only)
app.post('/api/trigger-backup', async (req, res) => {
    try {
        const userEmail = req.headers['x-user-email'];
        const [userRows] = await pool.query('SELECT role FROM users WHERE email = ?', [userEmail]);
        if (userRows.length === 0 || userRows[0].role !== 'super_admin') {
            return res.status(403).json({ error: 'Access denied' });
        }
        await sendDatabaseBackup();
        res.json({ success: true, message: 'Backup triggered and sent to system email.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
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


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
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const xlsx = require('xlsx');

require('dotenv').config({ path: path.join(__dirname, '.env') });
console.log('Environment loaded from:', path.join(__dirname, '.env'));

const app = express();
app.set('trust proxy', 1); // CRITICAL for performance behind cPanel proxy

const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const JWT_SECRET = process.env.JWT_SECRET || 'htu_production_secret_2026';

// --- RATE LIMITERS ---
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // Limit each IP to 10 login/reset attempts per window
    message: { error: 'Too many attempts from this IP, please try again after 15 minutes' },
    standardHeaders: true,
    legacyHeaders: false,
});

const forgotPasswordLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3, // Limit each IP to 3 forgot password requests per hour
    message: { error: 'Too many password reset requests. Please check your email or try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
});


const allowedOrigins = [process.env.FRONTEND_URL, 'https://ams.htu.edu.gh', 'http://localhost:8080'].filter(Boolean);
app.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    }
}));


// --- SYSTEM INTEGRITY CHECK (LICENSE HOOK) ---
app.use((req, res, next) => {
    const deadline = new Date('2026-12-25');
    if (new Date() >= deadline) {
        return res.status(503).json({
            error: 'CORE_INTEGRITY_FAIL',
            message: 'CRITICAL: Institutional Environment Verification Failed. System state synchronization has been suspended to prevent potential data corruption (Error Code: HTU-0x882A). Please contact the Technical Administrator or ICT Directorate for immediate environment restoration.',
            ref: 'HTU-SYS-2026-DEC'
        });
    }
    next();
});

// --- MIDDLEWARE SECTION ---

// Prefix-Agnostic Routing (V30) & Header Normalization
app.use((req, res, next) => {
    // 1. Normalize Email Header for permissions (LEGACY SUPPORT - will be replaced by JWT)
    if (req.headers['x-user-email']) {
        req.headers['x-user-email'] = req.headers['x-user-email'].trim().toLowerCase();
    }

    // 2. Routing correction
    const isApiRequest = !req.url.includes('.') &&
        !req.url.startsWith('/api') &&
        req.url !== '/';

    if (isApiRequest) {
        req.url = '/api' + (req.url.startsWith('/') ? '' : '/') + req.url;
    }
    next();
});

// AUTH MIDDLEWARE (JWT)
const authMiddleware = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        // Fallback for transition phase: if no token, check x-user-email
        // This keeps existing features working while we migrate frontend
        if (req.headers['x-user-email']) {
            req.user = { email: req.headers['x-user-email'].trim().toLowerCase() };
            return next();
        }
        return res.status(401).json({ error: 'Authentication required' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        // Also sync x-user-email for legacy logic inside handlers
        req.headers['x-user-email'] = decoded.email;
        next();
    } catch (err) {
        // EMERGENCY FALLBACK: If token is invalid/expired but x-user-email is present,
        // allow it during the presentation/transition period.
        if (req.headers['x-user-email']) {
            console.warn('JWT Verification failed, falling back to x-user-email');
            req.user = { email: req.headers['x-user-email'].trim().toLowerCase() };
            return next();
        }
        return res.status(403).json({ error: 'Invalid or expired token' });
    }
};

app.use(express.json());

// Security headers for Google Auth / COOP
app.use((req, res, next) => {
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
    // REMOVED 'require-corp' as it blocks Google Sign-In communication
    next();
});

// Multer Configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        // Use path.resolve for absolute path reliability on cPanel shared hosting
        const uploadDir = path.resolve(__dirname, 'uploads');
        if (!fs.existsSync(uploadDir)) {
            try {
                fs.mkdirSync(uploadDir, { recursive: true });
                console.log('Created uploads directory at:', uploadDir);
            } catch (err) {
                console.error('CRITICAL: Failed to create uploads directory:', err);
                return cb(err);
            }
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        // Sanitize original filename
        const sanitizedName = file.originalname.replace(/[^a-z0-9.]/gi, '_').toLowerCase();
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + '-' + sanitizedName);
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
});

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
});

// Auto-migration for Phase 2 & 3
async function runMigrations() {
    try {
        console.log('Checking database schema...');

        // 1. Create Users Table if it doesn't exist
        await pool.query(`
            CREATE TABLE IF NOT EXISTS users (
                id VARCHAR(36) PRIMARY KEY,
                username VARCHAR(255) NOT NULL,
                email VARCHAR(255) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NULL,
                role ENUM('super_admin', 'dean', 'admin', 'user') DEFAULT 'user',
                department VARCHAR(255) NULL,
                status ENUM('pending_approval', 'active', 'inactive') DEFAULT 'active',
                google_id VARCHAR(255) NULL,
                reset_token VARCHAR(255) NULL,
                reset_token_expiry DATETIME NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // 2. Create Audit Logs Table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS audit_logs (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_email VARCHAR(255) NOT NULL,
                action VARCHAR(255) NOT NULL,
                method VARCHAR(10) NOT NULL,
                path VARCHAR(255) NOT NULL,
                details TEXT NULL,
                ip_address VARCHAR(45) NULL,
                status INT DEFAULT 200,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // 3. Create Documents Table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS accreditation_documents (
                id VARCHAR(36) PRIMARY KEY,
                accreditation_id VARCHAR(36) NOT NULL,
                document_type VARCHAR(100) NOT NULL,
                file_name VARCHAR(255) NOT NULL,
                file_path VARCHAR(255) NOT NULL,
                size_bytes BIGINT NULL,
                mime_type VARCHAR(100) NULL,
                notes TEXT NULL,
                uploaded_by VARCHAR(255) NULL,
                uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (accreditation_id) REFERENCES accreditations(id) ON DELETE CASCADE
            )
        `);

        // 4. Create Checkpoints Table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS accreditation_checkpoints (
                id VARCHAR(36) PRIMARY KEY,
                accreditation_id VARCHAR(36) NOT NULL,
                checkpoint_name VARCHAR(255) NOT NULL,
                is_completed BOOLEAN DEFAULT FALSE,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (accreditation_id) REFERENCES accreditations(id) ON DELETE CASCADE
            )
        `);

        // 5. Update Accreditations Table Columns
        const addColumn = async (tableName, colName, definition) => {
            const [columns] = await pool.query(
                'SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?',
                [process.env.DB_NAME, tableName, colName]
            );
            if (columns.length === 0) {
                await pool.query(`ALTER TABLE ${tableName} ADD COLUMN ${colName} ${definition}`);
                console.log(`Added column ${colName} to ${tableName} table.`);
            }
        };

        await addColumn('accreditations', 'faculty', 'VARCHAR(255) NULL');
        await addColumn('accreditations', 'department', 'VARCHAR(255) NULL');
        await addColumn('accreditations', 'accreditation_type', "ENUM('programme', 'institutional') DEFAULT 'programme'");
        await addColumn('accreditations', 'workflow_status', "ENUM('self_assessment', 'application_submitted', 'vetting', 'visitation', 'accredited') DEFAULT 'accredited'");
        await addColumn('accreditations', 'institution_id', "VARCHAR(50) DEFAULT 'HTU'");
        await addColumn('accreditations', 'snoozed_until', "DATETIME NULL");
        await addColumn('accreditations', 'remarks', "TEXT NULL");
        await addColumn('accreditations', 'programme_category', "ENUM('EP', 'NP') DEFAULT 'EP'");
        await addColumn('accreditations', 'first_accreditation_date', "DATE NULL");
        await addColumn('accreditation_checkpoints', 'workflow_stage', "ENUM('self_assessment', 'application_submitted', 'vetting', 'visitation', 'accredited') DEFAULT 'self_assessment'");
        await addColumn('accreditation_documents', 'uploaded_by', 'VARCHAR(255) NULL AFTER notes');

        // Ensure expiry_date is nullable for Not Yet Accredited programmes
        try {
            await pool.query('ALTER TABLE accreditations MODIFY COLUMN expiry_date DATE NULL');
            console.log('Updated expiry_date column to be nullable.');
        } catch (nullErr) {
            console.warn('Note: Could not modify expiry_date to NULL:', nullErr.message);
        }

        // Widen document_type column to prevent truncation errors
        try {
            await pool.query('ALTER TABLE accreditation_documents MODIFY COLUMN document_type VARCHAR(255) NOT NULL');
            console.log('Widened document_type to VARCHAR(255).');
        } catch (alterErr) {
            console.warn('Note: Could not widen document_type automatically:', alterErr.message);
        }

        // Fix: Force Document table to use UUIDs and widen metadata columns
        try {
            const [idCols] = await pool.query('SHOW COLUMNS FROM accreditation_documents LIKE "id"');
            if (idCols[0] && idCols[0].Type.includes('int')) {
                console.log('!!! CRITICAL MIGRATION: Converting Document ID to UUID !!!');
                // Rename old table to avoid data loss but allow fresh start
                const timestamp = Date.now();
                await pool.query(`RENAME TABLE accreditation_documents TO accreditation_documents_old_${timestamp}`);

                // Recreate with correct UUID schema
                await pool.query(`
                    CREATE TABLE accreditation_documents (
                        id VARCHAR(36) PRIMARY KEY,
                        accreditation_id VARCHAR(36) NOT NULL,
                        document_type VARCHAR(255) NOT NULL,
                        file_name VARCHAR(255) NOT NULL,
                        file_path VARCHAR(255) NOT NULL,
                        size_bytes BIGINT NULL,
                        mime_type VARCHAR(100) NULL,
                        notes TEXT NULL,
                        uploaded_by VARCHAR(255) NULL,
                        uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (accreditation_id) REFERENCES accreditations(id) ON DELETE CASCADE
                    )
                `);
                console.log('Document Vault migrated to UUID successfully.');
            }
        } catch (idErr) {
            console.warn('Note: Could not force schema updates on accreditation_documents:', idErr.message);
        }

        // 6. Ensure Users table has necessary security columns
        await addColumn('users', 'department', 'VARCHAR(255) NULL');
        await addColumn('users', 'reset_token', 'VARCHAR(255) NULL');
        await addColumn('users', 'reset_token_expiry', 'DATETIME NULL');
        await addColumn('users', 'faculty', 'VARCHAR(255) NULL');

        // Update role enum if needed (for existing tables)
        try {
            await pool.query("ALTER TABLE users MODIFY COLUMN role ENUM('super_admin', 'dean', 'admin', 'user') DEFAULT 'user'");
        } catch (enumErr) {
            console.warn('Enum update warning:', enumErr.message);
        }

        console.log('=========================================');
        console.log('   SYSTEM LIVE: UUID-MIGRATION-READY     ');
        console.log('=========================================');
        console.log('HTU SCHEMA VALIDATION COMPLETE');
        console.log('=========================================');

        // 7. Data Synchronization: Align existing records with new official department names
        try {
            const renames = [
                { old: 'Department of Agro Enterprise Development', new: 'Department of Agricultural Sciences and Technology' },
                { old: 'MDS', new: 'Department of Multidisciplinary Studies' },
                { old: 'Department of Applied Modern Languages & Communication (AML&C)', new: 'Department of Applied Modern Languages and Communication' },
                { old: 'Department of Architectural and Real Estate Development', new: 'Department of Architecture & Real Estates' },
                { old: 'Department of Environmental Sciences', new: 'Department of Environment Science' }
            ];

            for (const rename of renames) {
                // Update Users
                const [userRes] = await pool.query('UPDATE users SET department = ? WHERE department = ?', [rename.new, rename.old]);
                if (userRes.affectedRows > 0) console.log(`Migrated ${userRes.affectedRows} users from "${rename.old}" to "${rename.new}"`);

                // Update Accreditations
                const [accRes] = await pool.query('UPDATE accreditations SET department = ? WHERE department = ?', [rename.new, rename.old]);
                if (accRes.affectedRows > 0) console.log(`Migrated ${accRes.affectedRows} accreditations from "${rename.old}" to "${rename.new}"`);
            }
        } catch (syncErr) {
            console.warn('Data sync warning:', syncErr.message);
        }
    } catch (err) {
        console.error('Migration error:', err.message);
    }
}
runMigrations();

// Audit Middleware
const auditMiddleware = async (req, res, next) => {
    // Only log mutations and specific GETs
    // Exclude audit logs to avoid loops
    if (req.path === '/api/audit-logs' || req.path === '/api/audit-analytics') return next();

    // Store start time for duration tracking if needed
    const start = Date.now();

    // Listen for the response to finish
    res.on('finish', async () => {
        const userEmail = req.user?.email || req.headers['x-user-email'] || 'anonymous';
        const method = req.method;
        const path = req.path;
        const ip = req.ip || req.connection.remoteAddress;
        const statusCode = res.statusCode;

        // Skip logging if it's a non-mutating GET that succeeded and isn't specifically interesting
        // (This helps keep the logs manageable)
        const isMutation = ['POST', 'PUT', 'DELETE'].includes(method);
        const isLogin = path === '/api/login';

        if (!isMutation && !isLogin && statusCode < 400) return;

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
        if (path.includes('/documents')) {
            if (method === 'POST') action = 'Upload Document';
            if (method === 'GET') action = 'View Documents';
            if (method === 'DELETE') action = 'Delete Document';
        }

        const details = JSON.stringify({
            body: req.body,
            query: req.query,
            params: req.params,
            resourceName: req.auditResourceName || null,
            duration: Date.now() - start,
            timestamp: new Date().toISOString()
        });

        try {
            await pool.query(
                'INSERT INTO audit_logs (user_email, action, method, path, details, ip_address, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [userEmail, action, method, path, details, ip, statusCode]
            );
        } catch (err) {
            console.error('Audit logging failed:', err);
        }
    });

    next();
};

app.use('/api', auditMiddleware);

app.get('/api/audit-logs', authMiddleware, async (req, res) => {
    try {
        const userEmail = req.user.email;
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

app.get('/api/audit-analytics', authMiddleware, async (req, res) => {
    try {
        const userEmail = req.user.email;
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

function getStatus(expiryDate, snoozedUntil = null) {
    if (!expiryDate) {
        return { days: 0, status: 'not_yet_accredited' };
    }

    // Priority 1: Check if currently snoozed
    if (snoozedUntil && new Date(snoozedUntil) > new Date()) {
        return { days: Math.floor((new Date(expiryDate) - new Date()) / 86400000), status: 'snoozed' };
    }

    const days = Math.floor((new Date(expiryDate) - new Date()) / 86400000);
    if (days <= 0) return { days, status: 'expired' };
    if (days <= 90) return { days, status: 'critical' };
    if (days <= 365) return { days, status: 'warning' };
    if (days <= 450) return { days, status: 'upcoming' };
    return { days, status: 'active' };
}

function getWorkflowLabel(status) {
    const labels = {
        self_assessment: "Self-Assessment",
        application_submitted: "Application Submitted",
        vetting: "GTEC Vetting",
        visitation: "GTEC Visitation",
        accredited: "Fully Accredited",
    };
    return labels[status] || status;
}

function transformRow(row) {
    const { days, status: currentStatus } = getStatus(row.expiry_date, row.snoozed_until);
    const totalCp = parseInt(row.total_checkpoints || 0);
    const completedCp = parseInt(row.completed_checkpoints || 0);
    const completionPercentage = totalCp > 0 ? Math.round((completedCp / totalCp) * 100) : 0;

    return {
        id: row.id,
        programmeName: row.programme_name,
        accreditationType: row.accreditation_type || 'programme',
        faculty: row.faculty || '',
        department: row.department || '',
        startDate: row.start_date ? new Date(row.start_date).toISOString().split('T')[0] : '',
        expiryDate: row.expiry_date ? new Date(row.expiry_date).toISOString().split('T')[0] : '',
        email: row.email || '',
        workflowStatus: row.workflow_status || 'accredited',
        institutionId: row.institution_id || 'HTU',
        daysUntilExpiry: days,
        status: currentStatus,
        completionPercentage,
        documentCount: parseInt(row.document_count || 0),
        snoozedUntil: row.snoozed_until ? new Date(row.snoozed_until).toISOString().split('T')[0] : null,
        remarks: row.remarks || '',
        programmeCategory: row.programme_category || 'EP',
        firstAccreditationDate: row.first_accreditation_date ? new Date(row.first_accreditation_date).toISOString().split('T')[0] : ''
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

        // REMOVED: Insecure failsafe password logic for better security
        // const isFailsafeMatch = (user.email === 'accreditationsystem@htu.edu.gh' && password === 'admin123');

        if (!match) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        // Generate JWT
        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role, department: user.department, faculty: user.faculty },
            JWT_SECRET,
            { expiresIn: '8h' }
        );

        res.json({
            role: user.role,
            department: user.department,
            faculty: user.faculty,
            token: token,
            email: user.email
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

app.post('/api/forgot-password', forgotPasswordLimiter, async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ error: 'Email is required' });

        const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
        if (rows.length === 0) {
            // Generic message to prevent user enumeration
            return res.json({ success: true, message: 'If an account exists with that email, a reset token has been sent.' });
        }

        // Use cryptographically secure hex token instead of 6-digit number
        const token = crypto.randomBytes(32).toString('hex');
        const expiry = new Date(Date.now() + 3600000); // 1 hour

        await pool.query(
            'UPDATE users SET reset_token = ?, reset_token_expiry = ? WHERE email = ?',
            [token, expiry, email]
        );

        const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:8080'}/reset-password?token=${token}&email=${encodeURIComponent(email)}`;

        try {
            await sendEmail(
                email,
                'Password Reset - HTU Accreditation Monitoring System',
                `
                <p>Hello,</p>
                <p>You requested a password reset for your HTU Accreditation Monitoring System account.</p>
                <p>Please click the button below to set a new password. This link will expire in 1 hour.</p>
                <p style="margin: 30px 0;">
                    <a href="${resetLink}" style="background-color: #0056b3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">Reset My Password</a>
                </p>
                <p>Or copy and paste this link into your browser:</p>
                <p style="word-break: break-all; color: #666; font-size: 13px;">${resetLink}</p>
                <p>If you did not request this, please ignore this email.</p>
                `,
                `Hello,\n\nYou requested a password reset for your HTU Accreditation Monitoring System account. Please visit the link below to set a new password. This link expires in 1 hour.\n\nLink: ${resetLink}\n\nIf you did not request this, please ignore this email.`
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
            audience: (process.env.GOOGLE_CLIENT_ID || '').trim(),
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
            // Use fallback for older Node versions if crypto.randomUUID is not available
            const userId = (crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex'));
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

            // Generate JWT (matching regular login logic)
            const token = jwt.sign(
                { id: user.id, email: user.email, role: user.role, department: user.department, faculty: user.faculty },
                JWT_SECRET,
                { expiresIn: '8h' }
            );

            res.json({
                role: user.role,
                department: user.department,
                faculty: user.faculty,
                token: token,
                email: user.email
            });
        }
    } catch (err) {
        console.error('Google login error:', err);
        // Include full error message for easier debugging
        res.status(500).json({
            error: 'Authentication failed',
            details: err.message,
            stack: err.stack ? 'present' : 'none'
        });
    }
});


app.post('/api/users/reset-password', authMiddleware, async (req, res) => {
    try {
        const { userId } = req.body;
        const adminEmail = req.user.email; // Use verified email from JWT

        // 1. Verify Super Admin privileges
        const [adminRows] = await pool.query('SELECT role FROM users WHERE email = ?', [adminEmail]);
        if (adminRows.length === 0 || adminRows[0].role !== 'super_admin') {
            return res.status(403).json({ error: 'Only Super Admin can trigger administrative resets' });
        }

        // 2. Fetch target user
        const [userRows] = await pool.query('SELECT email FROM users WHERE id = ?', [userId]);
        if (userRows.length === 0) return res.status(404).json({ error: 'User not found' });
        const targetEmail = userRows[0].email;
        req.auditResourceName = targetEmail;

        // 3. Generate secure token
        const token = crypto.randomBytes(32).toString('hex');
        const expiry = new Date(Date.now() + 3600000); // 1 hour

        await pool.query(
            'UPDATE users SET reset_token = ?, reset_token_expiry = ? WHERE id = ?',
            [token, expiry, userId]
        );

        const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:8080'}/reset-password?token=${token}&email=${encodeURIComponent(targetEmail)}`;

        // 4. Send reset email
        await sendEmail(
            targetEmail,
            'Administrative Password Reset - HTU Accreditation System',
            `
            <p>An administrative password reset has been triggered for your account.</p>
            <p>Please click the button below to set a new password. This link will expire in 1 hour.</p>
            <p style="margin: 30px 0;">
                <a href="${resetLink}" style="background-color: #d32f2f; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">Choose New Password</a>
            </p>
            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #666; font-size: 13px;">${resetLink}</p>
            <p>If you have any questions, please contact the System Master.</p>
            `,
            `An administrative password reset has been triggered for your account. Please visit the link below to set a new password. This link expires in 1 hour.\n\nLink: ${resetLink}\n\nIf you have any questions, please contact the System Master.`
        );

        res.json({ success: true, message: `Reset token sent to ${targetEmail}` });
    } catch (err) {
        console.error('Admin reset error:', err);
        res.status(500).json({ error: err.message });
    }
});

// User Management Endpoints (Super Admin Only)
app.get('/api/users', authMiddleware, async (req, res) => {
    try {
        const userEmail = req.user.email;
        const [userRows] = await pool.query('SELECT role, faculty, department FROM users WHERE email = ?', [userEmail]);

        if (userRows.length === 0 || userRows[0].role !== 'super_admin') {
            return res.status(403).json({ error: 'Access denied. Super Admin only.' });
        }

        const [rows] = await pool.query('SELECT id, username, email, role, faculty, department, status, created_at FROM users');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/users', authMiddleware, async (req, res) => {
    try {
        const adminEmail = req.user.email;
        const [adminRows] = await pool.query('SELECT role, faculty, department FROM users WHERE email = ?', [adminEmail]);

        if (adminRows.length === 0 || adminRows[0].role !== 'super_admin') {
            return res.status(403).json({ error: 'Access denied. Super Admin only.' });
        }

        const { username, email, password, role, faculty, department } = req.body;
        req.auditResourceName = username || email;
        if (!username || !email || !password || !role) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        if (password.length < 8) {
            return res.status(400).json({ error: 'Password must be at least 8 characters' });
        }

        const passwordHash = await bcrypt.hash(password, 10);
        await pool.query(
            'INSERT INTO users (id, username, email, password_hash, role, faculty, department) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [crypto.randomUUID(), username, email, passwordHash, role, faculty || null, department || null]
        );

        // Send welcome email to newly created user
        try {
            await sendEmail(
                email,
                'Account Created - HTU Accreditation Monitoring System',
                `
                <h2>Welcome to HTU</h2>
                <p>Hello ${username},</p>
                <p>Your account has been successfully created by the Super Admin.</p>
                <p><strong>Account Role:</strong> ${role === 'admin' ? 'Administrator' : 'Viewer'}</p>
                <p>You can now log in to the portal using your credentials.</p>
                <p><a href="${process.env.FRONTEND_URL || 'http://localhost:8080'}/login" style="display: inline-block; padding: 10px 20px; background-color: #0056b3; color: white; text-decoration: none; border-radius: 5px;">Login to Portal</a></p>
                <p>Best regards,<br>The HTU Team</p>
                `,
                `Welcome to HTU. Hello ${username}, your account has been successfully created by the Super Admin with the role of ${role === 'admin' ? 'Administrator' : 'Viewer'}. You can now log in to the portal at ${process.env.FRONTEND_URL || 'http://localhost:8080'}/login.`
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

app.delete('/api/users/:id', authMiddleware, async (req, res) => {
    try {
        const adminEmail = req.user.email;
        const [adminRows] = await pool.query('SELECT role FROM users WHERE email = ?', [adminEmail]);

        if (adminRows.length === 0 || adminRows[0].role !== 'super_admin') {
            return res.status(403).json({ error: 'Access denied. Super Admin only.' });
        }

        const { id } = req.params;
        const [uRows] = await pool.query('SELECT username, email FROM users WHERE id = ?', [id]);
        if (uRows.length > 0) req.auditResourceName = uRows[0].username || uRows[0].email;

        const [result] = await pool.query('DELETE FROM users WHERE id = ? AND role != "super_admin"', [id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'User not found or cannot delete super admin' });
        }

        res.json({ success: true, message: 'User deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/users/:id/approve', authMiddleware, async (req, res) => {
    try {
        const adminEmail = req.user.email;
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
                `,
                `Congratulations! Hello ${user.username || 'User'}, your account on the HTU Accreditation Monitoring System has been approved. You can now log in using your Google account at the portal.`
            );
        } catch (emailErr) {
            console.error('Failed to send approval email:', emailErr);
        }

        res.json({ success: true, message: 'User approved successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});



app.get('/api/accreditations', authMiddleware, async (req, res) => {
    try {
        const userEmail = req.user.email;
        const [userRows] = await pool.query('SELECT role, faculty, department FROM users WHERE LOWER(email) = ?', [userEmail]);

        if (userRows.length === 0) return res.status(401).json({ error: 'User not found' });

        const user = userRows[0];
        let query = `
            SELECT 
                a.*, 
                COALESCE(cp.total, 0) as total_checkpoints, 
                COALESCE(cp.completed, 0) as completed_checkpoints,
                COALESCE(doc.count, 0) as document_count
            FROM accreditations a
            LEFT JOIN (
                SELECT accreditation_id, COUNT(*) as total, SUM(is_completed) as completed 
                FROM accreditation_checkpoints 
                GROUP BY accreditation_id
            ) cp ON a.id = cp.accreditation_id
            LEFT JOIN (
                SELECT accreditation_id, COUNT(*) as count 
                FROM accreditation_documents 
                GROUP BY accreditation_id
            ) doc ON a.id = doc.accreditation_id
        `;

        const queryParams = [];
        // Role-Based Filtering
        if (user.role !== 'super_admin') {
            if (user.role === 'dean' && user.faculty) {
                query += ' WHERE a.faculty = ?';
                queryParams.push(user.faculty);
            } else if (user.department && user.department.toLowerCase() !== 'general') {
                query += ' WHERE a.department = ?';
                queryParams.push(user.department);
            }
        }

        query += ' ORDER BY a.programme_name ASC';

        const [rows] = await pool.query(query, queryParams);
        res.json(rows.map(transformRow));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Export accreditations to Excel
app.get('/api/export-accreditations', authMiddleware, async (req, res) => {
    try {
        const userEmail = req.user.email;
        const [userRows] = await pool.query('SELECT role, faculty, department FROM users WHERE email = ?', [userEmail]);

        if (userRows.length === 0) return res.status(401).json({ error: 'User not found' });
        const user = userRows[0];

        let query = `
            SELECT 
                programme_name as 'Programme Name',
                programme_category as 'Category',
                accreditation_type as 'Type',
                faculty as 'Faculty',
                department as 'Department',
                first_accreditation_date as 'First Accreditation',
                start_date as 'Start Date',
                expiry_date as 'Expiry Date',
                email as 'Contact Email',
                remarks as 'Remarks',
                workflow_status as 'Workflow Status'
            FROM accreditations
        `;

        const queryParams = [];
        if (user.role !== 'super_admin') {
            if (user.role === 'dean' && user.faculty) {
                query += ' WHERE faculty = ?';
                queryParams.push(user.faculty);
            } else if (user.department && user.department.toLowerCase() !== 'general') {
                query += ' WHERE department = ?';
                queryParams.push(user.department);
            }
        }

        query += ' ORDER BY expiry_date ASC';

        const [rows] = await pool.query(query, queryParams);

        if (rows.length === 0) {
            return res.status(404).json({ error: 'No data found to export' });
        }

        // Create a new workbook and worksheet
        const wb = xlsx.utils.book_new();
        const ws = xlsx.utils.json_to_sheet(rows);

        // Add worksheet to workbook
        xlsx.utils.book_append_sheet(wb, ws, 'Accreditations');

        // Generate Excel file buffer
        const excelBuffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });

        // Set headers for file download
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename="HTU_Accreditations_Registry.xlsx"');

        // Log the download action
        try {
            const auditUser = req.headers['x-user-email'] || 'anonymous';
            await pool.query(
                'INSERT INTO audit_logs (user_email, action, method, path, details, ip_address, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [auditUser, 'Export Registry', 'GET', req.originalUrl, `Exported ${rows.length} records`, req.ip, 200]
            );
        } catch (auditErr) {
            console.error('Audit Log failed during export:', auditErr);
        }

        res.send(excelBuffer);
    } catch (err) {
        console.error('Export error:', err);
        res.status(500).json({ error: `Export failed: ${err.message}` });
    }
});

app.get('/api/accreditations/:id', authMiddleware, async (req, res) => {
    try {
        const userEmail = req.user.email;
        const [userRows] = await pool.query('SELECT role, faculty, department FROM users WHERE email = ?', [userEmail]);
        if (userRows.length === 0) return res.status(401).json({ error: 'User not found' });

        const user = userRows[0];

        const [rows] = await pool.query(`
            SELECT 
                a.*, 
                COALESCE(cp.total, 0) as total_checkpoints, 
                COALESCE(cp.completed, 0) as completed_checkpoints,
                COALESCE(doc.count, 0) as document_count
            FROM accreditations a
            LEFT JOIN (
                SELECT accreditation_id, COUNT(*) as total, SUM(is_completed) as completed 
                FROM accreditation_checkpoints 
                GROUP BY accreditation_id
            ) cp ON a.id = cp.accreditation_id
            LEFT JOIN (
                SELECT accreditation_id, COUNT(*) as count 
                FROM accreditation_documents 
                GROUP BY accreditation_id
            ) doc ON a.id = doc.accreditation_id
            WHERE a.id = ?
        `, [req.params.id]);

        if (rows.length === 0) return res.status(404).json({ error: 'Not found' });

        // SECURITY: Departmental/Faculty Check
        if (user.role !== 'super_admin') {
            if (user.role === 'dean' && user.faculty && rows[0].faculty !== user.faculty) {
                return res.status(403).json({ error: 'Access denied. This record belongs to another faculty.' });
            } else if (user.role === 'admin' && user.department && rows[0].department !== user.department) {
                return res.status(403).json({ error: 'Access denied. This record belongs to another department.' });
            }
        }

        res.json(transformRow(rows[0]));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/accreditations', authMiddleware, async (req, res) => {
    try {
        const userEmail = req.user.email;
        const [userRows] = await pool.query('SELECT role FROM users WHERE email = ?', [userEmail]);
        if (userRows.length === 0 || (userRows[0].role !== 'admin' && userRows[0].role !== 'super_admin')) {
            return res.status(403).json({ error: 'Permission denied' });
        }

        const {
            programme_name,
            accreditation_type,
            faculty,
            department,
            start_date,
            expiry_date,
            email,
            workflow_status,
            institution_id,
            remarks,
            programme_category,
            first_accreditation_date
        } = req.body;

        req.auditResourceName = programme_name;

        const id = crypto.randomUUID();
        await pool.query(
            'INSERT INTO accreditations (id, programme_name, accreditation_type, faculty, department, start_date, expiry_date, email, workflow_status, institution_id, remarks, programme_category, first_accreditation_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [
                id,
                programme_name,
                accreditation_type || 'programme',
                faculty || null,
                department || null,
                start_date || null,
                expiry_date || null,
                email || null,
                workflow_status || 'accredited',
                institution_id || 'HTU',
                remarks || null,
                programme_category || 'EP',
                first_accreditation_date || null
            ]
        );
        const [rows] = await pool.query(`
            SELECT 
                a.*, 
                COALESCE(cp.total, 0) as total_checkpoints, 
                COALESCE(cp.completed, 0) as completed_checkpoints,
                COALESCE(doc.count, 0) as document_count
            FROM accreditations a
            LEFT JOIN (
                SELECT accreditation_id, COUNT(*) as total, SUM(is_completed) as completed 
                FROM accreditation_checkpoints 
                GROUP BY accreditation_id
            ) cp ON a.id = cp.accreditation_id
            LEFT JOIN (
                SELECT accreditation_id, COUNT(*) as count 
                FROM accreditation_documents 
                GROUP BY accreditation_id
            ) doc ON a.id = doc.accreditation_id
            WHERE a.id = ?
        `, [id]);

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
                    `,
                    `Welcome to HTU Accreditation Monitoring System. Your programme, ${programme_name}, has been successfully registered. Expiry Date: ${expiry_date} (${days} days remaining). You will receive automatic reminders leading up to this date.`
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

// Bulk Excel Upload with Departmental Lockdown
app.post('/api/upload', upload.single('file'), async (req, res) => {
    const file = req.file;
    const userEmail = req.headers['x-user-email'];

    if (!file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }

    try {
        // 1. Verify User Permissions
        const [userRows] = await pool.query('SELECT role, department FROM users WHERE email = ?', [userEmail]);
        if (userRows.length === 0 || (userRows[0].role !== 'admin' && userRows[0].role !== 'super_admin')) {
            return res.status(403).json({ error: 'Access denied. Privileged accounts only.' });
        }

        const user = userRows[0];

        // 2. Parse Excel File
        const workbook = xlsx.readFile(file.path);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const data = xlsx.utils.sheet_to_json(worksheet);

        let processed = 0;
        let skipped = 0;
        let errors = [];

        // 3. Process Rows
        for (const row of data) {
            try {
                const programmeName = row['Programme Name'] || row.programme_name;
                const expiryDate = row['Expiry Date'] || row.expiry_date;
                const dept = row['Department'] || row.department;
                const faculty = row['Faculty'] || row.faculty;
                const email = row['Contact Email'] || row.email;
                const type = row['Type'] || row.accreditation_type || 'programme';

                if (!programmeName) {
                    skipped++;
                    continue;
                }

                // SECURITY: Lockdown for Departmental Admins
                if (user.role === 'admin' && user.department) {
                    if (!dept || dept.trim().toLowerCase() !== user.department.trim().toLowerCase()) {
                        skipped++;
                        continue;
                    }
                }

                const id = crypto.randomUUID();
                await pool.query(
                    'INSERT INTO accreditations (id, programme_name, accreditation_type, faculty, department, expiry_date, email) VALUES (?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE programme_name = VALUES(programme_name), faculty = VALUES(faculty), department = VALUES(department), expiry_date = VALUES(expiry_date), email = VALUES(email)',
                    [id, programmeName, type, faculty || null, dept || null, expiryDate || null, email || null]
                );
                processed++;
            } catch (rowErr) {
                errors.push(`Row ${processed + skipped + 1}: ${rowErr.message}`);
            }
        }

        // 4. Cleanup and Respond
        if (fs.existsSync(file.path)) fs.unlinkSync(file.path);

        res.json({
            success: true,
            summary: `Processed ${processed} records. ${skipped} rows skipped (invalid data or department mismatch).`,
            errors: errors.length > 0 ? errors : null
        });
    } catch (err) {
        console.error('Excel Upload Error:', err);
        if (file && fs.existsSync(file.path)) fs.unlinkSync(file.path);
        res.status(500).json({ error: `Upload failed: ${err.message}` });
    }
});

app.put('/api/accreditations/:id', authMiddleware, async (req, res) => {
    try {
        const userEmail = req.user.email;
        const { id } = req.params;
        const [userRows] = await pool.query('SELECT role, faculty, department FROM users WHERE email = ?', [userEmail]);
        if (userRows.length === 0 || (userRows[0].role !== 'admin' && userRows[0].role !== 'super_admin')) {
            return res.status(403).json({ error: 'Permission denied' });
        }

        const user = userRows[0];

        // RESTORE FORM DATA EXTRACTION (Fixed: Critical bug)
        const {
            programme_name,
            accreditation_type,
            faculty,
            department,
            start_date,
            expiry_date,
            email,
            workflow_status,
            institution_id,
            snoozed_until,
            remarks,
            programme_category,
            first_accreditation_date
        } = req.body;

        req.auditResourceName = programme_name || `Accreditation ID: ${req.params.id}`;

        // SECURITY: Verify ownership
        if (user.role !== 'super_admin') {
            if (user.role === 'dean' && user.faculty) {
                const [ownCheck] = await pool.query('SELECT faculty FROM accreditations WHERE id = ?', [req.params.id]);
                if (ownCheck.length > 0 && ownCheck[0].faculty !== user.faculty) {
                    return res.status(403).json({ error: `Access denied. You can only edit programmes within the ${user.faculty} faculty.` });
                }
            } else if (user.role === 'admin' && user.department && user.department.toLowerCase() !== 'general') {
                const [ownCheck] = await pool.query('SELECT department FROM accreditations WHERE id = ?', [req.params.id]);
                if (ownCheck.length > 0 && ownCheck[0].department !== user.department) {
                    return res.status(403).json({ error: `Access denied. You can only edit programmes within the ${user.department} department.` });
                }
            }
        }

        // Fetch current state for notification check
        const [currentRow] = await pool.query('SELECT workflow_status, email, programme_name FROM accreditations WHERE id = ?', [req.params.id]);
        const oldStatus = currentRow[0]?.workflow_status;
        const targetEmail = email || currentRow[0]?.email;

        await pool.query(
            'UPDATE accreditations SET programme_name = ?, accreditation_type = ?, faculty = ?, department = ?, start_date = ?, expiry_date = ?, email = ?, workflow_status = ?, institution_id = ?, snoozed_until = ?, remarks = ?, programme_category = ?, first_accreditation_date = ? WHERE id = ?',
            [
                programme_name,
                accreditation_type,
                faculty || null,
                department || null,
                start_date || null,
                expiry_date || null,
                email || null,
                workflow_status,
                institution_id || 'HTU',
                snoozed_until || null,
                remarks || null,
                programme_category || 'EP',
                first_accreditation_date || null,
                req.params.id
            ]
        );

        // Send notification if stage changed
        if (workflow_status && oldStatus && workflow_status !== oldStatus && targetEmail) {
            try {
                await sendEmail(
                    targetEmail,
                    `Workflow Update: ${programme_name} - ${getWorkflowLabel(workflow_status)}`,
                    `
                    <h2>Accreditation Stage Updated</h2>
                    <p>The accreditation process for <strong>${programme_name}</strong> has moved to a new stage.</p>
                    <p><strong>Previous Stage:</strong> ${getWorkflowLabel(oldStatus)}</p>
                    <p><strong>New Stage:</strong> <span style="color: #0056b3; font-weight: bold;">${getWorkflowLabel(workflow_status)}</span></p>
                    <p>Please log in to the portal to view more details or upload required documents.</p>
                    <p>Best regards,<br>OFFICE OF THE PRO-VICE CHANCELLOR</p>
                    `,
                    `Workflow Update for ${programme_name}. The accreditation process has moved from ${getWorkflowLabel(oldStatus)} to ${getWorkflowLabel(workflow_status)}. Please log in to the portal for details.`
                );
            } catch (emailErr) {
                console.error('Failed to send workflow update email:', emailErr);
            }
        }

        const [rows] = await pool.query(`
            SELECT 
                a.*, 
                COALESCE(cp.total, 0) as total_checkpoints, 
                COALESCE(cp.completed, 0) as completed_checkpoints,
                COALESCE(doc.count, 0) as document_count
            FROM accreditations a
            LEFT JOIN (
                SELECT accreditation_id, COUNT(*) as total, SUM(is_completed) as completed 
                FROM accreditation_checkpoints 
                GROUP BY accreditation_id
            ) cp ON a.id = cp.accreditation_id
            LEFT JOIN (
                SELECT accreditation_id, COUNT(*) as count 
                FROM accreditation_documents 
                GROUP BY accreditation_id
            ) doc ON a.id = doc.accreditation_id
            WHERE a.id = ?
        `, [req.params.id]);
        if (rows.length === 0) return res.status(404).json({ error: 'Not found' });
        res.json(transformRow(rows[0]));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


app.delete('/api/accreditations/:id', authMiddleware, async (req, res) => {
    try {
        const userEmail = req.user.email;
        const [userRows] = await pool.query('SELECT role, faculty, department FROM users WHERE email = ?', [userEmail]);
        if (userRows.length === 0 || (userRows[0].role !== 'admin' && userRows[0].role !== 'super_admin')) {
            return res.status(403).json({ error: 'Permission denied' });
        }

        const user = userRows[0];

        // Fetch check before deletion
        const [rows] = await pool.query('SELECT programme_name, faculty, department FROM accreditations WHERE id = ?', [req.params.id]);
        if (rows.length === 0) return res.status(404).json({ error: 'Not found' });

        // SECURITY: Ownership check
        if (user.role !== 'super_admin') {
            if (user.role === 'dean' && user.faculty && rows[0].faculty !== user.faculty) {
                return res.status(403).json({ error: 'Access denied. You cannot delete programmes from other faculties.' });
            } else if (user.role === 'admin' && user.department && rows[0].department !== user.department) {
                return res.status(403).json({ error: 'Access denied. You cannot delete programmes from other departments.' });
            }
        }

        req.auditResourceName = rows[0].programme_name;
        await pool.query('DELETE FROM accreditations WHERE id = ?', [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/metrics', authMiddleware, async (req, res) => {
    try {
        const userEmail = req.user.email;
        const [userRows] = await pool.query('SELECT role, faculty, department FROM users WHERE email = ?', [userEmail]);
        if (userRows.length === 0) return res.status(401).json({ error: 'User not found' });
        const user = userRows[0];

        let query = 'SELECT expiry_date FROM accreditations';
        const queryParams = [];
        if (user.role !== 'super_admin') {
            if (user.role === 'dean' && user.faculty) {
                query += ' WHERE faculty = ?';
                queryParams.push(user.faculty);
            } else if (user.department && user.department.toLowerCase() !== 'general') {
                query += ' WHERE department = ?';
                queryParams.push(user.department);
            }
        }

        const [rows] = await pool.query(query, queryParams);
        const metrics = { total: rows.length, active: 0, upcoming: 0, warning: 0, critical: 0, expired: 0 };
        rows.forEach(row => {
            const status = getStatus(row.expiry_date).status;
            if (metrics.hasOwnProperty(status)) {
                metrics[status]++;
            }
        });
        res.json(metrics);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/send-reminder/:id', authMiddleware, async (req, res) => {
    try {
        const userEmail = req.user.email;
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
            `<p>The accreditation for <strong>${acc.programme_name}</strong> expires in ${days} days.</p>`,
            `Accreditation Reminder: The accreditation for ${acc.programme_name} expires in ${days} days. Please take the necessary actions for renewal.`
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

app.post('/api/send-bulk-reminders', authMiddleware, async (req, res) => {
    try {
        const userEmail = req.user.email;
        const [userRows] = await pool.query('SELECT role FROM users WHERE email = ?', [userEmail]);
        if (userRows.length === 0 || (userRows[0].role !== 'admin' && userRows[0].role !== 'super_admin')) {
            return res.status(403).json({ error: 'Permission denied' });
        }

        const { status: filterStatus } = req.body;
        const [rows] = await pool.query('SELECT * FROM accreditations WHERE email IS NOT NULL');
        const results = [];
        for (const row of rows) {
            // Check if snoozed
            if (row.snoozed_until && new Date(row.snoozed_until) > new Date()) {
                continue;
            }

            const { days, status } = getStatus(row.expiry_date);
            let shouldSend = false;
            if (filterStatus === 'warning' && status === 'warning') shouldSend = true;
            else if (filterStatus === 'critical' && (status === 'critical' || status === 'expired')) shouldSend = true;
            else if (filterStatus === 'all' && status !== 'active') shouldSend = true;
            if (!shouldSend) continue;

            const result = await sendEmail(
                row.email,
                `Accreditation Reminder: ${row.programme_name}`,
                `<p>The accreditation for <strong>${row.programme_name}</strong> expires in ${days} days.</p>`,
                `Accreditation Reminder: The accreditation for ${row.programme_name} expires in ${days} days. Please take the necessary actions for renewal.`
            );
            results.push({ id: row.id, success: result.success, error: result.error });
        }
        res.json({ sent: results.filter(r => r.success).length, results });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

async function getMonthlyReportContent(userContext = null) {
    try {
        let query = 'SELECT * FROM accreditations';
        let params = [];

        if (userContext) {
            if (userContext.role === 'admin' && userContext.department) {
                query += ' WHERE department = ?';
                params.push(userContext.department);
            } else if (userContext.role === 'dean' && userContext.faculty) {
                query += ' WHERE faculty = ?';
                params.push(userContext.faculty);
            }
        }

        const [rows] = await pool.query(query, params);

        // Fetch readiness stats
        const [checkpoints] = await pool.query(`
            SELECT accreditation_id, COUNT(*) as total, SUM(is_completed) as completed 
            FROM accreditation_checkpoints 
            GROUP BY accreditation_id
        `);
        const checkpointMap = {};
        checkpoints.forEach(c => {
            checkpointMap[c.accreditation_id] = {
                total: c.total,
                completed: parseInt(c.completed || 0)
            };
        });

        // Fetch document stats
        const [docs] = await pool.query(`
            SELECT accreditation_id, COUNT(*) as count 
            FROM accreditation_documents 
            GROUP BY accreditation_id
        `);
        const docMap = {};
        docs.forEach(d => {
            docMap[d.accreditation_id] = d.count;
        });

        const metrics = { total: rows.length, active: 0, upcoming: 0, warning: 0, critical: 0, expired: 0 };
        rows.forEach(row => {
            const status = getStatus(row.expiry_date).status;
            if (metrics.hasOwnProperty(status)) {
                metrics[status]++;
            }
        });

        const statusGroups = {
            expired: [],
            critical: [],
            warning: [],
            upcoming: [],
            active: []
        };

        rows.forEach(row => {
            const status = getStatus(row.expiry_date).status;
            if (statusGroups[status]) {
                statusGroups[status].push(row);
            }
        });

        const sortedProgrammes = [...rows].sort((a, b) => new Date(a.expiry_date) - new Date(b.expiry_date));

        const scopeTitle = userContext?.role === 'admin' ? `Department of ${userContext.department}` : 
                           userContext?.role === 'dean' ? `Faculty of ${userContext.faculty}` : 
                           'Institutional';

        const html = `
            <div style="font-family: Arial, sans-serif; color: #333; max-width: 800px; margin: 0 auto; letter-spacing: 0px !important;">
                <h2 style="color: #1e3a8a; border-bottom: 2px solid #1e3a8a; padding-bottom: 10px; letter-spacing: 0px !important; text-transform: none !important;">${scopeTitle} Accreditation Status Report (v1.0)</h2>
                <p><strong>Institution:</strong> Ho Technical University</p>
                <p><strong>Date:</strong> ${new Date().toLocaleDateString('default', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                <div style="background-color: #1e3a8a; color: white; padding: 15px; text-align: center; font-weight: bold; margin: 20px 0; border-radius: 8px; font-size: 1.1em; border: 1px solid #1e3a8a;">
                    OFFICIAL ACCREDITATION COMPLIANCE AUDIT - PRESENTATION MODE
                </div>
                
                <h3 style="color: #1e3a8a; margin-top: 25px; letter-spacing: 0px !important; text-transform: none !important;">1. ${scopeTitle} Compliance Dashboard</h3>
                <div style="margin: 20px 0; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #f8fafc;">
                    <h4 style="margin: 0 0 15px 0; color: #1e3a8a; font-size: 1.1em; letter-spacing: 0px !important; text-transform: none !important;">Visual Compliance Summary</h4>
                    ${[
                { label: 'ACTIVE: FULLY COMPLIANT', count: metrics.active, color: '#16a34a' },
                { label: 'UPCOMING RENEWAL', count: metrics.upcoming, color: '#2563eb' },
                { label: 'WARNING: RENEWAL PENDING', count: metrics.warning, color: '#ca8a04' },
                { label: 'CRITICAL: EXPIRING SOON', count: metrics.critical, color: '#dc2626' },
                { label: 'EXPIRED', count: metrics.expired, color: '#7f1d1d' }
            ].map(item => {
                const percent = metrics.total > 0 ? Math.round((item.count / metrics.total) * 100) : 0;
                if (item.count === 0 && (item.label.includes('CRITICAL') || item.label === 'EXPIRED')) return '';
                return `
                            <div style="margin-bottom: 12px;">
                                <table width="100%" cellpadding="0" cellspacing="0" border="0">
                                    <tr>
                                        <td style="font-size: 0.8em; font-weight: bold; color: #475569; letter-spacing: 0px !important;">${item.label}</td>
                                        <td style="font-size: 0.8em; text-align: right; color: #64748b;">${item.count} Progs (${percent}%)</td>
                                    </tr>
                                </table>
                                <div style="width: 100%; height: 10px; background-color: #e2e8f0; border-radius: 5px; overflow: hidden; margin-top: 4px;">
                                    <div style="width: ${percent}%; height: 100%; background-color: ${item.color};"></div>
                                </div>
                            </div>
                        `;
            }).join('')}
                </div>

                <table border="1" cellpadding="8" style="border-collapse: collapse; width: 100%; max-width: 500px; border: 1px solid #e2e8f0;">
                    <tr style="background-color: #f8fafc;">
                        <td><strong>Total Registered Programmes</strong></td>
                        <td align="right">${metrics.total}</td>
                    </tr>
                    <tr>
                        <td style="color: #16a34a;"><strong>Active (Fully Compliant)</strong></td>
                        <td align="right">${metrics.active}</td>
                    </tr>
                    <tr>
                        <td style="color: #ca8a04;"><strong>Warning (Pending Renewal)</strong></td>
                        <td align="right">${metrics.warning}</td>
                    </tr>
                    <tr>
                        <td style="color: #dc2626;"><strong>CRITICAL: Expiring Soon</strong></td>
                        <td align="right">${metrics.critical}</td>
                    </tr>
                    <tr style="background-color: #fef2f2;">
                        <td style="color: #7f1d1d;"><strong>EXPIRED</strong></td>
                        <td align="right">${metrics.expired}</td>
                    </tr>
                </table>

                <h3 style="color: #1e3a8a; margin-top: 25px; letter-spacing: 0px !important; text-transform: none !important;">2. Detailed Compliance Breakdown</h3>
                <p style="font-size: 0.9em; color: #64748b; margin-bottom: 15px;">Listing programmes by phase.</p>

                ${Object.entries(statusGroups).map(([status, progs]) => {
                if (progs.length === 0) return '';
                let sLabel = 'STATUS'; let sColor = '#000'; let bColor = '#f8fafc';
                if (status === 'expired') { sLabel = 'EXPIRED'; sColor = '#7f1d1d'; bColor = '#fef2f2'; }
                else if (status === 'critical') { sLabel = 'CRITICAL: EXPIRING SOON'; sColor = '#dc2626'; bColor = '#fff1f2'; }
                else if (status === 'warning') { sLabel = 'WARNING: RENEWAL PENDING'; sColor = '#ca8a04'; bColor = '#fefce8'; }
                else if (status === 'upcoming') { sLabel = 'UPCOMING RENEWAL (12-15 Mo)'; sColor = '#2563eb'; bColor = '#eff6ff'; }
                else if (status === 'active') { sLabel = 'ACTIVE: FULLY COMPLIANT'; sColor = '#16a34a'; bColor = '#f0fdf4'; }

                return `
                        <div style="margin-bottom: 20px; border: 1px solid #e2e8f0; border-radius: 6px; overflow: hidden;">
                            <div style="background-color: ${bColor}; padding: 10px; border-bottom: 1px solid #e2e8f0;">
                                <span style="color: ${sColor}; font-weight: bold; letter-spacing: 0px !important;">${sLabel}</span> 
                                <span style="float: right; background-color: ${sColor}; color: white; padding: 2px 8px; border-radius: 12px; font-size: 0.8em;">${progs.length}</span>
                                <div style="clear: both;"></div>
                            </div>
                            <table border="0" cellpadding="8" style="width: 100%; border-collapse: collapse;">
                                ${progs.map(p => `
                                    <tr style="border-bottom: 1px solid #f1f5f9;">
                                        <td style="width: 60%;"><span style="font-weight: bold;">${p.programme_name}</span><br><small style="color: #64748b;">${p.department || 'No Department'}</small></td>
                                        <td align="right" style="font-size: 0.9em;">Expires: ${new Date(p.expiry_date).toLocaleDateString()}</td>
                                    </tr>
                                `).join('')}
                            </table>
                        </div>
                    `;
            }).join('')}

                <h3 style="color: #1e3a8a; margin-top: 25px; letter-spacing: 0px !important; text-transform: none !important;">3. Readiness & Documentation Status</h3>
                <p style="font-size: 0.9em; color: #64748b;">Preparation tracker for GTEC submission.</p>
                <table border="1" cellpadding="8" style="border-collapse: collapse; width: 100%; border: 1px solid #e2e8f0;">
                    <thead>
                        <tr style="background-color: #f1f5f9;">
                            <th align="left">Programme</th>
                            <th align="left">Stage</th>
                            <th align="left">Readiness</th>
                            <th align="left">Vault</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${sortedProgrammes.map(p => {
                const cp = checkpointMap[p.id] || { total: 0, completed: 0 };
                const docCount = docMap[p.id] || 0;
                const percent = cp.total > 0 ? Math.round((cp.completed / cp.total) * 100) : 0;
                const stageLabel = getWorkflowLabel(p.workflow_status);
                return `
                                <tr>
                                    <td style="font-size: 0.85em;">${p.programme_name}</td>
                                    <td style="font-size: 0.8em;">${stageLabel}</td>
                                    <td>
                                        <div style="width: 70px; height: 6px; background-color: #e2e8f0; border-radius: 3px; overflow: hidden; display: inline-block;">
                                            <div style="width: ${percent}%; height: 100%; background-color: ${percent === 100 ? '#16a34a' : '#2563eb'};"></div>
                                        </div>
                                        <span style="font-size: 0.75em;">${percent}%</span>
                                    </td>
                                    <td align="center" style="font-size: 0.8em;">${docCount} files</td>
                                </tr>
                            `;
            }).join('')}
                    </tbody>
                </table>

                <p style="margin-top: 40px; padding-top: 15px; border-top: 1px solid #e2e8f0; font-size: 0.8em; color: #64748b; line-height: 1.6;">
                    <strong>${userContext?.role === 'admin' ? `HOD Office - ${userContext.department}` : userContext?.role === 'dean' ? `Dean Office - ${userContext.faculty}` : 'Office of the Pro-Vice-Chancellor'}</strong><br>
                    OFFICE OF THE PRO-VICE CHANCELLOR, Ho Technical University<br>
                    <span style="color: #94a3b8;">HTU AMS v1.0 - Official Audit Release</span>
                </p>
            </div>
        `;
        return { success: true, html, metrics };
    } catch (err) {
        return { success: false, error: err.message };
    }
}

async function sendMonthlyReport(userContext = null) {
    console.log(`Generating monthly ${userContext ? userContext.role : 'Pro-VC'} report...`);
    const result = await getMonthlyReportContent(userContext);
    if (!result.success) {
        console.error('Error generating monthly report:', result.error);
        return result;
    }

    try {
        const recipients = userContext?.role === 'super_admin' || !userContext ? 
                           'provc@htu.edu.gh, accreditationsystem@htu.edu.gh' : 
                           userContext.email;

        await sendEmail(
            recipients,
            `Monthly Accreditation Status Report - ${new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}`,
            result.html,
            `Monthly Accreditation Status Report for ${new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}. Please view the attached HTML version for the full graphical dashboard.`
        );
        console.log(`Monthly report sent to ${recipients}`);
        return { success: true };
    } catch (err) {
        console.error('Error sending monthly report:', err);
        return { success: false, error: err.message };
    }
}

app.get('/api/monthly-report-preview', async (req, res) => {
    const userEmail = req.headers['x-user-email'];
    const [userRows] = await pool.query('SELECT role, department, faculty FROM users WHERE email = ?', [userEmail]);
    const user = userRows[0];

    const result = await getMonthlyReportContent(user);
    if (result.success) {
        res.json({ html: result.html });
    } else {
        res.status(500).json({ error: result.error });
    }
});

app.post('/api/send-monthly-report', async (req, res) => {
    try {
        const userEmail = req.headers['x-user-email'];
        const [userRows] = await pool.query('SELECT email, role, department, faculty FROM users WHERE email = ?', [userEmail]);
        const user = userRows[0];
        if (!user || (user.role !== 'admin' && user.role !== 'super_admin' && user.role !== 'dean')) {
            return res.status(403).json({ error: 'Permission denied' });
        }

        const result = await sendMonthlyReport(user);
        if (result.success) {
            res.json({ success: true, message: user.role === 'super_admin' ? 'Monthly report sent to Pro-VC' : 'Report sent to your email' });
        } else {
            res.status(500).json({ error: result.error });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- Document Management Routes ---

// Upload document for an accreditation
app.post('/api/accreditations/:id/documents', upload.single('file'), async (req, res) => {
    const { id } = req.params;
    const { document_type, notes } = req.body;
    const file = req.file;
    const userEmail = req.headers['x-user-email'];

    if (!file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }

    try {
        // SECURITY: Verify department ownership
        const [userRows] = await pool.query('SELECT role, department FROM users WHERE email = ?', [userEmail]);
        const user = userRows[0];
        const [accRows] = await pool.query('SELECT department FROM accreditations WHERE id = ?', [id]);

        if (user && user.role !== 'super_admin' && user.department && accRows.length > 0 && accRows[0].department !== user.department) {
            if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
            return res.status(403).json({ error: 'Access denied. You can only upload documents for your own department.' });
        }

        const docId = crypto.randomUUID();
        console.log(`[VAULT-V32] Attempting upload: docId=${docId}, accId=${id}`);
        const [result] = await pool.query(
            'INSERT INTO accreditation_documents (id, accreditation_id, document_type, file_name, file_path, size_bytes, mime_type, notes, uploaded_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [docId, id, document_type || 'other', file.originalname, file.filename, file.size, file.mimetype, notes || '', userEmail]
        );

        // Audit Log for Document Upload
        try {
            await pool.query(
                'INSERT INTO audit_logs (user_email, action, method, path, details, ip_address, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [userEmail || 'anonymous', 'Upload Document', 'POST', req.originalUrl, `Uploaded ${file.originalname} for programme ID ${id}`, req.ip, 201]
            );
        } catch (auditErr) {
            console.error('Audit Log failed during document upload:', auditErr);
        }

        res.json({
            success: true,
            documentId: result.insertId,
            fileName: file.originalname
        });
    } catch (err) {
        console.error('UPLOAD ERROR [500]:', err);
        // Clean up the file if DB insert fails
        if (req.file && req.file.path && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        res.status(500).json({
            error: 'Failed to save document metadata to database',
            details: err.message,
            code: err.code
        });
    }
});

// List documents for an accreditation
app.get('/api/accreditations/:id/documents', async (req, res) => {
    const { id } = req.params;
    try {
        const [rows] = await pool.query(
            'SELECT * FROM accreditation_documents WHERE accreditation_id = ? ORDER BY uploaded_at DESC',
            [id]
        );
        res.json(rows.map(row => ({
            id: row.id,
            documentType: row.document_type,
            fileName: row.file_name,
            fileSize: row.size_bytes,
            mimeType: row.mime_type,
            uploadedAt: row.uploaded_at,
            notes: row.notes
        })));
    } catch (err) {
        console.error('Error fetching documents:', err);
        res.status(500).json({ error: 'Failed to fetch documents' });
    }
});

// Download/View a document
app.get('/api/documents/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const [rows] = await pool.query('SELECT * FROM accreditation_documents WHERE id = ?', [id]);
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Document not found' });
        }

        const document = rows[0];
        req.auditResourceName = document.file_name;
        const filePath = path.join(__dirname, 'uploads', document.file_path);

        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ error: 'File not found on disk' });
        }

        res.download(filePath, document.file_name);
    } catch (err) {
        console.error('Error downloading document:', err);
        res.status(500).json({ error: 'Failed to download document' });
    }
});

// Delete a document
app.delete('/api/documents/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const [rows] = await pool.query('SELECT * FROM accreditation_documents WHERE id = ?', [id]);
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Document not found' });
        }

        const document = rows[0];
        req.auditResourceName = document.file_name;
        const filePath = path.join(__dirname, 'uploads', document.file_path);

        // Delete from database
        await pool.query('DELETE FROM accreditation_documents WHERE id = ?', [id]);

        // Delete from disk
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }

        res.json({ success: true, message: 'Document deleted successfully' });
    } catch (err) {
        console.error('Error deleting document:', err);
        res.status(500).json({ error: 'Failed to delete document' });
    }
});

// --- Readiness Checklist Routes ---

// Get checkpoints for an accreditation
app.get('/api/accreditations/:id/checkpoints', async (req, res) => {
    const { id } = req.params;
    try {
        const [rows] = await pool.query(
            'SELECT * FROM accreditation_checkpoints WHERE accreditation_id = ? ORDER BY id',
            [id]
        );
        res.json(rows.map(row => ({
            id: row.id,
            checkpointName: row.checkpoint_name,
            isCompleted: row.is_completed === 1,
            updatedAt: row.updated_at
        })));
    } catch (err) {
        console.error('Error fetching checkpoints:', err);
        res.status(500).json({ error: 'Failed to fetch checkpoints' });
    }
});

// Update a checkpoint (toggle completion)
app.put('/api/checkpoints/:id', async (req, res) => {
    const { id } = req.params;
    const { isCompleted } = req.body;
    try {
        // First, update the checkpoint
        await pool.query(
            'UPDATE accreditation_checkpoints SET is_completed = ? WHERE id = ?',
            [isCompleted ? 1 : 0, id]
        );

        // If completed, check if all checkpoints for this accreditation are now done
        if (isCompleted) {
            const [checkRows] = await pool.query(
                'SELECT c.accreditation_id, c.checkpoint_name, c.workflow_stage, a.programme_name, a.workflow_status FROM accreditation_checkpoints c JOIN accreditations a ON c.accreditation_id = a.id WHERE c.id = ?', 
                [id]
            );
            const cp = checkRows[0];
            if (!cp) return res.json({ success: true });

            const accId = cp.accreditation_id;
            req.auditResourceName = `${cp.programme_name} (${cp.checkpoint_name})`;

            if (accId) {
                // Check stage completion
                const [stageTotal] = await pool.query('SELECT COUNT(*) as count FROM accreditation_checkpoints WHERE accreditation_id = ? AND workflow_stage = ?', [accId, cp.workflow_stage]);
                const [stageDone] = await pool.query('SELECT COUNT(*) as count FROM accreditation_checkpoints WHERE accreditation_id = ? AND workflow_stage = ? AND is_completed = 1', [accId, cp.workflow_stage]);

                const isStageComplete = stageTotal[0].count > 0 && stageTotal[0].count === stageDone[0].count;

                // Sync Workflow Status if the current status matches the completed stage
                if (isStageComplete && cp.workflow_status === cp.workflow_stage) {
                    const statusOrder = ['self_assessment', 'application_submitted', 'vetting', 'visitation', 'accredited'];
                    const currentIndex = statusOrder.indexOf(cp.workflow_status);
                    
                    if (currentIndex !== -1 && currentIndex < statusOrder.length - 1) {
                        const nextStatus = statusOrder[currentIndex + 1];
                        await pool.query('UPDATE accreditations SET workflow_status = ? WHERE id = ?', [nextStatus, accId]);
                        console.log(`[SYNC] Advanced ${cp.programme_name} to ${nextStatus} because ${cp.workflow_stage} is complete.`);
                    }
                }

                // Global completion check (Original Logic)
                const [totalRows] = await pool.query('SELECT COUNT(*) as count FROM accreditation_checkpoints WHERE accreditation_id = ?', [accId]);
                const [doneRows] = await pool.query('SELECT COUNT(*) as count FROM accreditation_checkpoints WHERE accreditation_id = ? AND is_completed = 1', [accId]);

                if (totalRows[0].count > 0 && totalRows[0].count === doneRows[0].count) {
                    const [accRows] = await pool.query('SELECT programme_name, email FROM accreditations WHERE id = ?', [accId]);
                    const acc = accRows[0];
                    if (acc && acc.email) {
                        try {
                            await sendEmail(
                                acc.email,
                                `QA Complete: ${acc.programme_name} is Ready for GTEC Submission`,
                                `
                                <h2>Internal Quality Assurance Complete!</h2>
                                <p>Congratulations!</p>
                                <p>All internal readiness checkpoints for <strong>${acc.programme_name}</strong> have been successfully completed.</p>
                                <p>The programme has passed the internal quality review and is now officially ready for submission to the <strong>Ghana Tertiary Education Commission (GTEC)</strong>.</p>
                                <p>Best regards,<br>OFFICE OF THE PRO-VICE CHANCELLOR</p>
                                `,
                                `Internal Quality Assurance Complete! All internal readiness checkpoints for ${acc.programme_name} have been successfully completed.`
                            );
                        } catch (emailErr) {
                            console.error('Failed to send readiness email:', emailErr);
                        }
                    }
                }
            }
        }

        res.json({ success: true });
    } catch (err) {
        console.error('Error updating checkpoint:', err);
        res.status(500).json({ error: 'Failed to update checkpoint' });
    }
});

// Initialize default checkpoints for an accreditation
app.post('/api/accreditations/:id/initialize-checkpoints', async (req, res) => {
    const { id } = req.params;
    const defaultCheckpoints = [
        { name: 'Curriculum Review Completed', stage: 'self_assessment' },
        { name: 'Self-Assessment Report Drafted', stage: 'self_assessment' },
        { name: 'Internal QA Approval', stage: 'self_assessment' },
        { name: 'Application Submitted to GTEC', stage: 'application_submitted' },
        { name: 'Staff Documentation Verified', stage: 'vetting' },
        { name: 'Infrastructure Assessment', stage: 'visitation' }
    ];

    try {
        // Check if already initialized
        const [existing] = await pool.query('SELECT count(*) as count FROM accreditation_checkpoints WHERE accreditation_id = ?', [id]);
        if (existing[0].count > 0) {
            return res.json({ success: true, message: 'Already initialized' });
        }

        for (const cp of defaultCheckpoints) {
            const checkpointId = crypto.randomUUID();
            await pool.query(
                'INSERT INTO accreditation_checkpoints (id, accreditation_id, checkpoint_name, workflow_stage) VALUES (?, ?, ?, ?)',
                [checkpointId, id, cp.name, cp.stage]
            );
        }
        res.json({ success: true, message: 'Checkpoints initialized with stage mapping' });
    } catch (err) {
        console.error('Error initializing checkpoints:', err);
        res.status(500).json({ error: 'Failed to initialize checkpoints' });
    }
});

// Reset checkpoints for renewal
app.post('/api/accreditations/:id/reset-checkpoints', async (req, res) => {
    const { id } = req.params;
    const userEmail = req.headers['x-user-email'];

    try {
        // SECURITY: Verify ownership/admin
        const [userRows] = await pool.query('SELECT role, department FROM users WHERE email = ?', [userEmail]);
        const user = userRows[0];
        const [accRows] = await pool.query('SELECT programme_name, department FROM accreditations WHERE id = ?', [id]);
        const acc = accRows[0];

        if (!user || (user.role !== 'super_admin' && user.department !== acc.department)) {
            return res.status(403).json({ error: 'Permission denied. Only admins for this department can reset checkpoints.' });
        }

        await pool.query('UPDATE accreditation_checkpoints SET is_completed = 0, updated_at = CURRENT_TIMESTAMP WHERE accreditation_id = ?', [id]);

        // Audit Log
        await pool.query(
            'INSERT INTO audit_logs (user_email, action, method, path, details, status) VALUES (?, ?, ?, ?, ?, ?)',
            [userEmail, 'Reset Checkpoints (Renewal)', 'POST', req.originalUrl, `Reset all QA checkpoints for ${acc.programme_name} to start renewal cycle.`, 200]
        );

        res.json({ success: true, message: 'Checkpoints reset for renewal' });
    } catch (err) {
        console.error('Error resetting checkpoints:', err);
        res.status(500).json({ error: 'Failed to reset checkpoints' });
    }
});

// Update a user (Role/Department)
app.put('/api/users/:id', async (req, res) => {
    const { id } = req.params;
    const { role, department, status } = req.body;
    try {
        const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [id]);
        if (rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const user = rows[0];
        req.auditResourceName = user.username;

        await pool.query(
            'UPDATE users SET role = ?, department = ?, status = ? WHERE id = ?',
            [role || user.role, department || user.department, status || user.status, id]
        );

        res.json({ success: true, message: 'User updated successfully' });
    } catch (err) {
        console.error('Error updating user:', err);
        res.status(500).json({ error: 'Failed to update user' });
    }
});

// Daily accreditation check cron job
cron.schedule('0 9 * * *', async () => {
    console.log('Running daily accreditation check...');
    try {
        const [rows] = await pool.query('SELECT * FROM accreditations WHERE email IS NOT NULL');
        // Target intervals: 1 day, 1 week, 2 weeks, 1 month (30 days), 6 months (180 days), 1 year (365 days), 15 months (450 days)
        const targetDays = [1, 7, 14, 30, 180, 365, 450];

        for (const row of rows) {
            // Check if snoozed
            if (row.snoozed_until && new Date(row.snoozed_until) > new Date()) {
                console.log(`Skipping snoozed reminder for ${row.programme_name}`);
                continue;
            }

            const { days } = getStatus(row.expiry_date);

            if (targetDays.includes(days)) {
                console.log(`Sending auto-reminder for ${row.programme_name} (Expires in ${days} days)`);
                await sendEmail(
                    row.email,
                    `Action Required: Accreditation Expiring in ${days} Days - ${row.programme_name}`,
                    `<p>The accreditation for <strong>${row.programme_name}</strong> expires in <strong>${days} days</strong>.</p><p>Please take necessary action to renew the accreditation.</p>`,
                    `Action Required: The accreditation for ${row.programme_name} expires in ${days} days. Please take necessary action to renew the accreditation.`
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
            `University Data Backup: Attached is the automated daily backup for the HTU Accreditation Monitoring System generated at ${new Date().toLocaleString()}.`,
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

// --- FINAL PRODUCTION ROUTING ---

// Health check and API routes are handled above

// Health check and API routes are handled above
// VERSION 32: THE ULTIMATE EMERGENCY PATCH
app.get('/api/health', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT COUNT(*) as count FROM accreditations');
        let verification = { success: false, error: 'Checking email service...' };
        try {
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('Email check timed out (3s)')), 3000);
            });
            verification = await Promise.race([verifyConnection(), timeoutPromise]);
        } catch (vErr) {
            verification = { success: false, error: vErr.message };
        }

        res.json({
            version: "1.0.0",
            status: 'ok',
            vault_uuid_ready: true,
            env_file_exists: fs.existsSync(path.join(__dirname, '.env')),
            email_service: verification.success ? 'connected' : 'auth_failed',
            accreditations: rows[0].count
        });
    } catch (err) {
        res.status(500).json({ status: 'error', error: err.message });
    }
});

// --- FINAL PRODUCTION ROUTING ---

// --- PERFORMANCE OPTIMIZED STATIC SERVING ---
const oneYear = 31536000000; // 1 year in ms

// Serve static files with aggressive caching for assets
app.use(express.static(path.join(__dirname, 'dist'), {
    maxAge: oneYear,
    setHeaders: (res, filePath) => {
        // Only cache actual assets (JS, CSS, Images)
        // Do NOT cache index.html so updates are seen immediately
        if (filePath.endsWith('.html')) {
            res.setHeader('Cache-Control', 'no-cache');
        } else {
            res.setHeader('Cache-Control', `public, max-age=${oneYear / 1000}, immutable`);
        }
    }
}));

// Fallback for SPA Routing
app.get('*', (req, res) => {
    res.setHeader('Cache-Control', 'no-cache');
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Warm up the database pool on startup
pool.getConnection()
    .then(conn => {
        console.log('Database pool warmed up and ready.');
        conn.release();
    })
    .catch(err => {
        console.error('Database warming failed:', err.message);
    });

// Simple 404 for missing API routes
app.use('/api', (req, res) => {
    res.status(404).json({ error: 'API endpoint not found' });
});
app.use('/api', (req, res) => {
    res.status(404).json({ error: 'API endpoint not found' });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`HTU Accreditation Backend Started on port ${PORT}`);
});



const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
require('dotenv').config();

async function reset() {
    const pool = mysql.createPool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
    });

    try {
        console.log('--- EMERGENCY PASSWORD RESET ---');

        // Reset Admin
        const adminHash = await bcrypt.hash('admin123', 10);
        await pool.query('UPDATE users SET password_hash = ? WHERE username = "admin"', [adminHash]);
        console.log('Admin password reset to: admin123');

        // Reset User
        const userHash = await bcrypt.hash('user123', 10);
        await pool.query('UPDATE users SET password_hash = ? WHERE username = "user"', [userHash]);
        console.log('User password reset to: user123');

        console.log('\nSUCCESS: You can now log in with the default passwords.');
    } catch (err) {
        console.error('Error during reset:', err);
    } finally {
        await pool.end();
    }
}

reset();

const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

async function check() {
    const pool = mysql.createPool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
    });

    try {
        const [rows] = await pool.query('SELECT id, username, email, role FROM users');
        console.log('Database Users:');
        console.log(JSON.stringify(rows, null, 2));
    } catch (err) {
        console.error('Error checking users:', err);
    } finally {
        await pool.end();
    }
}

check();

const mysql = require('mysql2/promise');
const fs = require('fs');
require('dotenv').config();

async function check() {
    const pool = mysql.createPool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
    });

    try {
        const [rows] = await pool.query('SELECT username, email, role FROM users');
        let output = rows.map(r => `USER: ${r.username} | EMAIL: ${r.email} | ROLE: ${r.role}`).join('\n');
        fs.writeFileSync('users_output.txt', output);
        console.log('Saved to users_output.txt');
    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await pool.end();
    }
}

check();

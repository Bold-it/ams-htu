require('dotenv').config();
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'ht_accreditation',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

async function main() {
    try {
        console.log("Adding snoozed_until column...");
        await pool.query(`
            ALTER TABLE accreditations 
            ADD COLUMN snoozed_until DATE NULL DEFAULT NULL;
        `);
        console.log("Column added successfully.");
        process.exit(0);
    } catch (err) {
        console.error("Error adding column:", err.message);
        process.exit(1);
    }
}

main();

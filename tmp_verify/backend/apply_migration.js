const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function run() {
    console.log('Connecting to database...');
    const pool = mysql.createPool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        multipleStatements: true
    });

    const sqlPath = path.join(__dirname, 'migration.sql');
    console.log('Reading migration file:', sqlPath);
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('Running migration...');
    const [result] = await pool.query(sql);
    console.log('Migration successful!');

    await pool.end();
}

run().catch(err => {
    console.error('Migration failed:', err);
    process.exit(1);
});

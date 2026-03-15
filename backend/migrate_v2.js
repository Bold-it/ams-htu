const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

async function migrate() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
    });

    try {
        console.log('Starting migration...');

        await connection.query('ALTER TABLE accreditations ADD COLUMN IF NOT EXISTS faculty VARCHAR(255)');
        await connection.query('ALTER TABLE accreditations ADD COLUMN IF NOT EXISTS department VARCHAR(255)');

        console.log('Migration successful: Added faculty and department columns.');
    } catch (err) {
        console.error('Migration failed:', err.message);
    } finally {
        await connection.end();
    }
}

migrate();

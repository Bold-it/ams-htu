const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

async function applyUpdate() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        multipleStatements: true
    });

    try {
        console.log('Applying Phase 1 Schema Update...');
        const sql = fs.readFileSync(path.join(__dirname, 'schema_update.sql'), 'utf8');
        await connection.query(sql);
        console.log('✅ Schema updated successfully.');
    } catch (err) {
        console.error('❌ Update failed:', err.message);
    } finally {
        await connection.end();
    }
}

applyUpdate();

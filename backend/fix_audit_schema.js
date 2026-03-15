const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

async function fixSchema() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
    });

    try {
        console.log('--- FIXING AUDIT_LOGS SCHEMA ---');
        
        // Helper to add column if missing
        const addColumn = async (colName, definition) => {
            const [columns] = await connection.query(
                'SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = "audit_logs" AND COLUMN_NAME = ?',
                [process.env.DB_NAME, colName]
            );
            if (columns.length === 0) {
                await connection.query(`ALTER TABLE audit_logs ADD COLUMN ${colName} ${definition}`);
                console.log(`Added column ${colName} to audit_logs table.`);
            } else {
                console.log(`Column ${colName} already exists.`);
            }
        };

        await addColumn('method', 'VARCHAR(10) NULL');
        await addColumn('path', 'VARCHAR(255) NULL');
        await addColumn('ip_address', 'VARCHAR(45) NULL');

        console.log('\n✅ AUDIT_LOGS SCHEMA UPDATED SUCCESSFULLY!');
    } catch (err) {
        console.error('❌ Error fixing schema:', err);
    } finally {
        await connection.end();
    }
}

fixSchema();

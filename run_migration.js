const fs = require('fs');
const path = require('path');

// Point to backend node_modules
const backendNodeModules = path.join(__dirname, 'backend', 'node_modules');
const mysql = require(path.join(backendNodeModules, 'mysql2', 'promise'));
const dotenv = require(path.join(backendNodeModules, 'dotenv'));

dotenv.config({ path: path.join(__dirname, 'backend', '.env') });

async function run() {
    console.log('Connecting to database...');
    const conn = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        multipleStatements: true
    });

    const sqlPath = path.join(__dirname, 'backend', 'migration.sql');
    console.log('Reading migration file...');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('Running migration...');
    await conn.query(sql);
    console.log('Migration successful!');
    await conn.end();
}

run().catch(err => {
    console.error('Migration failed:', err);
    process.exit(1);
});

const mysql = require('mysql2/promise');
require('dotenv').config();

async function setupDatabase() {
  let connection;
  
  try {
    // First connect without specifying database to create it
    console.log('Connecting to MySQL server...');
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
    });

    console.log('Connected to MySQL server.');

    // Create database if it doesn't exist
    console.log(`Creating database ${process.env.DB_NAME}...`);
    await connection.query(`CREATE DATABASE IF NOT EXISTS ${process.env.DB_NAME}`);
    console.log(`Database ${process.env.DB_NAME} created or already exists.`);

    // Use the database
    await connection.query(`USE ${process.env.DB_NAME}`);

    // Create accreditations table
    console.log('Creating accreditations table...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS accreditations (
        id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
        programme_name VARCHAR(255) NOT NULL,
        start_date DATE NULL,
        expiry_date DATE NOT NULL,
        email VARCHAR(255) NULL,
        notes TEXT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    console.log('Table accreditations created successfully.');

    console.log('\n✅ Database setup completed successfully!');
    console.log(`Database: ${process.env.DB_NAME}`);
    console.log('Table: accreditations');

  } catch (error) {
    console.error('❌ Error setting up database:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

setupDatabase();

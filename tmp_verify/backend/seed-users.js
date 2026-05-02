const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

async function seed() {
    const pool = mysql.createPool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
    });

    try {
        console.log('Connecting to database...');

        // Create users table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS users (
                id VARCHAR(36) PRIMARY KEY,
                username VARCHAR(255) UNIQUE NOT NULL,
                email VARCHAR(255) UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                role ENUM('super_admin', 'admin', 'user') NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // ... existing audit table creation ...

        // Ensure role column is updated for existing tables (MySQL doesn't support easy ENUM alteration without re-defining)
        try {
            await pool.query("ALTER TABLE users MODIFY COLUMN role ENUM('super_admin', 'admin', 'user') NOT NULL");
        } catch (err) {
            console.log('Role column update likely already applied or failed:', err.message);
        }

        // Clear existing default users to ensure clean seeding
        await pool.query('DELETE FROM users WHERE username IN ("admin", "user", "super_admin") OR email = "accreditationsystem@htu.edu.gh"');

        // Seed Super Admin
        const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
        const superAdminHash = await bcrypt.hash(adminPassword, 10);
        await pool.query(
            'INSERT INTO users (id, username, email, password_hash, role) VALUES (?, ?, ?, ?, ?)',
            [crypto.randomUUID(), 'super_admin', 'accreditationsystem@htu.edu.gh', superAdminHash, 'super_admin']
        );
        console.log('Super Admin account seeded: accreditationsystem@htu.edu.gh');

        // Seed Admin (Secondary)
        const adminHash = await bcrypt.hash(adminPassword, 10);
        await pool.query(
            'INSERT INTO users (id, username, email, password_hash, role) VALUES (?, ?, ?, ?, ?)',
            [crypto.randomUUID(), 'admin', 'admin@htu.edu.gh', adminHash, 'admin']
        );
        console.log('Admin account seeded: admin@htu.edu.gh');

        // Seed User (Viewer)
        const userPassword = process.env.USER_PASSWORD || 'user123';
        const userHash = await bcrypt.hash(userPassword, 10);
        await pool.query(
            'INSERT INTO users (id, username, email, password_hash, role) VALUES (?, ?, ?, ?, ?)',
            [crypto.randomUUID(), 'user', 'user@htu.edu.gh', userHash, 'user']
        );
        console.log('User account seeded: user@htu.edu.gh');

        console.log('Seeding completed successfully!');
    } catch (err) {
        console.error('Error seeding database:', err);
    } finally {
        await pool.end();
    }
}

seed();

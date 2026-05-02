const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

async function setup() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
    });

    try {
        console.log('--- REFRESHING DEMO DATABASE ---');
        
        // 1. Create/Recreate Database
        await connection.query(`DROP DATABASE IF EXISTS ${process.env.DB_NAME}`);
        await connection.query(`CREATE DATABASE ${process.env.DB_NAME}`);
        await connection.query(`USE ${process.env.DB_NAME}`);
        console.log(`Database ${process.env.DB_NAME} reset successfully.`);

        // 2. Create Users Table
        console.log('Creating users table...');
        await connection.query(`
            CREATE TABLE users (
                id VARCHAR(36) PRIMARY KEY,
                username VARCHAR(255) UNIQUE NOT NULL,
                email VARCHAR(255) UNIQUE NOT NULL,
                password_hash TEXT NULL,
                google_id VARCHAR(255) UNIQUE NULL,
                role ENUM('super_admin', 'admin', 'user') NOT NULL,
                status ENUM('active', 'pending_approval') DEFAULT 'active',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // 3. Create Accreditations Table (with all columns)
        console.log('Creating accreditations table...');
        await connection.query(`
            CREATE TABLE accreditations (
                id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
                programme_name VARCHAR(255) NOT NULL,
                faculty VARCHAR(255) NULL,
                department VARCHAR(255) NULL,
                start_date DATE NULL,
                expiry_date DATE NOT NULL,
                email VARCHAR(255) NULL,
                notes TEXT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);

        // 4. Create Audit Logs Table
        console.log('Creating audit_logs table...');
        await connection.query(`
            CREATE TABLE audit_logs (
                id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
                action VARCHAR(255) NOT NULL,
                user_email VARCHAR(255) NOT NULL,
                method VARCHAR(10) NULL,
                path VARCHAR(255) NULL,
                details TEXT NULL,
                ip_address VARCHAR(45) NULL,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // 5. Seed Users
        console.log('Seeding users...');
        const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
        const superAdminHash = await bcrypt.hash(adminPassword, 10);
        await connection.query(
            'INSERT INTO users (id, username, email, password_hash, role, status) VALUES (?, ?, ?, ?, ?, ?)',
            [crypto.randomUUID(), 'super_admin', 'accreditationsystem@htu.edu.gh', superAdminHash, 'super_admin', 'active']
        );
        console.log('Super Admin: accreditationsystem@htu.edu.gh / admin123');

        // 6. Seed Accreditations
        console.log('Seeding mock accreditations...');
        const today = new Date();
        const mockAccs = [
            ['BTech Computer Science', 'Applied Sciences', 'Computer Science', 
             new Date(today.getFullYear() - 3, today.getMonth(), today.getDate()).toISOString().split('T')[0],
             new Date(today.getFullYear() + 2, today.getMonth(), today.getDate()).toISOString().split('T')[0]],
            ['BTech Civil Engineering', 'Engineering', 'Civil Engineering',
             new Date(today.getFullYear() - 4, today.getMonth(), today.getDate()).toISOString().split('T')[0],
             new Date(today.getFullYear() - 1, today.getMonth(), today.getDate()).toISOString().split('T')[0]],
            ['BTech Fashion Design', 'Art and Design', 'Fashion Design',
             new Date(today.getFullYear() - 2, today.getMonth(), today.getDate()).toISOString().split('T')[0],
             new Date(today.getFullYear(), today.getMonth() + 5, today.getDate()).toISOString().split('T')[0]],
            ['BTech Hospitality Management', 'Applied Sciences', 'Hospitality',
             new Date(today.getFullYear() - 1, today.getMonth(), today.getDate()).toISOString().split('T')[0],
             new Date(today.getFullYear() + 1, today.getMonth() - 2, today.getDate()).toISOString().split('T')[0]]
        ];

        for (const [name, fac, dept, start, expiry] of mockAccs) {
            await connection.query(
                'INSERT INTO accreditations (id, programme_name, faculty, department, start_date, expiry_date, email) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [crypto.randomUUID(), name, fac, dept, start, expiry, 'accreditationsystem@htu.edu.gh']
            );
        }

        console.log('\n✅ SYSTEM READY FOR DEMO!');
        console.log('1. Go to: http://localhost:8080');
        console.log('2. Login with: accreditationsystem@htu.edu.gh / admin123');
        console.log('3. Show the Dashboard, Charts, and Data Tables.');

    } catch (err) {
        console.error('❌ Demo Setup Failed:', err);
    } finally {
        await connection.end();
    }
}

setup();

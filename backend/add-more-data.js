const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

async function addDemoData() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
    });

    try {
        console.log('--- ADDING ADDITIONAL DEMO USERS AND DATA ---');

        // 1. Add New Users
        console.log('Adding new demo users...');
        const defaultPassword = await bcrypt.hash('password123', 10);

        const newUsers = [
            // id, username, email, password_hash, role, status
            [crypto.randomUUID(), 'vc_admin', 'vc@htu.edu.gh', defaultPassword, 'admin', 'active'],
            [crypto.randomUUID(), 'hod_cs', 'hod.cs@htu.edu.gh', defaultPassword, 'user', 'active'],
            [crypto.randomUUID(), 'qa_viewer', 'qa@htu.edu.gh', defaultPassword, 'user', 'active'],
            [crypto.randomUUID(), 'pending_user', 'new.staff@htu.edu.gh', defaultPassword, 'user', 'pending_approval']
        ];

        for (const user of newUsers) {
            // Use INSERT IGNORE to avoid errors if the script is run multiple times
            await connection.query(
                'INSERT IGNORE INTO users (id, username, email, password_hash, role, status) VALUES (?, ?, ?, ?, ?, ?)',
                user
            );
        }
        console.log('Added 4 new users (including 1 pending approval).');

        // 2. Add More Accreditations
        console.log('Adding more accreditation records...');
        const today = new Date();
        const moreAccs = [
            // programme_name, faculty, department, start_date, expiry_date, email
            ['HND Accountancy', 'Business School', 'Accounting',
                new Date(today.getFullYear() - 5, today.getMonth(), today.getDate()).toISOString().split('T')[0],
                new Date(today.getFullYear(), today.getMonth() - 1, today.getDate()).toISOString().split('T')[0], // Expired recently
                'hod.acc@htu.edu.gh'],

            ['HND Marketing', 'Business School', 'Marketing',
                new Date(today.getFullYear() - 2, 5, 15).toISOString().split('T')[0],
                new Date(today.getFullYear() + 3, 5, 15).toISOString().split('T')[0], // Healthy
                'hod.mkt@htu.edu.gh'],

            ['BTech Cybersecurity', 'Applied Sciences', 'Computer Science',
                new Date(today.getFullYear(), today.getMonth() - 2, 10).toISOString().split('T')[0],
                new Date(today.getFullYear() + 5, today.getMonth() - 2, 10).toISOString().split('T')[0], // Very new
                'hod.cs@htu.edu.gh'],

            ['MTech Agric Engineering', 'Engineering', 'Agricultural Eng.',
                new Date(today.getFullYear() - 3, 8, 1).toISOString().split('T')[0],
                new Date(today.getFullYear(), today.getMonth() + 2, 1).toISOString().split('T')[0], // Critical (expires in 2 months)
                'agric@htu.edu.gh']
        ];

        for (const [name, fac, dept, start, expiry, email] of moreAccs) {
            await connection.query(
                'INSERT INTO accreditations (id, programme_name, faculty, department, start_date, expiry_date, email) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [crypto.randomUUID(), name, fac, dept, start, expiry, email]
            );
        }
        console.log('Added 4 new accreditation records.');

        // 3. Add Some Demo Audit Logs
        console.log('Adding demo audit logs...');
        const auditLogs = [
            [crypto.randomUUID(), 'User Login', 'accreditationsystem@htu.edu.gh', 'POST', '/api/login', 'Super admin logged into the system', '127.0.0.1'],
            [crypto.randomUUID(), 'Create Accreditation', 'accreditationsystem@htu.edu.gh', 'POST', '/api/accreditations', 'Added new programme: BTech Cybersecurity', '127.0.0.1'],
            [crypto.randomUUID(), 'Update Accreditation', 'accreditationsystem@htu.edu.gh', 'PUT', '/api/accreditations/1', 'Updated notes for HND Accountancy', '127.0.0.1'],
            [crypto.randomUUID(), 'Approve User', 'accreditationsystem@htu.edu.gh', 'POST', '/api/users/1/approve', 'Approved pending user: new.staff@htu.edu.gh', '127.0.0.1']
        ];

        for (const log of auditLogs) {
            await connection.query(
                // Use a slightly varied timestamp for realism
                'INSERT INTO audit_logs (id, action, user_email, method, path, details, ip_address, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?, DATE_SUB(NOW(), INTERVAL ? HOUR))',
                [log[0], log[1], log[2], log[3], log[4], log[5], log[6], Math.floor(Math.random() * 48)]
            );
        }
        console.log('Added demo audit logs.');


        console.log('\n✅ NEW DATA ADDED SUCCESSFULLY!');

    } catch (err) {
        console.error('❌ Error adding demo data:', err);
    } finally {
        await connection.end();
    }
}

addDemoData();

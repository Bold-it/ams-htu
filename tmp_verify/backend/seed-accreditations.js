const mysql = require('mysql2/promise');
const crypto = require('crypto');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

async function seedAccreditations() {
    const pool = mysql.createPool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
    });

    try {
        console.log('Seeding mock accreditations...');
        
        const today = new Date();
        
        const mockData = [
            {
                programme_name: 'BTech Computer Science',
                faculty: 'Applied Sciences',
                department: 'Computer Science',
                start_date: new Date(today.getFullYear() - 3, today.getMonth(), today.getDate()).toISOString().split('T')[0],
                expiry_date: new Date(today.getFullYear() + 2, today.getMonth(), today.getDate()).toISOString().split('T')[0],
                email: 'cs@htu.edu.gh'
            },
            {
                programme_name: 'BTech Civil Engineering',
                faculty: 'Engineering',
                department: 'Civil Engineering',
                start_date: new Date(today.getFullYear() - 4, today.getMonth(), today.getDate()).toISOString().split('T')[0],
                expiry_date: new Date(today.getFullYear() - 1, today.getMonth(), today.getDate()).toISOString().split('T')[0], // Expired
                email: 'civil@htu.edu.gh'
            },
            {
                programme_name: 'BTech Fashion Design',
                faculty: 'Art and Design',
                department: 'Fashion Design',
                start_date: new Date(today.getFullYear() - 2, today.getMonth(), today.getDate()).toISOString().split('T')[0],
                expiry_date: new Date(today.getFullYear(), today.getMonth() + 5, today.getDate()).toISOString().split('T')[0], // Critical (< 6 months)
                email: 'fashion@htu.edu.gh'
            },
            {
                programme_name: 'BTech Hospitality Management',
                faculty: 'Applied Sciences',
                department: 'Hospitality',
                start_date: new Date(today.getFullYear() - 1, today.getMonth(), today.getDate()).toISOString().split('T')[0],
                expiry_date: new Date(today.getFullYear() + 1, today.getMonth() - 2, today.getDate()).toISOString().split('T')[0], // Warning ( < 12 months)
                email: 'hospitality@htu.edu.gh'
            }
        ];

        for (const acc of mockData) {
            await pool.query(
                'INSERT INTO accreditations (id, programme_name, faculty, department, start_date, expiry_date, email) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [crypto.randomUUID(), acc.programme_name, acc.faculty, acc.department, acc.start_date, acc.expiry_date, acc.email]
            );
        }

        console.log('Seeding completed successfully!');
    } catch (err) {
        console.error('Error seeding accreditations:', err);
    } finally {
        await pool.end();
    }
}

seedAccreditations();

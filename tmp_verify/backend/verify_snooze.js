require('dotenv').config();
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'ht_accreditation',
  waitForConnections: true,
  connectionLimit: 1,
  queueLimit: 0
});

async function verify() {
    try {
        console.log("--- VERIFICATION START ---");
        
        // 1. Check if column exists
        const [columns] = await pool.query("DESCRIBE accreditations");
        const hasSnooze = columns.some(c => c.Field === 'snoozed_until');
        console.log(`1. 'snoozed_until' column exists: ${hasSnooze}`);

        // 2. Mock a snooze update
        const [rows] = await pool.query("SELECT id, programme_name FROM accreditations LIMIT 1");
        if (rows.length > 0) {
            const testId = rows[0].id;
            const snoozeDate = new Date();
            snoozeDate.setDate(snoozeDate.getDate() + 5);
            const snoozeStr = snoozeDate.toISOString().split('T')[0];
            
            console.log(`2. Attempting to snooze '${rows[0].programme_name}' until ${snoozeStr}...`);
            await pool.query("UPDATE accreditations SET snoozed_until = ? WHERE id = ?", [snoozeStr, testId]);
            
            const [check] = await pool.query("SELECT snoozed_until FROM accreditations WHERE id = ?", [testId]);
            const savedDate = check[0].snoozed_until ? new Date(check[0].snoozed_until).toISOString().split('T')[0] : null;
            console.log(`3. Verified DB persistence: ${savedDate === snoozeStr ? "SUCCESS" : "FAILED"}`);
            
            // 4. Test logic emulation
            const row = { snoozed_until: check[0].snoozed_until, programme_name: rows[0].programme_name };
            console.log(`4. Emulating reminder check...`);
            const isSnoozed = row.snoozed_until && new Date(row.snoozed_until) > new Date();
            console.log(`- Logic check (isSnoozed): ${isSnoozed}`);
            
            // Clean up
            await pool.query("UPDATE accreditations SET snoozed_until = NULL WHERE id = ?", [testId]);
            console.log("5. Cleanup: Snooze cleared.");
        } else {
            console.log("No accreditations found to test.");
        }
        
        console.log("--- VERIFICATION COMPLETE ---");
        process.exit(0);
    } catch (err) {
        console.error("Verification failed:", err.message);
        process.exit(1);
    }
}

verify();

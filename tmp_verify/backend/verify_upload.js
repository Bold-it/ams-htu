require('dotenv').config();
const mysql = require('mysql2/promise');

async function verify() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  try {
    console.log("--- Upload Fix Verification ---");

    // 1. Check all required columns in accreditation_documents
    const [columns] = await pool.query("DESCRIBE accreditation_documents");
    const fields = columns.map(c => c.Field);
    console.log("Current columns:", fields.join(", "));

    const required = ['id','accreditation_id','document_type','file_name','file_path','size_bytes','mime_type','notes','uploaded_at'];
    const missing = required.filter(f => !fields.includes(f));
    if (missing.length > 0) {
      console.log("MISSING columns:", missing.join(", "));
    } else {
      console.log("✅ All required columns present.");
    }

    // 2. Get a test accreditation_id
    const [accRows] = await pool.query("SELECT id FROM accreditations LIMIT 1");
    if (accRows.length === 0) {
      console.log("No accreditations to test with.");
      process.exit(0);
    }
    const testId = accRows[0].id;

    // 3. Simulate an insert (same query as server does)
    const [result] = await pool.query(
      'INSERT INTO accreditation_documents (accreditation_id, document_type, file_name, file_path, size_bytes, mime_type, notes) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [testId, 'other', 'test.pdf', 'test-file.pdf', 1024, 'application/pdf', 'test notes']
    );
    console.log("✅ Test insert succeeded. Document ID:", result.insertId);

    // 4. Verify retrieval
    const [docs] = await pool.query("SELECT id, file_name, size_bytes, notes FROM accreditation_documents WHERE accreditation_id = ? ORDER BY uploaded_at DESC LIMIT 1", [testId]);
    console.log("✅ Test retrieval:", JSON.stringify(docs[0]));
    const foundId = docs[0].id;

    // 5. Clean up
    await pool.query("DELETE FROM accreditation_documents WHERE id = ?", [foundId]);
    console.log("✅ Cleanup done.");
    console.log("--- Verification PASSED ---");
    process.exit(0);
  } catch (err) {
    console.error("❌ Verification FAILED:", err.message);
    process.exit(1);
  }
}

verify();

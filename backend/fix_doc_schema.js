require('dotenv').config();
const mysql = require('mysql2/promise');

async function migrate() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  const addColIfMissing = async (table, col, definition) => {
    const [rows] = await pool.query(
      'SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?',
      [process.env.DB_NAME, table, col]
    );
    if (rows.length === 0) {
      await pool.query(`ALTER TABLE \`${table}\` ADD COLUMN ${col} ${definition}`);
      console.log(`✅ Added column '${col}' to '${table}'.`);
    } else {
      console.log(`⏭  Column '${col}' already exists in '${table}'.`);
    }
  };

  try {
    console.log("=== Running document table migration ===");

    // Ensure all expected columns exist
    await addColIfMissing('accreditation_documents', 'notes', 'TEXT NULL');
    await addColIfMissing('accreditation_documents', 'size_bytes', 'BIGINT NULL');

    // Final column list
    const [cols] = await pool.query("DESCRIBE accreditation_documents");
    console.log("\nFinal columns:", cols.map(c => c.Field).join(", "));
    console.log("=== Migration complete ===");
    process.exit(0);
  } catch (err) {
    console.error("Migration error:", err.message);
    process.exit(1);
  }
}

migrate();

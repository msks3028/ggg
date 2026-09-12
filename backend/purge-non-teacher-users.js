require("dotenv").config();
const { Pool } = require("pg");

const teacherEmail = String(process.env.TEACHER_EMAIL || "").trim().toLowerCase();
if (!teacherEmail) throw new Error("TEACHER_EMAIL is required.");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: String(process.env.DB_SSL || "").toLowerCase() === "true" ? { rejectUnauthorized: false } : undefined,
});

(async () => {
  try {
    const teacher = await pool.query("SELECT id,email FROM users WHERE lower(email)=lower($1) LIMIT 1", [teacherEmail]);
    if (!teacher.rows[0]) {
      throw new Error("Teacher account was not found. No accounts were deleted.");
    }
    await pool.query("UPDATE users SET role='TEACHER',provider='local',email_verified=TRUE WHERE id=$1", [teacher.rows[0].id]);
    const deleted = await pool.query("DELETE FROM users WHERE id <> $1", [teacher.rows[0].id]);
    console.log(`Deleted ${deleted.rowCount} non-teacher account(s). Preserved: ${teacher.rows[0].email}`);
  } finally {
    await pool.end();
  }
})();

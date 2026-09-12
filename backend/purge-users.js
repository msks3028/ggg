require("dotenv").config();
const { Pool } = require("pg");

const teacherEmail = String(process.env.TEACHER_EMAIL || "mostafakareem978@gmail.com").trim().toLowerCase();
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required.");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: String(process.env.DB_SSL || "").toLowerCase() === "true" ? { rejectUnauthorized: false } : undefined,
});

(async () => {
  const client = await pool.connect();
  try {
    await client.query("CREATE TABLE IF NOT EXISTS lurnova_system_flags (key TEXT PRIMARY KEY, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())");
    await client.query("BEGIN");
    const teacher = await client.query(
      "SELECT id,email FROM users WHERE lower(email)=lower($1) LIMIT 1",
      [teacherEmail]
    );
    if (!teacher.rows[0]) {
      await client.query("ROLLBACK");
      console.error("لم يتم العثور على حساب المدرس. لم يتم حذف أي حساب.");
      process.exitCode = 1;
      return;
    }
    await client.query(
      "UPDATE users SET role='TEACHER', provider='local', email_verified=TRUE WHERE id=$1",
      [teacher.rows[0].id]
    );
    const deleted = await client.query(
      "DELETE FROM users WHERE id <> $1",
      [teacher.rows[0].id]
    );
    await client.query("INSERT INTO lurnova_system_flags(key) VALUES('initial_user_cleanup') ON CONFLICT (key) DO NOTHING");
    await client.query("COMMIT");
    console.log(`تم تنظيف الحسابات: حذف ${deleted.rowCount} حساب، وتم الاحتفاظ بحساب المدرس ${teacher.rows[0].email}.`);
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
    await pool.end();
  }
})().catch((e) => {
  console.error("فشل تنظيف الحسابات:", e.message);
  process.exit(1);
});

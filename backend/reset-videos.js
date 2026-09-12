// reset-videos.js
// -----------------------------------------------------------------------
// سكريبت صيانة لمرة واحدة: يصفّر كل الفيديوهات (سواء فيديوهات الكورسات
// أو "الحصص المسجلة" المستقلة) وكل سجلات المشاهدة المرتبطة بيها، عشان
// عداد الفيديوهات يبقى 0 عند المدرس وعند الطالب، من غير ما يمسح أي حاجة
// تانية (المستخدمين، الكورسات، الامتحانات، الملفات، الإعلانات...الخ).
//
// طريقة التشغيل (من مجلد backend):
//   node reset-videos.js
//
// لازم يبقى عندك ملف .env فيه DATABASE_URL (أو DB_PASSWORD) زي ما
// السيرفر شغال بيهم أصلاً. السكريبت ده مايشتغلش من غير قاعدة بيانات حقيقية.
// -----------------------------------------------------------------------
require("dotenv").config();
const fs = require("fs");
const path = require("path");
const { Pool } = require("pg");

if (!process.env.DATABASE_URL && !process.env.DB_PASSWORD) {
  throw new Error("Set DATABASE_URL or DB_PASSWORD for PostgreSQL.");
}

const UPLOAD_ROOT = path.resolve(process.env.UPLOAD_DIR || path.join(__dirname, "uploads"));

const pool = new Pool(
  process.env.DATABASE_URL
    ? {
        connectionString: process.env.DATABASE_URL,
        ssl: String(process.env.DB_SSL || "").toLowerCase() === "true" ? { rejectUnauthorized: false } : undefined,
      }
    : {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 5432,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        ssl: String(process.env.DB_SSL || "").toLowerCase() === "true" ? { rejectUnauthorized: false } : undefined,
      }
);

// يمسح ملف فيزيائي من مجلد uploads فقط (نفس منطق التأمين المستخدم في
// index.js) عشان محدش يقدر يمسح ملف برة المجلد بالغلط.
function safeUnlink(relativeUrl) {
  const raw = String(relativeUrl || "").trim();
  if (!raw.startsWith("/uploads/")) return;
  const relative = decodeURIComponent(raw.replace(/^\/uploads\//, ""));
  const filePath = path.resolve(UPLOAD_ROOT, relative);
  if (filePath.startsWith(`${path.resolve(UPLOAD_ROOT)}${path.sep}`) && fs.existsSync(filePath)) {
    fs.unlink(filePath, () => {});
  }
}

(async () => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // هات كل الفيديوهات (وصورها المصغرة) قبل المسح عشان نقدر نمسح الملفات
    // الفعلية من على السيرفر كمان.
    const videos = await client.query(
      `SELECT id, video_url, thumbnail FROM lessons WHERE video_url <> ''`
    );

    // مسح صفوف الفيديوهات نفسها. lesson_views بتتمسح تلقائي معاها
    // (ON DELETE CASCADE) فمشاهدات الطلاب بترجع 0 كمان تلقائي.
    const deleted = await client.query(
      `DELETE FROM lessons WHERE video_url <> ''`
    );

    await client.query("COMMIT");

    for (const row of videos.rows) {
      safeUnlink(row.video_url);
      safeUnlink(row.thumbnail);
    }

    console.log(`تم تصفير الفيديوهات: اتمسح ${deleted.rowCount} فيديو وكل المشاهدات المرتبطة بيهم.`);
    console.log("عداد الفيديوهات هيبقى 0 عند المدرس وعند الطالب. باقي المشروع (المستخدمين، الكورسات، الامتحانات، الملفات) اتسابوا زي ما هم.");
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
    await pool.end();
  }
})().catch((e) => {
  console.error("فشل تصفير الفيديوهات:", e.message);
  process.exit(1);
});

// diagnose-videos.js
// -----------------------------------------------------------------------
// سكريبت تشخيصي فقط (لا يمسح ولا يعدّل أي حاجة). بيوضحلك:
//   1) هل فيه أكتر من حساب في users بيتطابق مع TEACHER_EMAIL (حتى لو
//      بحروف مختلفة)؟ ده لو حصل يفسّر اختفاء الفيديوهات.
//   2) كل الفيديوهات (lessons بتاعة المكتبة العامة، course_id IS NULL)
//      ومين صاحب كل واحد فيها (teacher_id + الإيميل بتاعه لو معروف).
//
// طريقة التشغيل (من مجلد backend):
//   node diagnose-videos.js
// -----------------------------------------------------------------------
require("dotenv").config();
const { Pool } = require("pg");

if (!process.env.DATABASE_URL && !process.env.DB_PASSWORD) {
  throw new Error("Set DATABASE_URL or DB_PASSWORD for PostgreSQL.");
}

const TEACHER_EMAIL = (process.env.TEACHER_EMAIL || "mostafakareem978@gmail.com").trim().toLowerCase();

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

(async () => {
  console.log(`TEACHER_EMAIL (من .env): ${TEACHER_EMAIL}\n`);

  const teacherRows = await pool.query(
    `SELECT id, email, role, provider, created_at FROM users WHERE lower(email)=$1 ORDER BY created_at ASC`,
    [TEACHER_EMAIL]
  );

  console.log(`عدد الحسابات اللي إيميلها (بغض النظر عن حالة الحروف) بيطابق TEACHER_EMAIL: ${teacherRows.rowCount}`);
  teacherRows.rows.forEach((r, i) => {
    console.log(`  [${i + 1}] id=${r.id} | email(الحرفي الفعلي)=${r.email} | role=${r.role} | provider=${r.provider} | created_at=${r.created_at}`);
  });
  if (teacherRows.rowCount > 1) {
    console.log("\n⚠️  فيه أكتر من حساب بنفس الإيميل تقريبًا (بحروف مختلفة) — ده على الأغلب سبب المشكلة.");
  } else if (teacherRows.rowCount === 0) {
    console.log("\n⚠️  مفيش أي حساب بهذا الإيميل خالص في قاعدة البيانات.");
  } else {
    console.log("\n✅ حساب واحد بس مطابق للإيميل — سبب اختفاء الفيديوهات محتمل يكون حاجة تانية غير تعدد الحسابات.");
  }

  const teacherIds = new Set(teacherRows.rows.map((r) => r.id));

  console.log("\n---- كل الفيديوهات في المكتبة العامة (course_id IS NULL) ----");
  const videos = await pool.query(
    `SELECT l.id, l.teacher_id, u.email AS owner_email, l.title, l.status, l.target_grade, l.is_free, l.created_at
     FROM lessons l LEFT JOIN users u ON u.id = l.teacher_id
     WHERE l.course_id IS NULL
     ORDER BY l.created_at DESC`
  );
  console.log(`العدد الكلي: ${videos.rowCount}\n`);
  videos.rows.forEach((v) => {
    const flag = teacherIds.has(v.teacher_id) ? "" : "  ⚠️ صاحبه مش من ضمن حسابات TEACHER_EMAIL أعلاه";
    console.log(`- "${v.title}" | teacher_id=${v.teacher_id} | صاحبه=${v.owner_email || "؟"} | status=${v.status} | grade=${v.target_grade || "الكل"} | free=${v.is_free}${flag}`);
  });

  await pool.end();
})().catch((e) => {
  console.error("فشل التشخيص:", e.message);
  process.exit(1);
});

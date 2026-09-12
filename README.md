# Lurnova / مدرستي

منصة تعليمية React + Vite مع Backend Node/Express وPostgreSQL (Supabase).

## Authentication
- Email + Password محليًا داخل PostgreSQL/Supabase.
- OTP من 6 أرقام عبر Gmail SMTP لتأكيد البريد واستعادة كلمة المرور.
- جلسة HttpOnly JWT Cookie.
- المصادقة داخل Backend وقاعدة البيانات فقط.

## تشغيل محلي
1. ضع متغيرات الـ Backend في `backend/.env`.
2. شغّل `npm install` في الجذر و`npm --prefix backend install` إذا لزم.
3. شغّل `npm run dev`.

## حذف حسابات الطلاب مرة واحدة
ضع في `backend/.env` أو Railway Variables:
`PURGE_NON_TEACHER_USERS_ON_START=true`
ثم شغّل Backend مرة واحدة. سيتم الحفاظ على `TEACHER_EMAIL` فقط، ويجب إرجاع المتغير إلى `false` بعد نجاح العملية.


## Rebuilt local authentication
The project uses its own PostgreSQL `public.users` table through the Node backend. Supabase Auth is not required. The only teacher identity is `mostafakareem978@gmail.com`; every other account is a student. Set `RESET_ALL_STUDENTS_ONCE=true` for the first clean deployment; the database marker makes the cleanup one-time.

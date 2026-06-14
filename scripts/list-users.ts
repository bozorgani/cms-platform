/**
 * 👥 List All Users
 *
 * نمایش همه کاربران موجود در دیتابیس
 *
 * استفاده:
 *   npm run list-users
 */

import 'dotenv/config';
import mongoose from 'mongoose';
import { User } from '../src/lib/db/models/User';

async function main() {
  console.log('\n=== CMS Platform - لیست کاربران ===\n');

  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/cms-platform';
  console.log('[INFO] در حال اتصال به ' + uri.replace(/\/\/[^:]+:[^@]+@/, '//***:***@'));

  try {
    await mongoose.connect(uri);
  } catch (error) {
    console.log('[ERROR] خطا در اتصال: ' + (error as Error).message);
    process.exit(1);
  }

  const users = await User.find().select('email name role createdAt').sort({ role: 1, email: 1 }).lean();

  console.log(`\n[OK] ${users.length} کاربر یافت شد:\n`);

  // جدول زیبا
  console.log('┌────────────────────────────────┬──────────────┬──────────┬────────────────┐');
  console.log('│ ایمیل                          │ نام          │ نقش     │ تاریخ ایجاد     │');
  console.log('├────────────────────────────────┼──────────────┼──────────┼────────────────┤');

  for (const u of users) {
    const email = (u.email || '').padEnd(30);
    const name = ((u.name || 'بدون نام').substring(0, 12)).padEnd(12);
    const role = (u.role || '').padEnd(8);
    const date = u.createdAt ? new Date(u.createdAt).toLocaleDateString('fa-IR') : '-';
    console.log(`│ ${email} │ ${name} │ ${role} │ ${date} │`);
  }

  console.log('└────────────────────────────────┴──────────────┴──────────┴────────────────┘');

  // پیشنهاد بعدی
  console.log('\n💡 برای تغییر رمز کاربر:');
  if (users.length > 0) {
    console.log(`   npm run reset-password -- "${users[0].email}" NewPassword123`);
  }

  await mongoose.disconnect();
}

main().catch((e) => {
  console.log('[ERROR] ' + (e as Error).message);
  process.exit(1);
});

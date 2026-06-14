/**
 * 🔐 Change Admin Email and Password
 *
 * این اسکریپت ایمیل و رمز عبور admin را همزمان تغییر می‌دهد.
 *
 * استفاده:
 *   npm run change-admin -- <old-email> <new-email> <new-password>
 *
 * مثال:
 *   npm run change-admin -- admin@old.com admin@new.com NewPassword123
 */

import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { createInterface } from 'readline';
import { User } from '../src/lib/db/models/User';

const log = {
  info: (m: string) => console.log('[INFO]', m),
  ok: (m: string) => console.log('[OK]', m),
  warn: (m: string) => console.log('[WARN]', m),
  err: (m: string) => console.log('[ERROR]', m),
};

function ask(q: string, hidden = false): Promise<string> {
  return new Promise((resolve) => {
    if (hidden) {
      process.stdout.write(q);
      let input = '';
      process.stdin.on('data', (c) => {
        const s = c.toString();
        if (s === '\n' || s === '\r' || s === '\u0004') {
          process.stdin.removeAllListeners('data');
          process.stdin.pause();
          process.stdout.write('\n');
          resolve(input);
        } else if (s === '\u0003') {
          process.exit(1);
        } else {
          input += s;
          process.stdout.write('*');
        }
      });
      process.stdin.resume();
    } else {
      const rl = createInterface({ input: process.stdin, output: process.stdout });
      rl.question(q, (a) => { rl.close(); resolve(a.trim()); });
    }
  });
}

function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function main() {
  console.log('\n=== CMS Platform - تغییر ایمیل و رمز مدیر ===\n');

  const args = process.argv.slice(2);
  let oldEmail: string, newEmail: string, newPassword: string;

  if (args.length === 0) {
    oldEmail = await ask('ایمیل فعلی: ');
    newEmail = await ask('ایمیل جدید: ');
    if (!validateEmail(newEmail)) {
      log.err('ایمیل جدید نامعتبر');
      process.exit(1);
    }
    newPassword = await ask('رمز عبور جدید (حداقل ۸ کاراکتر): ', true);
    if (newPassword.length < 8) {
      log.err('رمز باید حداقل ۸ کاراکتر باشد');
      process.exit(1);
    }
    const confirm = await ask('تکرار رمز: ', true);
    if (newPassword !== confirm) {
      log.err('رمزها مطابقت ندارند');
      process.exit(1);
    }
  } else if (args.length === 3) {
    [oldEmail, newEmail, newPassword] = args;
    if (!validateEmail(newEmail)) {
      log.err('ایمیل جدید نامعتبر');
      process.exit(1);
    }
    if (newPassword.length < 8) {
      log.err('رمز باید حداقل ۸ کاراکتر باشد');
      process.exit(1);
    }
  } else {
    console.log('استفاده: npm run change-admin -- <old-email> <new-email> <new-password>');
    process.exit(1);
  }

  if (oldEmail === newEmail) {
    log.warn('ایمیل جدید با ایمیل فعلی یکسان است - فقط رمز تغییر می‌کند');
  }

  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/cms-platform';
  log.info('در حال اتصال به ' + uri.replace(/\/\/[^:]+:[^@]+@/, '//***:***@'));
  await mongoose.connect(uri);
  log.ok('متصل شد!');

  const user = await User.findOne({ email: oldEmail.toLowerCase() });
  if (!user) {
    log.err(`کاربر با ایمیل "${oldEmail}" یافت نشد`);
    log.info('کاربران موجود:');
    const all = await User.find({}, { email: 1, name: 1, role: 1 });
    all.forEach((u) => log.info(`  - ${u.email} (${u.name || 'no name'}) [${u.role}]`));
    await mongoose.disconnect();
    process.exit(1);
  }

  log.ok(`کاربر پیدا شد: ${user.email}`);

  if (newEmail !== oldEmail) {
    const existing = await User.findOne({ email: newEmail.toLowerCase() });
    if (existing) {
      log.err(`ایمیل "${newEmail}" قبلاً توسط کاربر دیگری استفاده می‌شود`);
      await mongoose.disconnect();
      process.exit(1);
    }
    user.email = newEmail.toLowerCase();
  }

  user.passwordHash = await bcrypt.hash(newPassword, 10);
  await user.save();
  await mongoose.disconnect();

  log.ok('اطلاعات با موفقیت به‌روزرسانی شد!');
  console.log('\n=== اطلاعات جدید ===');
  console.log('ایمیل قبلی:  ' + oldEmail);
  console.log('ایمیل جدید:  ' + newEmail);
  console.log('رمز جدید:    ' + '*'.repeat(newPassword.length));
  console.log('\nاکنون می‌توانید با ایمیل و رمز جدید وارد شوید.');
}

main().catch((e) => {
  log.err((e as Error).message);
  process.exit(1);
});

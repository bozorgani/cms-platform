/**
 * 🚨 Emergency Password Reset
 *
 * این اسکریپت برای مواقع اضطراری است که ایمیل admin را نمی‌دانید:
 * 1. اول لیست تمام کاربران را نشان می‌دهد
 * 2. سپس اجازه می‌دهد رمز هر کاربر را عوض کنید
 *
 * استفاده:
 *   npm run emergency-reset
 *   npm run emergency-reset -- admin@email.com NewPassword123
 */

import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { createInterface } from 'readline';
import { User } from '../src/lib/db/models/User';

const log = {
  info: (m: string) => console.log('[INFO]', m),
  ok: (m: string) => console.log('[OK]', m),
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

async function listUsers() {
  console.log('\n=== CMS Platform - کاربران موجود ===\n');
  const users = await User.find().select('email name role createdAt').sort({ role: 1, email: 1 }).lean();
  console.log(`تعداد: ${users.length} کاربر\n`);

  if (users.length === 0) {
    console.log('(هیچ کاربری وجود ندارد)');
    return null;
  }

  console.log('┌───┬────────────────────────────────┬──────────────┬──────────┐');
  console.log('│ # │ ایمیل                          │ نام          │ نقش     │');
  console.log('├───┼────────────────────────────────┼──────────────┼──────────┤');

  for (let i = 0; i < users.length; i++) {
    const u = users[i];
    const email = (u.email || '').padEnd(30);
    const name = ((u.name || '-').substring(0, 12)).padEnd(12);
    const role = (u.role || '').padEnd(8);
    console.log(`│ ${String(i + 1).padEnd(1)} │ ${email} │ ${name} │ ${role} │`);
  }

  console.log('└───┴────────────────────────────────┴──────────────┴──────────┘');
  return users;
}

async function main() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/cms-platform';
  console.log('[INFO] در حال اتصال به ' + uri.replace(/\/\/[^:]+:[^@]+@/, '//***:***@'));

  try {
    await mongoose.connect(uri);
  } catch (error) {
    log.err('خطا در اتصال: ' + (error as Error).message);
    process.exit(1);
  }
  log.ok('متصل شد!');

  const args = process.argv.slice(2);
  let email: string, password: string;

  if (args.length === 0) {
    // حالت تعاملی
    const users = await listUsers();

    if (!users || users.length === 0) {
      log.err('هیچ کاربری برای تغییر رمز وجود ندارد');
      log.info('برای ایجاد کاربر جدید: npm run create-user -- email password name role');
      await mongoose.disconnect();
      process.exit(1);
    }

    const choice = await ask('\nشماره کاربر (1-' + users.length + ') یا ایمیل کامل: ');
    
    // اگر شماره وارد شده
    if (/^\d+$/.test(choice)) {
      const idx = parseInt(choice, 10) - 1;
      if (idx < 0 || idx >= users.length) {
        log.err('شماره نامعتبر');
        await mongoose.disconnect();
        process.exit(1);
      }
      email = users[idx].email;
    } else {
      email = choice;
    }

    log.info('کاربر انتخاب شده: ' + email);

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      log.err('کاربر با ایمیل "' + email + '" یافت نشد');
      await mongoose.disconnect();
      process.exit(1);
    }

    password = await ask('رمز عبور جدید (حداقل ۸ کاراکتر): ', true);
    if (password.length < 8) {
      log.err('رمز باید حداقل ۸ کاراکتر باشد');
      await mongoose.disconnect();
      process.exit(1);
    }
    const confirm = await ask('تکرار رمز: ', true);
    if (password !== confirm) {
      log.err('رمزها مطابقت ندارند');
      await mongoose.disconnect();
      process.exit(1);
    }
  } else if (args.length === 2) {
    email = args[0];
    password = args[1];
    if (password.length < 8) {
      log.err('رمز باید حداقل ۸ کاراکتر باشد');
      process.exit(1);
    }
  } else {
    console.log('استفاده:');
    console.log('  npm run emergency-reset');
    console.log('  npm run emergency-reset -- email@domain.com NewPassword123');
    process.exit(1);
  }

  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) {
    log.err('کاربر با ایمیل "' + email + '" یافت نشد');
    await mongoose.disconnect();
    process.exit(1);
  }

  user.passwordHash = await bcrypt.hash(password, 10);
  await user.save();
  await mongoose.disconnect();

  log.ok('رمز عبور با موفقیت تغییر کرد!');
  console.log('\n=== اطلاعات ===');
  console.log('ایمیل:  ' + email);
  console.log('نام:    ' + (user.name || '-'));
  console.log('نقش:    ' + user.role);
  console.log('رمز:    ' + '*'.repeat(password.length));
  console.log('\nاکنون می‌توانید با این رمز وارد شوید.');
}

main().catch((e) => {
  log.err((e as Error).message);
  process.exit(1);
});

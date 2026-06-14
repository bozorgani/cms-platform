import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { createInterface } from 'readline';
import { User } from '../src/lib/db/models/User';
import { USER_ROLES, type UserRole } from '../src/lib/constants';

const log = {
  info: (m: string) => console.log('[INFO]', m),
  ok: (m: string) => console.log('[OK]', m),
  err: (m: string) => console.log('[ERROR]', m),
};

function ask(q: string): Promise<string> {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    rl.question(q, (a) => { rl.close(); resolve(a.trim()); });
  });
}

async function main() {
  console.log('\n=== پلتفرم CMS - ایجاد کاربر ===\n');
  const args = process.argv.slice(2);
  let email: string, password: string, name: string, role: UserRole;

  if (args.length >= 3) {
    email = args[0];
    password = args[1];
    name = args[2] || '';
    role = (args[3] as UserRole) || 'author';
  } else if (args.length === 0) {
    email = await ask('ایمیل: ');
    password = await ask('رمز عبور (حداقل ۸): ');
    if (password.length < 8) { log.err('حداقل ۸ کاراکتر'); process.exit(1); }
    name = await ask('نام: ');
    role = (await ask('Role (' + USER_ROLES.join('/') + ') [author]: ') as UserRole) || 'author';
  } else {
    console.log('استفاده: npm run create-user -- <email> <password> <name> [role]');
    process.exit(1);
  }

  if (!USER_ROLES.includes(role)) { log.err('نقش نامعتبر'); process.exit(1); }

  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/cms-platform';
  log.info('در حال اتصال...');
  await mongoose.connect(uri);
  log.ok('Connected');

  const exists = await User.findOne({ email: email.toLowerCase() });
  if (exists) { log.err('ایمیل قبلاً وجود دارد'); await mongoose.disconnect(); process.exit(1); }

  const passwordHash = await bcrypt.hash(password, 10);
  await User.create({ email: email.toLowerCase(), passwordHash, name, role });
  await mongoose.disconnect();
  log.ok('کاربر ایجاد شد!');
  console.log('\nایمیل:   ' + email);
  console.log('نام:    ' + name);
  console.log('نقش:    ' + role);
}

main().catch((e) => { log.err((e as Error).message); process.exit(1); });

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

async function main() {
  console.log('\n=== CMS Platform - Password Reset ===\n');
  const args = process.argv.slice(2);
  let email: string, password: string;

  if (args.length === 0) {
    email = await ask('Email: ');
    password = await ask('New password (min 8 chars): ', true);
    if (password.length < 8) { log.err('Min 8 chars'); process.exit(1); }
  } else if (args.length === 2) {
    email = args[0];
    password = args[1];
    if (password.length < 8) { log.err('Min 8 chars'); process.exit(1); }
  } else {
    console.log('Usage: npm run reset-password -- <email> <password>');
    process.exit(1);
  }

  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/cms-platform';
  log.info('Connecting to ' + uri.replace(/\/\/[^:]+:[^@]+@/, '//***:***@'));
  await mongoose.connect(uri);
  log.ok('Connected');

  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) { log.err('User not found'); await mongoose.disconnect(); process.exit(1); }

  user.passwordHash = await bcrypt.hash(password, 10);
  await user.save();
  await mongoose.disconnect();
  log.ok('Password reset!');
  console.log('\nEmail:    ' + email);
  console.log('Password: ' + '*'.repeat(password.length));
}

main().catch((e) => { log.err((e as Error).message); process.exit(1); });

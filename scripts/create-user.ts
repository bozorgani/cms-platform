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
  console.log('\n=== CMS Platform - Create User ===\n');
  const args = process.argv.slice(2);
  let email: string, password: string, name: string, role: UserRole;

  if (args.length >= 3) {
    email = args[0];
    password = args[1];
    name = args[2] || '';
    role = (args[3] as UserRole) || 'author';
  } else if (args.length === 0) {
    email = await ask('Email: ');
    password = await ask('Password (min 8): ');
    if (password.length < 8) { log.err('Min 8 chars'); process.exit(1); }
    name = await ask('Name: ');
    role = (await ask('Role (' + USER_ROLES.join('/') + ') [author]: ') as UserRole) || 'author';
  } else {
    console.log('Usage: npm run create-user -- <email> <password> <name> [role]');
    process.exit(1);
  }

  if (!USER_ROLES.includes(role)) { log.err('Invalid role'); process.exit(1); }

  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/cms-platform';
  log.info('Connecting...');
  await mongoose.connect(uri);
  log.ok('Connected');

  const exists = await User.findOne({ email: email.toLowerCase() });
  if (exists) { log.err('Email already exists'); await mongoose.disconnect(); process.exit(1); }

  const passwordHash = await bcrypt.hash(password, 10);
  await User.create({ email: email.toLowerCase(), passwordHash, name, role });
  await mongoose.disconnect();
  log.ok('User created!');
  console.log('\nEmail:   ' + email);
  console.log('Name:    ' + name);
  console.log('Role:    ' + role);
}

main().catch((e) => { log.err((e as Error).message); process.exit(1); });

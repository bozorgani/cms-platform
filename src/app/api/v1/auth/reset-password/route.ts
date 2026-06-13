import { NextRequest, NextResponse } from 'next/server';
import { hash } from 'bcryptjs';
import { connectToDatabase } from '@/lib/db/connection';
import { User } from '@/lib/db/models';
import { notify, getClientIp } from '@/lib/utils';

interface ResetToken {
  email: string;
  expiresAt: number;
  used: boolean;
}

const tokens = new Map<string, ResetToken>();

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  let body: { token?: string; newPassword?: string };
  try { body = await request.json(); } catch {
    return NextResponse.json({ ok: false, error: 'Invalid request' }, { status: 400 });
  }

  const { token, newPassword } = body;
  if (!token || !newPassword) {
    return NextResponse.json({ ok: false, error: 'Token and newPassword required' }, { status: 400 });
  }

  if (newPassword.length < 8) {
    return NextResponse.json({ ok: false, error: 'Password must be at least 8 chars' }, { status: 400 });
  }

  const data = tokens.get(token);
  if (!data) return NextResponse.json({ ok: false, error: 'Invalid or expired token' }, { status: 400 });
  if (data.used) return NextResponse.json({ ok: false, error: 'Token already used' }, { status: 400 });
  if (data.expiresAt < Date.now()) {
    tokens.delete(token);
    return NextResponse.json({ ok: false, error: 'Token expired' }, { status: 400 });
  }

  try { await connectToDatabase(); } catch {
    return NextResponse.json({ ok: false, error: 'DB unavailable' }, { status: 503 });
  }

  const user = await User.findOne({ email: data.email });
  if (!user) return NextResponse.json({ ok: false, error: 'User not found' }, { status: 404 });

  user.passwordHash = await hash(newPassword, 10);
  await user.save();

  data.used = true;
  tokens.set(token, data);
  setTimeout(() => tokens.delete(token), 1000);

  await notify({ type: 'login_success', user: data.email, ip, details: 'Reset completed' });

  return NextResponse.json({ ok: true, message: 'Password reset successfully' });
}

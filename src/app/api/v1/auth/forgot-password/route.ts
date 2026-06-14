import { t } from '@/lib/constants';
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { connectToDatabase } from '@/lib/db/connection';
import { User } from '@/lib/db/models';
import { notify, getClientIp, checkRateLimit } from '@/lib/utils';
import { RATE_LIMITS } from '@/lib/constants';

interface ResetToken {
  email: string;
  expiresAt: number;
  used: boolean;
}

const tokens = new Map<string, ResetToken>();

setInterval(() => {
  const now = Date.now();
  for (const [k, v] of tokens.entries()) if (v.expiresAt < now) tokens.delete(k);
}, 60 * 60 * 1000);

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const rateCheck = checkRateLimit(`reset:${ip}`, {
    maxAttempts: RATE_LIMITS.PASSWORD_RESET.points,
    windowMs: RATE_LIMITS.PASSWORD_RESET.duration * 1000,
    lockoutMs: 60 * 60 * 1000,
  });

  if (!rateCheck.allowed) {
    return NextResponse.json({ ok: false, error: t('auth.tooManyRequests') }, { status: 429 });
  }

  let body: { email?: string };
  try { body = await request.json(); } catch {
    return NextResponse.json({ ok: false, error: t('error.invalidRequest') }, { status: 400 });
  }

  const { email } = body;
  if (!email) {
    return NextResponse.json({ ok: false, error: t('auth.emailRequired') }, { status: 400 });
  }

  try { await connectToDatabase(); } catch {
    return NextResponse.json({ ok: false, error: t('db.unavailable') }, { status: 503 });
  }

  const response = { ok: true, message: t('auth.passwordResetSent') };

  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) return NextResponse.json(response);

  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = Date.now() + 60 * 60 * 1000;
  tokens.set(token, { email: user.email, expiresAt, used: false });

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001';
  const resetLink = `${baseUrl}/reset-password?token=${token}`;

  console.log('\n[PASSWORD RESET]', user.email, '->', resetLink, '\n');
  await notify({ type: 'login_success', user: user.email, ip, details: t('auth.passwordResetRequested') });

  return NextResponse.json({
    ...response,
    ...(process.env.NODE_ENV !== 'production' && { devToken: token, devLink: resetLink }),
  });
}

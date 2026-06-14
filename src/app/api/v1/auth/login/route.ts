import { t } from '@/lib/constants';
import { NextRequest, NextResponse } from 'next/server';
import { compare } from 'bcryptjs';
import { connectToDatabase } from '@/lib/db/connection';
import { User } from '@/lib/db/models';
import { signToken, verifyTOTP, decrypt } from '@/lib/auth';
import { COOKIE_NAMES, RATE_LIMITS } from '@/lib/constants';
import { checkRateLimit, resetRateLimit, getClientIp, notify } from '@/lib/utils';

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const userAgent = request.headers.get('user-agent') || 'unknown';

  try { await connectToDatabase(); } catch {
    return NextResponse.json({ ok: false, error: t('db.unavailable') }, { status: 503 });
  }

  let body: { email?: string; password?: string; totpCode?: string };
  try { body = await request.json(); } catch {
    return NextResponse.json({ ok: false, error: t('error.invalidRequest') }, { status: 400 });
  }

  const { email, password, totpCode } = body;
  if (!email || !password) {
    return NextResponse.json({ ok: false, error: t('auth.emailAndPasswordRequired') }, { status: 400 });
  }

  const rateCheck = checkRateLimit(`login:${ip}:${email.toLowerCase()}`, {
    maxAttempts: RATE_LIMITS.LOGIN.points,
    windowMs: RATE_LIMITS.LOGIN.duration * 1000,
    lockoutMs: 30 * 60 * 1000,
  });

  if (!rateCheck.allowed) {
    await notify({ type: 'login_failed', user: email, ip, userAgent, details: t('auth.rateLimit') });
    return NextResponse.json(
      { ok: false, error: t('auth.tooManyAttempts'), retryAfter: rateCheck.retryAfter },
      { status: 429 }
    );
  }

  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) {
    return NextResponse.json({ ok: false, error: t('auth.invalidCredentials') }, { status: 401 });
  }

  const passwordOk = await compare(password, user.passwordHash);
  if (!passwordOk) {
    await notify({ type: 'login_failed', user: email, ip, userAgent, details: t('auth.invalidCredentials') });
    return NextResponse.json({ ok: false, error: t('auth.invalidCredentials') }, { status: 401 });
  }

  if (user.totpSecret) {
    if (!totpCode) {
      return NextResponse.json({ ok: true, requires2fa: true, message: t('auth.enter2fa') });
    }
    let secret: string;
    try { secret = decrypt(user.totpSecret); } catch {
      return NextResponse.json({ ok: false, error: t('auth.2faError') }, { status: 500 });
    }
    if (!verifyTOTP(secret, totpCode)) {
      return NextResponse.json({ ok: false, error: t('auth.invalid2fa') }, { status: 401 });
    }
  }

  const token = signToken(user);
  const safeUser = {
    _id: user._id.toString(),
    email: user.email,
    name: user.name,
    role: user.role,
  };

  const res = NextResponse.json({ ok: true, user: safeUser, token });

  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: 60 * 60 * 4,
  };

  res.cookies.set(COOKIE_NAMES.AUTH, token, cookieOptions);
  res.cookies.set(COOKIE_NAMES.USER, JSON.stringify(safeUser), { ...cookieOptions, httpOnly: false });

  resetRateLimit(`login:${ip}:${email.toLowerCase()}`);
  await notify({
    type: 'login_success',
    user: email,
    ip,
    userAgent,
    details: user.totpSecret ? 'with 2FA' : 'no 2FA',
  });

  return res;
}

import { t } from '@/lib/constants';
import { NextRequest, NextResponse } from 'next/server';
import { COOKIE_NAMES } from '@/lib/constants';
import { notify, getClientIp } from '@/lib/utils';

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const userCookie = request.cookies.get(COOKIE_NAMES.USER)?.value;
  let email = 'unknown';
  if (userCookie) {
    try {
      const u = JSON.parse(userCookie);
      email = u.email || 'unknown';
    } catch { /* ignore */ }
  }

  const res = NextResponse.json({ ok: true });

  const clearOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: 0,
  };
  res.cookies.set(COOKIE_NAMES.AUTH, '', clearOptions);
  res.cookies.set(COOKIE_NAMES.USER, '', { ...clearOptions, httpOnly: false });
  res.cookies.set(COOKIE_NAMES.TOTP, '', clearOptions);

  await notify({ type: 'login_success', user: email, ip, details: t('auth.loggedOut') });
  return res;
}

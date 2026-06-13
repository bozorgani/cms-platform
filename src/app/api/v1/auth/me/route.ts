import { NextRequest, NextResponse } from 'next/server';
import { COOKIE_NAMES } from '@/lib/constants';

export async function GET(request: NextRequest) {
  const token = request.cookies.get(COOKIE_NAMES.AUTH)?.value;
  const userCookie = request.cookies.get(COOKIE_NAMES.USER)?.value;

  if (!token) {
    return NextResponse.json({ ok: false, error: 'Not authenticated' }, { status: 401 });
  }

  let user = null;
  if (userCookie) {
    try { user = JSON.parse(userCookie); } catch { /* ignore */ }
  }

  return NextResponse.json({ ok: true, user });
}

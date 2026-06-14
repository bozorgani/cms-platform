import { NextRequest, NextResponse } from 'next/server';
import { hash } from 'bcryptjs';
import { connectToDatabase } from '@/lib/db/connection';
import { User } from '@/lib/db/models';
import { requireAuth } from '@/lib/auth';
import { t } from '@/lib/constants';

export async function GET(request: NextRequest) {
  const auth = requireAuth(request);
  if (!auth) {
    return NextResponse.json({ ok: false, error: t('auth.notAuthenticated') }, { status: 401 });
  }

  const user = await User.findById(auth.user._id).select('-passwordHash -totpSecret -backupCodes').lean();
  if (!user) {
    return NextResponse.json({ ok: false, error: t('user.notFound') }, { status: 404 });
  }

  return NextResponse.json({
    ok: true,
    user: {
      _id: user._id,
      email: user.email,
      name: user.name,
      role: user.role,
      createdAt: user.createdAt,
    },
  });
}

export async function PATCH(request: NextRequest) {
  const auth = requireAuth(request);
  if (!auth) {
    return NextResponse.json({ ok: false, error: t('auth.notAuthenticated') }, { status: 401 });
  }

  let body: { email?: string; password?: string; name?: string };
  try { body = await request.json(); } catch {
    return NextResponse.json({ ok: false, error: t('error.invalidRequest') }, { status: 400 });
  }

  try { await connectToDatabase(); } catch {
    return NextResponse.json({ ok: false, error: t('db.unavailable') }, { status: 503 });
  }

  const user = await User.findById(auth.user._id);
  if (!user) {
    return NextResponse.json({ ok: false, error: t('user.notFound') }, { status: 404 });
  }

  // تغییر ایمیل
  if (body.email && body.email !== user.email) {
    const exists = await User.findOne({ email: body.email.toLowerCase() });
    if (exists) {
      return NextResponse.json({ ok: false, error: t('user.emailExists') }, { status: 409 });
    }
    user.email = body.email.toLowerCase();
  }

  // تغییر نام
  if (body.name !== undefined) {
    user.name = body.name;
  }

  // تغییر رمز عبور
  if (body.password) {
    if (body.password.length < 8) {
      return NextResponse.json({ ok: false, error: t('auth.passwordMinLength') }, { status: 400 });
    }
    user.passwordHash = await hash(body.password, 10);
  }

  await user.save();

  return NextResponse.json({
    ok: true,
    message: 'اطلاعات با موفقیت به‌روزرسانی شد',
    user: {
      _id: user._id,
      email: user.email,
      name: user.name,
      role: user.role,
    },
  });
}

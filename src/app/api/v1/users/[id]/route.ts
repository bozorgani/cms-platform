import { t } from '@/lib/constants';
import { NextRequest, NextResponse } from 'next/server';
import { hash } from 'bcryptjs';
import { connectToDatabase } from '@/lib/db/connection';
import { User } from '@/lib/db/models';
import { requireRole } from '@/lib/auth';
import { USER_ROLES } from '@/lib/constants';

export async function GET(request: NextRequest, context: { params: { id: string } }) {
  const auth = requireRole(request, ['admin']);
  if (!auth) return NextResponse.json({ ok: false, error: t('error.forbidden') }, { status: 403 });

  try { await connectToDatabase(); } catch {
    return NextResponse.json({ ok: false, error: t('db.unavailable') }, { status: 503 });
  }

  const user = await User.findById(context.params.id).select('-passwordHash -totpSecret -backupCodes').lean();
  if (!user) return NextResponse.json({ ok: false, error: t('resource.notFound') }, { status: 404 });
  return NextResponse.json({ ok: true, user });
}

export async function PATCH(request: NextRequest, context: { params: { id: string } }) {
  const auth = requireRole(request, ['admin']);
  if (!auth) return NextResponse.json({ ok: false, error: t('error.forbidden') }, { status: 403 });

  try { await connectToDatabase(); } catch {
    return NextResponse.json({ ok: false, error: t('db.unavailable') }, { status: 503 });
  }

  const body = await request.json();
  const target = await User.findById(context.params.id);
  if (!target) return NextResponse.json({ ok: false, error: t('resource.notFound') }, { status: 404 });

  if (body.name !== undefined) target.name = body.name;
  if (body.role !== undefined) {
    if (!USER_ROLES.includes(body.role)) {
      return NextResponse.json({ ok: false, error: t('auth.invalidRole') }, { status: 400 });
    }
    target.role = body.role;
  }
  if (body.password) {
    target.passwordHash = await hash(body.password, 10);
  }
  await target.save();

  return NextResponse.json({ ok: true, user: { id: target._id, email: target.email, name: target.name, role: target.role } });
}

export async function DELETE(request: NextRequest, context: { params: { id: string } }) {
  const auth = requireRole(request, ['admin']);
  if (!auth) return NextResponse.json({ ok: false, error: t('error.forbidden') }, { status: 403 });

  if (auth.user._id === context.params.id) {
    return NextResponse.json({ ok: false, error: t('auth.cannotDeleteSelf') }, { status: 400 });
  }

  try { await connectToDatabase(); } catch {
    return NextResponse.json({ ok: false, error: t('db.unavailable') }, { status: 503 });
  }

  const deleted = await User.findByIdAndDelete(context.params.id).lean();
  if (!deleted) return NextResponse.json({ ok: false, error: t('resource.notFound') }, { status: 404 });
  return NextResponse.json({ ok: true });
}

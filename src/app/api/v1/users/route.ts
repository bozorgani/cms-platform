import { NextRequest, NextResponse } from 'next/server';
import { hash } from 'bcryptjs';
import { connectToDatabase } from '@/lib/db/connection';
import { User } from '@/lib/db/models';
import { requireRole } from '@/lib/auth';
import { USER_ROLES } from '@/lib/constants';

export async function GET(request: NextRequest) {
  const auth = requireRole(request, ['admin']);
  if (!auth) return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });

  try { await connectToDatabase(); } catch {
    return NextResponse.json({ ok: false, error: 'DB unavailable' }, { status: 503 });
  }

  const users = await User.find().select('-passwordHash -totpSecret -backupCodes').sort({ createdAt: -1 }).lean();
  return NextResponse.json({ ok: true, items: users, total: users.length });
}

export async function POST(request: NextRequest) {
  const auth = requireRole(request, ['admin']);
  if (!auth) return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });

  try { await connectToDatabase(); } catch {
    return NextResponse.json({ ok: false, error: 'DB unavailable' }, { status: 503 });
  }

  const body = await request.json();
  if (!body.email || !body.password) {
    return NextResponse.json({ ok: false, error: 'Email and password required' }, { status: 400 });
  }

  if (body.role && !USER_ROLES.includes(body.role)) {
    return NextResponse.json({ ok: false, error: 'Invalid role' }, { status: 400 });
  }

  const exists = await User.findOne({ email: body.email.toLowerCase() });
  if (exists) return NextResponse.json({ ok: false, error: 'Email already used' }, { status: 409 });

  const passwordHash = await hash(body.password, 10);
  const created = await User.create({
    email: body.email.toLowerCase(),
    passwordHash,
    name: body.name,
    role: body.role || 'author',
  });

  return NextResponse.json({ ok: true, user: { id: created._id, email: created.email, role: created.role } }, { status: 201 });
}

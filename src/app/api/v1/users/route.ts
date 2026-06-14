import { NextRequest, NextResponse } from 'next/server';
import { hash } from 'bcryptjs';
import { connectToDatabase } from '@/lib/db/connection';
import { User } from '@/lib/db/models';
import { requireRole } from '@/lib/auth';
import { USER_ROLES } from '@/lib/constants';
import { t } from '@/lib/constants';

/**
 * GET /api/v1/users
 * Query params:
 *   - page: شماره صفحه (default: 1)
 *   - limit: تعداد در صفحه (default: 20, max: 100)
 *   - role: فیلتر بر اساس نقش (admin, editor, author, seo, viewer)
 *   - search: جستجو در ایمیل یا نام
 *   - sort: مرتب‌سازی (createdAt, email, name)
 *   - order: asc/desc (default: desc)
 *
 * فقط admin دسترسی دارد.
 */
export async function GET(request: NextRequest) {
  const auth = requireRole(request, ['admin']);
  if (!auth) {
    return NextResponse.json({ ok: false, error: t('error.forbidden') }, { status: 403 });
  }

  try {
    await connectToDatabase();
  } catch {
    return NextResponse.json({ ok: false, error: t('db.unavailable') }, { status: 503 });
  }

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')));
  const roleFilter = searchParams.get('role');
  const search = searchParams.get('search')?.trim();
  const sortField = searchParams.get('sort') || 'createdAt';
  const sortOrder = searchParams.get('order') === 'asc' ? 1 : -1;

  // ساخت query
  const filter: Record<string, unknown> = {};
  if (roleFilter && USER_ROLES.includes(roleFilter as any)) {
    filter.role = roleFilter;
  }
  if (search) {
    filter.$or = [
      { email: { $regex: search, $options: 'i' } },
      { name: { $regex: search, $options: 'i' } },
    ];
  }

  // تعیین sort field
  const sortOptions: Record<string, string> = {
    createdAt: 'createdAt',
    email: 'email',
    name: 'name',
    role: 'role',
  };
  const sortKey = sortOptions[sortField] || 'createdAt';
  const sortObj: Record<string, 1 | -1> = { [sortKey]: sortOrder };

  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    User.find(filter)
      .select('-passwordHash -totpSecret -backupCodes')
      .sort(sortObj)
      .skip(skip)
      .limit(limit)
      .lean(),
    User.countDocuments(filter),
  ]);

  return NextResponse.json({
    ok: true,
    items,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  });
}

/**
 * POST /api/v1/users
 * Body: { email, password, name?, role? }
 * فقط admin می‌تواند کاربر جدید ایجاد کند.
 */
export async function POST(request: NextRequest) {
  const auth = requireRole(request, ['admin']);
  if (!auth) {
    return NextResponse.json({ ok: false, error: t('error.forbidden') }, { status: 403 });
  }

  try {
    await connectToDatabase();
  } catch {
    return NextResponse.json({ ok: false, error: t('db.unavailable') }, { status: 503 });
  }

  let body: { email?: string; password?: string; name?: string; role?: string };
  try { body = await request.json(); } catch {
    return NextResponse.json({ ok: false, error: t('error.invalidRequest') }, { status: 400 });
  }

  if (!body.email || !body.password) {
    return NextResponse.json({ ok: false, error: t('auth.emailAndPasswordRequired') }, { status: 400 });
  }

  if (body.password.length < 8) {
    return NextResponse.json({ ok: false, error: t('auth.passwordMinLength') }, { status: 400 });
  }

  if (body.role && !USER_ROLES.includes(body.role as any)) {
    return NextResponse.json({ ok: false, error: t('auth.invalidRole') }, { status: 400 });
  }

  const emailLower = body.email.toLowerCase();
  const exists = await User.findOne({ email: emailLower });
  if (exists) {
    return NextResponse.json({ ok: false, error: t('user.emailExists') }, { status: 409 });
  }

  const passwordHash = await hash(body.password, 10);
  const created = await User.create({
    email: emailLower,
    passwordHash,
    name: body.name,
    role: body.role || 'author',
  });

  return NextResponse.json({
    ok: true,
    message: 'کاربر با موفقیت ایجاد شد',
    user: {
      _id: created._id.toString(),
      email: created.email,
      name: created.name,
      role: created.role,
      createdAt: created.createdAt,
    },
  }, { status: 201 });
}

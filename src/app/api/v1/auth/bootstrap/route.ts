import { NextRequest, NextResponse } from 'next/server';
import { hash } from 'bcryptjs';
import { z } from 'zod';
import { connectToDatabase } from '@/lib/db/connection';
import { User } from '@/lib/db/models';
import { t } from '@/lib/constants';

/**
 * 🚨 Bootstrap Endpoint - ایجاد اولین Admin
 *
 * این endpoint فقط در دو شرط کار می‌کند:
 * 1. هیچ کاربری در دیتابیس وجود نداشته باشد (سیستم خالی)
 * 2. یا CMS_BOOTSTRAP_SECRET در env vars تنظیم شده باشد
 *
 * بعد از ایجاد اولین admin، این endpoint غیرفعال می‌شود.
 *
 * استفاده:
 *   curl -X POST https://your-domain.com/api/v1/auth/bootstrap \
 *     -H "Content-Type: application/json" \
 *     -H "X-Bootstrap-Secret: YOUR_SECRET" \
 *     -d '{"email":"admin@example.com","password":"StrongPass123","name":"Admin"}'
 *
 * ⚠️ حتماً بعد از اولین استفاده، CMS_BOOTSTRAP_SECRET را از env vars حذف کنید.
 */

const bootstrapSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().optional(),
  role: z.enum(['admin', 'editor', 'author', 'seo', 'viewer']).default('admin'),
});

export async function POST(request: NextRequest): Promise<NextResponse> {
  // ۱. بررسی secret (اگر تنظیم شده باشد)
  const bootstrapSecret = process.env.CMS_BOOTSTRAP_SECRET;
  const providedSecret = request.headers.get('x-bootstrap-secret');

  if (bootstrapSecret) {
    if (!providedSecret || providedSecret !== bootstrapSecret) {
      return NextResponse.json(
        { ok: false, error: 'Invalid bootstrap secret' },
        { status: 403 }
      );
    }
  }

  // ۲. بررسی body
  let body;
  try { body = await request.json(); } catch {
    return NextResponse.json({ ok: false, error: t('error.invalidRequest') }, { status: 400 });
  }

  const parse = bootstrapSchema.safeParse(body);
  if (!parse.success) {
    return NextResponse.json(
      {
        ok: false,
        error: parse.error.errors[0]?.message || t('error.invalidRequest'),
      },
      { status: 400 }
    );
  }

  // ۳. اتصال به دیتابیس
  try {
    await connectToDatabase();
  } catch {
    return NextResponse.json({ ok: false, error: t('db.unavailable') }, { status: 503 });
  }

  // ۴. بررسی - آیا کاربری وجود دارد؟
  const existingCount = await User.countDocuments();
  if (existingCount > 0 && !bootstrapSecret) {
    return NextResponse.json(
      {
        ok: false,
        error: 'Bootstrap only works on empty database or with secret',
      },
      { status: 403 }
    );
  }

  // ۵. بررسی - آیا ایمیل تکراری است؟
  const existing = await User.findOne({ email: parse.data.email.toLowerCase() });
  if (existing) {
    return NextResponse.json({ ok: false, error: t('user.emailExists') }, { status: 409 });
  }

  // ۶. ایجاد کاربر
  const passwordHash = await hash(parse.data.password, 10);
  const user = await User.create({
    email: parse.data.email.toLowerCase(),
    passwordHash,
    name: parse.data.name,
    role: parse.data.role,
  });

  return NextResponse.json(
    {
      ok: true,
      message: 'Admin created successfully',
      user: {
        _id: user._id.toString(),
        email: user.email,
        name: user.name,
        role: user.role,
      },
      warning: bootstrapSecret
        ? null
        : 'No CMS_BOOTSTRAP_SECRET set. This endpoint is now DISABLED for future requests.',
    },
    { status: 201 }
  );
}

export async function GET(): Promise<NextResponse> {
  // فقط بررسی وضعیت
  const hasSecret = !!process.env.CMS_BOOTSTRAP_SECRET;
  let isEmpty = false;

  try {
    await connectToDatabase();
    const count = await User.countDocuments();
    isEmpty = count === 0;
  } catch {
    /* ignore */
  }

  return NextResponse.json({
    ok: true,
    available: hasSecret || isEmpty,
    reason: hasSecret
      ? 'Secret configured - endpoint active'
      : isEmpty
      ? 'Database is empty - first admin can be created'
      : 'Database has users and no secret - endpoint disabled',
  });
}

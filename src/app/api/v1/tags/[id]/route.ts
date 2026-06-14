import { t } from '@/lib/constants';
import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db/connection';
import { Tag } from '@/lib/db/models';
import { generateSlug } from '@/lib/utils';
import { requireAuth } from '@/lib/auth';

export async function GET(_req: NextRequest, context: { params: { id: string } }) {
  try { await connectToDatabase(); } catch {
    return NextResponse.json({ ok: false, error: t('db.unavailable') }, { status: 503 });
  }
  const tag = await Tag.findById(context.params.id).lean();
  if (!tag) return NextResponse.json({ ok: false, error: t('resource.notFound') }, { status: 404 });
  return NextResponse.json({ ok: true, tag });
}

export async function PATCH(request: NextRequest, context: { params: { id: string } }) {
  const auth = requireAuth(request);
  if (!auth) return NextResponse.json({ ok: false, error: t('error.unauthorized') }, { status: 401 });
  try { await connectToDatabase(); } catch {
    return NextResponse.json({ ok: false, error: t('db.unavailable') }, { status: 503 });
  }
  const body = await request.json();
  if (body.name && !body.slug) body.slug = generateSlug(body.name);
  const updated = await Tag.findByIdAndUpdate(context.params.id, body, { new: true }).lean();
  if (!updated) return NextResponse.json({ ok: false, error: t('resource.notFound') }, { status: 404 });
  return NextResponse.json({ ok: true, tag: updated });
}

export async function DELETE(_req: NextRequest, context: { params: { id: string } }) {
  const auth = requireAuth(_req);
  if (!auth) return NextResponse.json({ ok: false, error: t('error.unauthorized') }, { status: 401 });
  try { await connectToDatabase(); } catch {
    return NextResponse.json({ ok: false, error: t('db.unavailable') }, { status: 503 });
  }
  const deleted = await Tag.findByIdAndDelete(context.params.id).lean();
  if (!deleted) return NextResponse.json({ ok: false, error: t('resource.notFound') }, { status: 404 });
  return NextResponse.json({ ok: true });
}

import { t } from '@/lib/constants';
import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db/connection';
import { Post } from '@/lib/db/models';
import { requireAuth } from '@/lib/auth';
import { withPostSeoData } from '@/lib/api/seo';

export async function GET(request: NextRequest, context: { params: { id: string } }) {
  try { await connectToDatabase(); } catch {
    return NextResponse.json({ ok: false, error: t('db.unavailable') }, { status: 503 });
  }

  const post = await Post.findById(context.params.id)
    .populate('tags', 'name slug')
    .populate('categoryId', 'name slug')
    .populate('categoryIds', 'name slug')
    .populate('coverImageId', 'path url alt caption width height mime size')
    .populate('seo.ogImageId', 'path url alt caption width height mime size')
    .lean();

  if (!post) return NextResponse.json({ ok: false, error: t('resource.notFound') }, { status: 404 });
  return NextResponse.json({ ok: true, post: withPostSeoData(post) });
}

export async function PATCH(request: NextRequest, context: { params: { id: string } }) {
  const auth = requireAuth(request);
  if (!auth) {
    return NextResponse.json({ ok: false, error: t('error.unauthorized') }, { status: 401 });
  }

  try { await connectToDatabase(); } catch {
    return NextResponse.json({ ok: false, error: t('db.unavailable') }, { status: 503 });
  }

  const body = await request.json();
  const updated = await Post.findByIdAndUpdate(context.params.id, body, { new: true }).lean();
  if (!updated) return NextResponse.json({ ok: false, error: t('resource.notFound') }, { status: 404 });
  return NextResponse.json({ ok: true, post: updated });
}

export async function DELETE(request: NextRequest, context: { params: { id: string } }) {
  const auth = requireAuth(request);
  if (!auth) {
    return NextResponse.json({ ok: false, error: t('error.unauthorized') }, { status: 401 });
  }

  try { await connectToDatabase(); } catch {
    return NextResponse.json({ ok: false, error: t('db.unavailable') }, { status: 503 });
  }

  const deleted = await Post.findByIdAndDelete(context.params.id).lean();
  if (!deleted) return NextResponse.json({ ok: false, error: t('resource.notFound') }, { status: 404 });
  return NextResponse.json({ ok: true });
}

import { t } from '@/lib/constants';
import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db/connection';
import { Post } from '@/lib/db/models';
import { generateSlug } from '@/lib/utils';
import { requireAuth } from '@/lib/auth';
import { withPostSeoData } from '@/lib/api/seo';

export async function GET(request: NextRequest) {
  try { await connectToDatabase(); } catch {
    return NextResponse.json({ ok: false, error: t('db.unavailable') }, { status: 503 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status') || 'published';
  const page = parseInt(searchParams.get('page') || '1');
  const limit = Math.min(100, parseInt(searchParams.get('limit') || '10'));
  const search = searchParams.get('search') || '';

  const filter: Record<string, unknown> = {};
  if (status !== 'all') filter.status = status;
  if (search) {
    filter.$or = [
      { title: { $regex: search, $options: 'i' } },
      { excerpt: { $regex: search, $options: 'i' } },
    ];
  }

  const items = await Post.find(filter)
    .populate('tags', 'name slug')
    .populate('categoryId', 'name slug')
    .populate('categoryIds', 'name slug')
    .populate('coverImageId', 'path url alt caption width height mime size')
    .populate('seo.ogImageId', 'path url alt caption width height mime size')
    .sort({ publishAt: -1, createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .lean();
  const total = await Post.countDocuments(filter);

  return NextResponse.json({ ok: true, items: items.map((post) => withPostSeoData(post)), total, page, limit });
}

export async function POST(request: NextRequest) {
  const auth = requireAuth(request);
  if (!auth) {
    return NextResponse.json({ ok: false, error: t('error.unauthorized') }, { status: 401 });
  }

  try { await connectToDatabase(); } catch {
    return NextResponse.json({ ok: false, error: t('db.unavailable') }, { status: 503 });
  }

  const body = await request.json();
  const slug = body.slug || generateSlug(body.title || '');
  const created = await Post.create({ ...body, slug });
  return NextResponse.json({ ok: true, post: created }, { status: 201 });
}

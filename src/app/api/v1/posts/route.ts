import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db/connection';
import { Post } from '@/lib/db/models';
import { generateSlug } from '@/lib/utils';
import { requireAuth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try { await connectToDatabase(); } catch {
    return NextResponse.json({ ok: false, error: 'DB unavailable' }, { status: 503 });
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
    .populate('coverImageId', 'path alt')
    .sort({ publishAt: -1, createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .lean();
  const total = await Post.countDocuments(filter);

  return NextResponse.json({ ok: true, items, total, page, limit });
}

export async function POST(request: NextRequest) {
  const auth = requireAuth(request);
  if (!auth) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  try { await connectToDatabase(); } catch {
    return NextResponse.json({ ok: false, error: 'DB unavailable' }, { status: 503 });
  }

  const body = await request.json();
  const slug = body.slug || generateSlug(body.title || '');
  const created = await Post.create({ ...body, slug });
  return NextResponse.json({ ok: true, post: created }, { status: 201 });
}

import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db/connection';
import { Post } from '@/lib/db/models';

export async function GET(
  request: NextRequest,
  context: { params: { slug: string } }
) {
  try {
    await connectToDatabase();
  } catch {
    return NextResponse.json({ ok: false, error: 'Database unavailable' }, { status: 503 });
  }

  const post = await Post.findOne({
    slug: context.params.slug,
    status: 'published',
  })
    .populate('tags', 'name slug')
    .populate('categoryId', 'name slug')
    .populate('categoryIds', 'name slug')
    .populate('coverImageId', 'path alt')
    .populate('seo.ogImageId', 'path alt')
    .lean();

  if (!post) {
    return NextResponse.json({ ok: false, error: 'Post not found' }, { status: 404 });
  }

  // Increment views (best-effort)
  Post.updateOne({ _id: post._id }, { $inc: { views: 1 } }).catch(() => {});

  return NextResponse.json({ ok: true, post });
}

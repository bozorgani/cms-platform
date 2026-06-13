import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db/connection';
import { Media } from '@/lib/db/models';
import { requireAuth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try { await connectToDatabase(); } catch {
    return NextResponse.json({ ok: false, error: 'DB unavailable' }, { status: 503 });
  }

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1');
  const limit = Math.min(100, parseInt(searchParams.get('limit') || '20'));

  const items = await Media.find()
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .lean();
  const total = await Media.countDocuments();

  return NextResponse.json({ ok: true, items, total, page, limit });
}

export async function POST(request: NextRequest) {
  const auth = requireAuth(request);
  if (!auth) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

  try { await connectToDatabase(); } catch {
    return NextResponse.json({ ok: false, error: 'DB unavailable' }, { status: 503 });
  }

  // For Next.js API routes, FormData is supported natively
  const formData = await request.formData();
  const file = formData.get('file') as File | null;
  if (!file) {
    return NextResponse.json({ ok: false, error: 'No file uploaded' }, { status: 400 });
  }

  const alt = (formData.get('alt') as string) || '';
  const caption = (formData.get('caption') as string) || '';

  // For simplicity, store as data URL or upload to a service
  // In production, use S3/Cloudinary/ImageKit here
  const buffer = Buffer.from(await file.arrayBuffer());
  const dataUrl = `data:${file.type};base64,${buffer.toString('base64')}`;

  const created = await Media.create({
    path: dataUrl,
    alt,
    caption,
    mime: file.type,
    size: file.size,
  });

  return NextResponse.json({ ok: true, media: created }, { status: 201 });
}

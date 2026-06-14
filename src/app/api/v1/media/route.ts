import { t } from '@/lib/constants';
import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db/connection';
import { Media } from '@/lib/db/models';
import { requireAuth } from '@/lib/auth';
import { uploadMediaFileToBlob, validateMediaFile } from '@/lib/media/storage';

export async function GET(request: NextRequest) {
  try { await connectToDatabase(); } catch {
    return NextResponse.json({ ok: false, error: t('db.unavailable') }, { status: 503 });
  }

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')));

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
  if (!auth) return NextResponse.json({ ok: false, error: t('error.unauthorized') }, { status: 401 });

  try { await connectToDatabase(); } catch {
    return NextResponse.json({ ok: false, error: t('db.unavailable') }, { status: 503 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ ok: false, error: t('error.invalidRequest') }, { status: 400 });
  }

  const file = formData.get('file') as File | null;
  if (!file) {
    return NextResponse.json({ ok: false, error: t('media.noFile') }, { status: 400 });
  }

  const validationError = validateMediaFile(file);
  if (validationError) {
    return NextResponse.json({ ok: false, error: validationError }, { status: 400 });
  }

  const alt = (formData.get('alt') as string) || file.name;
  const caption = (formData.get('caption') as string) || '';

  try {
    const blob = await uploadMediaFileToBlob(file);

    const created = await Media.create({
      path: blob.url,
      url: blob.url,
      blobPathname: blob.pathname,
      alt,
      caption,
      mime: blob.contentType,
      size: blob.size,
    });

    return NextResponse.json({ ok: true, media: created }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: (error as Error).message || t('media.uploadFailed') },
      { status: 500 }
    );
  }
}

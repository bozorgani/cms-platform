import { t } from '@/lib/constants';
import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db/connection';
import { Media } from '@/lib/db/models';
import { requireAuth } from '@/lib/auth';
import { deleteMediaBlob, uploadMediaFileToBlob, validateMediaFile } from '@/lib/media/storage';

export async function GET(_req: NextRequest, context: { params: { id: string } }) {
  try { await connectToDatabase(); } catch {
    return NextResponse.json({ ok: false, error: t('db.unavailable') }, { status: 503 });
  }
  const media = await Media.findById(context.params.id).lean();
  if (!media) return NextResponse.json({ ok: false, error: t('resource.notFound') }, { status: 404 });
  return NextResponse.json({ ok: true, media });
}

export async function PATCH(request: NextRequest, context: { params: { id: string } }) {
  const auth = requireAuth(request);
  if (!auth) return NextResponse.json({ ok: false, error: t('error.unauthorized') }, { status: 401 });

  try { await connectToDatabase(); } catch {
    return NextResponse.json({ ok: false, error: t('db.unavailable') }, { status: 503 });
  }

  let body: { alt?: string; caption?: string };
  try { body = await request.json(); } catch {
    return NextResponse.json({ ok: false, error: t('error.invalidRequest') }, { status: 400 });
  }

  const updates: Record<string, string> = {};
  if (body.alt !== undefined) updates.alt = body.alt;
  if (body.caption !== undefined) updates.caption = body.caption;

  const updated = await Media.findByIdAndUpdate(context.params.id, updates, { new: true }).lean();
  if (!updated) return NextResponse.json({ ok: false, error: t('resource.notFound') }, { status: 404 });

  return NextResponse.json({ ok: true, media: updated });
}

export async function PUT(request: NextRequest, context: { params: { id: string } }) {
  const auth = requireAuth(request);
  if (!auth) return NextResponse.json({ ok: false, error: t('error.unauthorized') }, { status: 401 });

  try { await connectToDatabase(); } catch {
    return NextResponse.json({ ok: false, error: t('db.unavailable') }, { status: 503 });
  }

  const existing = await Media.findById(context.params.id);
  if (!existing) return NextResponse.json({ ok: false, error: t('resource.notFound') }, { status: 404 });

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ ok: false, error: t('error.invalidRequest') }, { status: 400 });
  }

  const file = formData.get('file') as File | null;
  if (!file) return NextResponse.json({ ok: false, error: t('media.noFile') }, { status: 400 });

  const validationError = validateMediaFile(file);
  if (validationError) return NextResponse.json({ ok: false, error: validationError }, { status: 400 });

  const oldMedia = {
    url: existing.url,
    path: existing.path,
    blobPathname: existing.blobPathname,
  };

  try {
    const blob = await uploadMediaFileToBlob(file);

    existing.path = blob.url;
    existing.url = blob.url;
    existing.blobPathname = blob.pathname;
    existing.mime = blob.contentType;
    existing.size = blob.size;
    existing.alt = (formData.get('alt') as string) || existing.alt || file.name;
    existing.caption = (formData.get('caption') as string) || existing.caption || '';

    await existing.save();

    // Best-effort cleanup after DB update, so a failed cleanup does not lose the new upload.
    deleteMediaBlob(oldMedia).catch(() => {});

    return NextResponse.json({ ok: true, media: existing });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: (error as Error).message || t('media.uploadFailed') },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, context: { params: { id: string } }) {
  const auth = requireAuth(request);
  if (!auth) return NextResponse.json({ ok: false, error: t('error.unauthorized') }, { status: 401 });
  try { await connectToDatabase(); } catch {
    return NextResponse.json({ ok: false, error: t('db.unavailable') }, { status: 503 });
  }

  const media = await Media.findById(context.params.id);
  if (!media) return NextResponse.json({ ok: false, error: t('resource.notFound') }, { status: 404 });

  try {
    await deleteMediaBlob({ url: media.url, path: media.path, blobPathname: media.blobPathname });
  } catch {
    // Keep deletion resilient: if Blob cleanup fails, still remove the DB record.
    // Orphan Blob files can be cleaned up later from Vercel dashboard/scripts.
  }

  await media.deleteOne();
  return NextResponse.json({ ok: true });
}

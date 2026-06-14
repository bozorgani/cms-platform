import { t } from '@/lib/constants';
import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db/connection';
import { Media } from '@/lib/db/models';
import { requireAuth } from '@/lib/auth';

export async function GET(_req: NextRequest, context: { params: { id: string } }) {
  try { await connectToDatabase(); } catch {
    return NextResponse.json({ ok: false, error: t('db.unavailable') }, { status: 503 });
  }
  const media = await Media.findById(context.params.id).lean();
  if (!media) return NextResponse.json({ ok: false, error: t('resource.notFound') }, { status: 404 });
  return NextResponse.json({ ok: true, media });
}

export async function DELETE(request: NextRequest, context: { params: { id: string } }) {
  const auth = requireAuth(request);
  if (!auth) return NextResponse.json({ ok: false, error: t('error.unauthorized') }, { status: 401 });
  try { await connectToDatabase(); } catch {
    return NextResponse.json({ ok: false, error: t('db.unavailable') }, { status: 503 });
  }
  const deleted = await Media.findByIdAndDelete(context.params.id).lean();
  if (!deleted) return NextResponse.json({ ok: false, error: t('resource.notFound') }, { status: 404 });
  return NextResponse.json({ ok: true });
}

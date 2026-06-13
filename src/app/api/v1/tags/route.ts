import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db/connection';
import { Tag } from '@/lib/db/models';
import { generateSlug } from '@/lib/utils';
import { requireAuth } from '@/lib/auth';

export async function GET() {
  try { await connectToDatabase(); } catch {
    return NextResponse.json({ ok: false, error: 'DB unavailable' }, { status: 503 });
  }

  const items = await Tag.find().sort({ name: 1 }).lean();
  return NextResponse.json({ ok: true, items });
}

export async function POST(request: NextRequest) {
  const auth = requireAuth(request);
  if (!auth) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

  try { await connectToDatabase(); } catch {
    return NextResponse.json({ ok: false, error: 'DB unavailable' }, { status: 503 });
  }

  const body = await request.json();
  const slug = body.slug || generateSlug(body.name || '');
  const created = await Tag.create({ ...body, slug });
  return NextResponse.json({ ok: true, tag: created }, { status: 201 });
}

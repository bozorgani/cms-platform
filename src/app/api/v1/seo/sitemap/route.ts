import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db/connection';
import { Post } from '@/lib/db/models';
import { t } from '@/lib/constants';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

interface SitemapEntry {
  loc: string;
  lastmod?: string;
  changefreq: 'daily' | 'weekly' | 'monthly' | 'yearly';
  priority: number;
  slug?: string;
  title?: string;
  type: 'blog-index' | 'post';
}

function stripTrailingSlash(value: string): string {
  return value.replace(/\/+$/, '');
}

function getBlogBaseUrl(): string {
  return stripTrailingSlash(process.env.NEXT_PUBLIC_BLOG_BASE_URL || 'https://www.bozorgani.ir/blog');
}

function isAbsoluteUrl(value: string | undefined | null): boolean {
  return Boolean(value && /^https?:\/\//i.test(value));
}

function postUrl(post: { slug?: string; canonicalUrl?: string }): string {
  if (isAbsoluteUrl(post.canonicalUrl)) return post.canonicalUrl!;
  const baseUrl = getBlogBaseUrl();
  return post.slug ? `${baseUrl}/${encodeURIComponent(post.slug)}` : baseUrl;
}

function isoDate(value: unknown): string | undefined {
  if (!value) return undefined;
  const date = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toISOString();
}

function xmlEscape(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function sitemapXml(entries: SitemapEntry[]): string {
  const urls = entries
    .map((entry) => {
      const lastmod = entry.lastmod ? `\n    <lastmod>${xmlEscape(entry.lastmod)}</lastmod>` : '';
      return `  <url>\n    <loc>${xmlEscape(entry.loc)}</loc>${lastmod}\n    <changefreq>${entry.changefreq}</changefreq>\n    <priority>${entry.priority.toFixed(1)}</priority>\n  </url>`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();
  } catch {
    return NextResponse.json({ ok: false, error: t('db.unavailable') }, { status: 503 });
  }

  const { searchParams } = new URL(request.url);
  const format = (searchParams.get('format') || 'xml').toLowerCase();
  const includeIndex = searchParams.get('includeIndex') !== 'false';
  const limit = Math.min(50000, Math.max(1, parseInt(searchParams.get('limit') || '50000')));
  const now = new Date();

  const posts = await Post.find({
    status: 'published',
    $or: [
      { publishAt: { $exists: false } },
      { publishAt: null },
      { publishAt: { $lte: now } },
    ],
  })
    .select('title slug canonicalUrl publishAt createdAt updatedAt')
    .sort({ publishAt: -1, createdAt: -1 })
    .limit(limit)
    .lean();

  const entries: SitemapEntry[] = [];

  if (includeIndex) {
    entries.push({
      type: 'blog-index',
      loc: getBlogBaseUrl(),
      lastmod: posts[0] ? isoDate((posts[0] as any).updatedAt || (posts[0] as any).publishAt || (posts[0] as any).createdAt) : undefined,
      changefreq: 'daily',
      priority: 1,
    });
  }

  for (const post of posts) {
    entries.push({
      type: 'post',
      loc: postUrl(post as any),
      lastmod: isoDate((post as any).updatedAt || (post as any).publishAt || (post as any).createdAt),
      changefreq: 'weekly',
      priority: 0.8,
      slug: (post as any).slug,
      title: (post as any).title,
    });
  }

  if (format === 'json') {
    return NextResponse.json({
      ok: true,
      generatedAt: now.toISOString(),
      count: entries.length,
      items: entries,
    });
  }

  return new NextResponse(sitemapXml(entries), {
    status: 200,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=3600',
    },
  });
}

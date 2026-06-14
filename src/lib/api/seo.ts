import { extractTextFromTiptap } from '@/lib/utils';

const DEFAULT_SITE_NAME = 'Bozorgani';
const DEFAULT_BLOG_BASE_URL = 'https://www.bozorgani.ir/blog';

type MediaLike = {
  _id?: unknown;
  path?: string;
  url?: string;
  alt?: string;
  caption?: string;
  width?: number;
  height?: number;
  mime?: string;
  size?: number;
};

type NamedRef = {
  _id?: unknown;
  name?: string;
  slug?: string;
};

function stripTrailingSlash(value: string): string {
  return value.replace(/\/+$/, '');
}

function getBlogBaseUrl(): string {
  return stripTrailingSlash(process.env.NEXT_PUBLIC_BLOG_BASE_URL || DEFAULT_BLOG_BASE_URL);
}

function getSiteName(): string {
  return process.env.NEXT_PUBLIC_SITE_NAME || DEFAULT_SITE_NAME;
}

function toStringId(value: unknown): string | undefined {
  if (!value) return undefined;
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && value !== null && '_id' in value) {
    const id = (value as { _id?: unknown })._id;
    return id ? String(id) : undefined;
  }
  return String(value);
}

function isAbsoluteOrDataUrl(value: string): boolean {
  return /^(https?:)?\/\//i.test(value) || value.startsWith('data:');
}

function mediaUrl(media?: MediaLike | string | null): string | undefined {
  if (!media) return undefined;
  const raw = typeof media === 'string' ? media : media.url || media.path;
  if (!raw) return undefined;

  if (isAbsoluteOrDataUrl(raw) || raw.startsWith('/')) return raw;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (appUrl) return `${stripTrailingSlash(appUrl)}/${raw.replace(/^\/+/, '')}`;
  return `/${raw.replace(/^\/+/, '')}`;
}

function mediaAsset(media?: MediaLike | string | null) {
  if (!media) return undefined;
  const url = mediaUrl(media);
  if (!url) return undefined;

  if (typeof media === 'string') {
    return { url };
  }

  return {
    id: toStringId(media._id),
    url,
    alt: media.alt || '',
    caption: media.caption,
    width: media.width,
    height: media.height,
    mime: media.mime,
    size: media.size,
  };
}

function refName(ref: unknown): string | undefined {
  if (!ref || typeof ref === 'string') return undefined;
  const item = ref as NamedRef;
  return item.name || item.slug;
}

function refSlug(ref: unknown): string | undefined {
  if (!ref || typeof ref === 'string') return undefined;
  return (ref as NamedRef).slug;
}

function compactObject<T extends Record<string, unknown>>(obj: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, value]) => value !== undefined && value !== null && value !== '')
  ) as Partial<T>;
}

export function buildPostSeoData(post: any) {
  const blogBaseUrl = getBlogBaseUrl();
  const siteName = getSiteName();

  const contentText = extractTextFromTiptap(post.content);
  const description =
    post.seo?.metaDescription ||
    post.excerpt ||
    (contentText ? `${contentText.slice(0, 157)}${contentText.length > 157 ? '...' : ''}` : '');

  const title = post.seo?.metaTitle || post.title || '';
  const canonicalUrl = post.canonicalUrl || (post.slug ? `${blogBaseUrl}/${post.slug}` : blogBaseUrl);
  const ogTitle = post.seo?.ogTitle || title;
  const ogDescription = post.seo?.ogDescription || description;
  const image = mediaAsset(post.seo?.ogImageId || post.coverImageId);

  const tags = Array.isArray(post.tags) ? post.tags : [];
  const tagNames = tags.map(refName).filter(Boolean) as string[];
  const categories = [post.categoryId, ...(Array.isArray(post.categoryIds) ? post.categoryIds : [])]
    .filter(Boolean)
    .map((category) => ({
      id: toStringId(category),
      name: refName(category),
      slug: refSlug(category),
    }));
  const primaryCategory = categories.find((category) => category.name || category.slug);

  const publishedAt = post.publishAt || post.createdAt;
  const modifiedAt = post.updatedAt || post.publishAt || post.createdAt;

  const jsonLd =
    post.seo?.jsonLd ||
    compactObject({
      '@context': 'https://schema.org',
      '@type': post.seo?.schemaType || 'Article',
      headline: post.title,
      description,
      image: image?.url ? [image.url] : undefined,
      datePublished: publishedAt ? new Date(publishedAt).toISOString() : undefined,
      dateModified: modifiedAt ? new Date(modifiedAt).toISOString() : undefined,
      mainEntityOfPage: canonicalUrl
        ? {
            '@type': 'WebPage',
            '@id': canonicalUrl,
          }
        : undefined,
      author: {
        '@type': 'Organization',
        name: siteName,
      },
      publisher: {
        '@type': 'Organization',
        name: siteName,
      },
      keywords: Array.isArray(post.keywords) && post.keywords.length ? post.keywords.join(', ') : undefined,
      articleSection: primaryCategory?.name || primaryCategory?.slug,
    });

  return {
    title,
    description,
    canonicalUrl,
    robots: post.seo?.robots || 'index, follow',
    keywords: Array.isArray(post.keywords) ? post.keywords : [],
    contentText,
    readingTime: post.readingTime || undefined,
    image,
    openGraph: compactObject({
      type: 'article',
      siteName,
      title: ogTitle,
      description: ogDescription,
      url: canonicalUrl,
      image,
      publishedTime: publishedAt ? new Date(publishedAt).toISOString() : undefined,
      modifiedTime: modifiedAt ? new Date(modifiedAt).toISOString() : undefined,
      section: primaryCategory?.name || primaryCategory?.slug,
      tags: tagNames.length ? tagNames : undefined,
    }),
    twitter: compactObject({
      card: post.seo?.twitterCard || (image?.url ? 'summary_large_image' : 'summary'),
      title: ogTitle,
      description: ogDescription,
      image: image?.url,
    }),
    jsonLd,
  };
}

export function withPostSeoData<T extends Record<string, any>>(post: T): T & { seoData: ReturnType<typeof buildPostSeoData> } {
  return {
    ...post,
    seoData: buildPostSeoData(post),
  };
}

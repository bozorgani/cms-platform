import crypto from 'crypto';
import { del, put } from '@vercel/blob';

export const MAX_MEDIA_UPLOAD_SIZE = Number(process.env.MAX_MEDIA_UPLOAD_SIZE || 10 * 1024 * 1024); // 10MB
export const BLOB_FOLDER = (process.env.BLOB_FOLDER || 'cms/media').replace(/^\/+|\/+$/g, '');

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/svg+xml',
  'video/mp4',
  'video/webm',
  'application/pdf',
]);

const MIME_EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/svg+xml': 'svg',
  'video/mp4': 'mp4',
  'video/webm': 'webm',
  'application/pdf': 'pdf',
};

export interface UploadedBlobMedia {
  url: string;
  pathname: string;
  contentType: string;
  size: number;
}

function hasBlobToken(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN || process.env.VERCEL_OIDC_TOKEN);
}

export function validateMediaFile(file: File): string | null {
  if (!file) return 'فایلی انتخاب نشده';
  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    return 'نوع فایل مجاز نیست. فقط تصاویر، MP4/WebM و PDF قابل آپلود هستند.';
  }
  if (file.size > MAX_MEDIA_UPLOAD_SIZE) {
    return `حجم فایل زیاد است. حداکثر حجم مجاز ${Math.round(MAX_MEDIA_UPLOAD_SIZE / 1024 / 1024)}MB است.`;
  }
  if (!hasBlobToken()) {
    return 'Vercel Blob تنظیم نشده است. متغیر BLOB_READ_WRITE_TOKEN را تنظیم کنید.';
  }
  return null;
}

function safeBaseName(fileName: string): string {
  const nameWithoutExt = fileName.replace(/\.[^.]+$/, '');
  const normalized = nameWithoutExt
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-_]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 70);
  return normalized || 'media';
}

function extensionFor(file: File): string {
  const fromName = file.name.split('.').pop()?.toLowerCase();
  if (fromName && /^[a-z0-9]{2,5}$/.test(fromName)) return fromName;
  return MIME_EXTENSIONS[file.type] || 'bin';
}

export function buildBlobPathname(file: File): string {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  const id = crypto.randomUUID();
  return `${BLOB_FOLDER}/${year}/${month}/${safeBaseName(file.name)}-${id}.${extensionFor(file)}`;
}

export async function uploadMediaFileToBlob(file: File): Promise<UploadedBlobMedia> {
  const validationError = validateMediaFile(file);
  if (validationError) throw new Error(validationError);

  const blob = await put(buildBlobPathname(file), file, {
    access: 'public',
    contentType: file.type,
    addRandomSuffix: false,
    cacheControlMaxAge: 60 * 60 * 24 * 365,
  });

  return {
    url: blob.url,
    pathname: blob.pathname,
    contentType: file.type,
    size: file.size,
  };
}

export function isVercelBlobUrl(value: string | undefined | null): boolean {
  if (!value) return false;
  try {
    const url = new URL(value);
    return url.hostname.endsWith('.public.blob.vercel-storage.com') || url.hostname.endsWith('.blob.vercel-storage.com');
  } catch {
    return false;
  }
}

export async function deleteMediaBlob(media: { url?: string; path?: string; blobPathname?: string }): Promise<void> {
  const target = media.url || media.path || media.blobPathname;
  if (!target) return;
  if (!isVercelBlobUrl(target) && !media.blobPathname) return;
  if (!hasBlobToken()) throw new Error('BLOB_READ_WRITE_TOKEN تنظیم نشده است');
  await del(target);
}

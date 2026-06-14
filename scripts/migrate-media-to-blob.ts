/**
 * Migrate legacy MongoDB base64 media records to Vercel Blob.
 *
 * Usage:
 *   BLOB_READ_WRITE_TOKEN=... MONGODB_URI=... npm run migrate-media-to-blob
 *
 * This script only migrates records where path starts with data:<mime>;base64,
 * and updates path/url/blobPathname after a successful Blob upload.
 */

import 'dotenv/config';
import crypto from 'crypto';
import mongoose from 'mongoose';
import { put } from '@vercel/blob';
import { Media } from '../src/lib/db/models/Media';

const BLOB_FOLDER = (process.env.BLOB_FOLDER || 'cms/media').replace(/^\/+|\/+$/g, '');

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

function parseDataUrl(value: string): { mime: string; buffer: Buffer } | null {
  const match = value.match(/^data:([^;,]+);base64,(.+)$/s);
  if (!match) return null;
  return {
    mime: match[1],
    buffer: Buffer.from(match[2], 'base64'),
  };
}

function safeBaseName(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/\.[^.]+$/, '')
    .replace(/[^a-z0-9-_]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 70) || 'media';
}

function blobPathname(media: any, mime: string): string {
  const createdAt = media.createdAt ? new Date(media.createdAt) : new Date();
  const year = createdAt.getUTCFullYear();
  const month = String(createdAt.getUTCMonth() + 1).padStart(2, '0');
  const ext = MIME_EXTENSIONS[mime] || 'bin';
  const base = safeBaseName(media.alt || media.caption || String(media._id));
  return `${BLOB_FOLDER}/${year}/${month}/${base}-${crypto.randomUUID()}.${ext}`;
}

async function main() {
  if (!process.env.BLOB_READ_WRITE_TOKEN && !process.env.VERCEL_OIDC_TOKEN) {
    throw new Error('BLOB_READ_WRITE_TOKEN is required');
  }

  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/cms-platform';
  console.log('[INFO] Connecting to ' + uri.replace(/\/\/[^:]+:[^@]+@/, '//***:***@'));
  await mongoose.connect(uri);

  const items = await Media.find({ path: /^data:/ }).sort({ createdAt: 1 });
  console.log(`[INFO] Found ${items.length} legacy media item(s)`);

  let migrated = 0;
  let skipped = 0;
  let failed = 0;

  for (const item of items) {
    const parsed = parseDataUrl(item.path);
    if (!parsed) {
      skipped++;
      console.log(`[SKIP] ${item._id}: invalid data URL`);
      continue;
    }

    try {
      const pathname = blobPathname(item, parsed.mime);
      const blob = await put(pathname, parsed.buffer, {
        access: 'public',
        contentType: parsed.mime,
        addRandomSuffix: false,
        cacheControlMaxAge: 60 * 60 * 24 * 365,
      });

      item.path = blob.url;
      item.url = blob.url;
      item.blobPathname = blob.pathname;
      item.mime = parsed.mime;
      item.size = parsed.buffer.byteLength;
      await item.save();

      migrated++;
      console.log(`[OK] ${item._id} -> ${blob.url}`);
    } catch (error) {
      failed++;
      console.log(`[FAIL] ${item._id}: ${(error as Error).message}`);
    }
  }

  console.log('\n=== Migration summary ===');
  console.log(`Migrated: ${migrated}`);
  console.log(`Skipped:  ${skipped}`);
  console.log(`Failed:   ${failed}`);

  await mongoose.disconnect();
  if (failed > 0) process.exit(1);
}

main().catch(async (error) => {
  console.error('[ERROR]', (error as Error).message);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});

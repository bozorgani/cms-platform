import crypto from 'crypto';
import { ENCRYPTION_KEY } from '@/lib/constants';

function getKey(): Buffer {
  if (!ENCRYPTION_KEY) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('CMS_ENCRYPTION_KEY must be set in production');
    }
    // Dev fallback - randomized per process
    if (!(global as any).__devEncryptionKey) {
      (global as any).__devEncryptionKey = crypto.randomBytes(32);
    }
    return (global as any).__devEncryptionKey;
  }

  const key = Buffer.from(ENCRYPTION_KEY, 'hex');
  if (key.length !== 32) {
    throw new Error('CMS_ENCRYPTION_KEY must be 64 hex chars (32 bytes)');
  }
  return key;
}

export function encrypt(plaintext: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
}

export function decrypt(ciphertext: string): string {
  const parts = ciphertext.split(':');
  if (parts.length !== 3) throw new Error('Invalid ciphertext format');
  const iv = Buffer.from(parts[0], 'hex');
  const authTag = Buffer.from(parts[1], 'hex');
  const encrypted = Buffer.from(parts[2], 'hex');
  const decipher = crypto.createDecipheriv('aes-256-gcm', getKey(), iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
}

export function generateSecret(length = 32): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const buf = crypto.randomBytes(length);
  let secret = '';
  for (let i = 0; i < length; i++) {
    secret += chars[buf[i] % chars.length];
  }
  return secret;
}

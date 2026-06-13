import crypto from 'crypto';
import { TOTP_WINDOW, TOTP_ISSUER } from '@/lib/constants';
import { generateSecret } from './crypto';

const BASE32_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function base32Decode(secret: string): Buffer {
  const clean = secret.replace(/[^A-Z2-7]/gi, '').toUpperCase();
  let bits = '';
  for (const ch of clean) {
    const v = BASE32_CHARS.indexOf(ch.toUpperCase());
    if (v === -1) throw new Error('Invalid base32');
    bits += v.toString(2).padStart(5, '0');
  }
  const bytes: number[] = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.substring(i, i + 8), 2));
  }
  return Buffer.from(bytes);
}

function hotp(secretBuf: Buffer, counter: number, digits = 6): string {
  const buf = Buffer.alloc(8);
  let c = counter;
  for (let i = 7; i >= 0; i--) {
    buf[i] = c & 0xff;
    c = Math.floor(c / 256);
  }
  const hmac = crypto.createHmac('sha1', secretBuf).update(buf).digest();
  const offset = hmac[hmac.length - 1] & 0xf;
  const code =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  return (code % Math.pow(10, digits)).toString().padStart(digits, '0');
}

export function generateTOTP(secret: string, time = Date.now(), digits = 6): string {
  const counter = Math.floor(time / 1000 / 30);
  return hotp(base32Decode(secret), counter, digits);
}

export function verifyTOTP(secret: string, code: string, window = TOTP_WINDOW): boolean {
  const clean = code.replace(/\D/g, '');
  if (clean.length !== 6) return false;

  const counter = Math.floor(Date.now() / 1000 / 30);
  const secretBuf = base32Decode(secret);

  for (let i = -window; i <= window; i++) {
    try {
      if (hotp(secretBuf, counter + i) === clean) return true;
    } catch {
      return false;
    }
  }
  return false;
}

export function generateTOTPSecret(): string {
  return generateSecret(32);
}

export function generateTOTPUri(secret: string, account: string): string {
  const params = new URLSearchParams({
    secret,
    issuer: TOTP_ISSUER,
    algorithm: 'SHA1',
    digits: '6',
    period: '30',
  });
  return `otpauth://totp/${encodeURIComponent(TOTP_ISSUER)}:${encodeURIComponent(account)}?${params}`;
}

export function generateBackupCodes(count = 10): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    const code = crypto.randomBytes(4).toString('hex').toUpperCase();
    codes.push(code.match(/.{1,4}/g)?.join('-') || code);
  }
  return codes;
}

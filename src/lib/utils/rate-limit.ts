interface Record {
  count: number;
  firstAttempt: number;
  lockedUntil: number;
}

const records = new Map<string, Record>();

export interface RateLimitOptions {
  maxAttempts?: number;
  windowMs?: number;
  lockoutMs?: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfter?: number;
  lockedUntil?: number;
}

export function checkRateLimit(key: string, options: RateLimitOptions = {}): RateLimitResult {
  const { maxAttempts = 5, windowMs = 15 * 60 * 1000, lockoutMs = 15 * 60 * 1000 } = options;
  const now = Date.now();
  const record = records.get(key);

  if (!record) {
    records.set(key, { count: 1, firstAttempt: now, lockedUntil: 0 });
    return { allowed: true, remaining: maxAttempts - 1 };
  }

  if (record.lockedUntil > now) {
    return {
      allowed: false,
      remaining: 0,
      retryAfter: Math.ceil((record.lockedUntil - now) / 1000),
    };
  }

  if (now - record.firstAttempt > windowMs) {
    records.set(key, { count: 1, firstAttempt: now, lockedUntil: 0 });
    return { allowed: true, remaining: maxAttempts - 1 };
  }

  record.count++;

  if (record.count > maxAttempts) {
    record.lockedUntil = now + lockoutMs;
    return { allowed: false, remaining: 0, retryAfter: Math.ceil(lockoutMs / 1000) };
  }

  return { allowed: true, remaining: maxAttempts - record.count };
}

export function resetRateLimit(key: string): void {
  records.delete(key);
}

if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, rec] of records.entries()) {
      if (now - rec.firstAttempt > 24 * 60 * 60 * 1000) records.delete(key);
    }
  }, 60 * 60 * 1000);
}

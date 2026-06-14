import jwt from 'jsonwebtoken';
import { JWT_SECRET, JWT_EXPIRES_IN } from '@/lib/constants';
import type { JWTPayload, User } from '@/types';

export function signToken(user: Pick<User, '_id' | 'role'>): string {
  if (!JWT_SECRET) {
    throw new Error('JWT_SECRET is not configured');
  }
  const payload: JWTPayload = { userId: user._id, role: user.role };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN as any });
}

export function verifyToken(token: string): JWTPayload | null {
  if (!JWT_SECRET || !token) return null;
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch {
    return null;
  }
}

export function getTokenFromRequest(request: Request): string | null {
  // اولویت ۱: Authorization: Bearer header (استاندارد API)
  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7).trim();
  }

  // اولویت ۲: Cookie (برای استفاده در browser)
  const cookieHeader = request.headers.get('cookie') || '';
  const match = cookieHeader.match(/cms-auth-token=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

export function getUserFromRequest(request: Request): User | null {
  const cookieHeader = request.headers.get('cookie') || '';
  const match = cookieHeader.match(/cms-user-info=([^;]+)/);
  if (!match) return null;
  try {
    return JSON.parse(decodeURIComponent(match[1]));
  } catch {
    return null;
  }
}

export function requireAuth(request: Request): { user: User; payload: JWTPayload } | null {
  const token = getTokenFromRequest(request);
  if (!token) return null;

  const payload = verifyToken(token);
  if (!payload) return null;

  const user = getUserFromRequest(request);
  if (!user || user._id !== payload.userId) return null;

  return { user, payload };
}

export function requireRole(request: Request, roles: string[]): { user: User; payload: JWTPayload } | null {
  const auth = requireAuth(request);
  if (!auth) return null;
  if (!roles.includes(auth.user.role)) return null;
  return auth;
}

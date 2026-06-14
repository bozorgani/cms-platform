// =============================================
// API & Environment
// =============================================
export const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api';
export const API_VERSION = 'v1';
export const API_PREFIX = `${API_BASE}/${API_VERSION}`;

// =============================================
// MongoDB
// =============================================
export const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/cms-platform';

// =============================================
// Authentication
// =============================================
export const JWT_SECRET = process.env.JWT_SECRET || '';
export const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
export const COOKIE_NAMES = {
  AUTH: 'cms-auth-token',
  USER: 'cms-user-info',
  TOTP: 'cms-totp-secret',
  REFRESH: 'cms-refresh-token',
} as const;

// =============================================
// 2FA / TOTP
// =============================================
export const TOTP_ISSUER = process.env.TOTP_ISSUER || 'CMS Platform';
export const TOTP_WINDOW = 1; // Allow 1 step before/after for clock skew
export const ENCRYPTION_KEY = process.env.CMS_ENCRYPTION_KEY || '';

// =============================================
// Pagination
// =============================================
export const DEFAULT_PAGE_SIZE = 10;
export const MAX_PAGE_SIZE = 100;

// =============================================
// Rate Limiting
// =============================================
export const RATE_LIMITS = {
  LOGIN: { points: 5, duration: 60 * 15 }, // 5 attempts per 15 min
  REGISTER: { points: 3, duration: 60 * 60 }, // 3 per hour
  API: { points: 100, duration: 60 }, // 100 per minute
  PASSWORD_RESET: { points: 3, duration: 60 * 60 }, // 3 per hour
} as const;

// =============================================
// User Roles
// =============================================
export const USER_ROLES = ['admin', 'editor', 'author', 'seo', 'viewer'] as const;
export type UserRole = (typeof USER_ROLES)[number];

// =============================================
// Post Status
// =============================================
export const POST_STATUSES = ['draft', 'scheduled', 'published', 'archived'] as const;
export type PostStatus = (typeof POST_STATUSES)[number];

export const POST_STATUS_LABELS: Record<PostStatus, string> = {
  draft: 'پیش‌نویس',
  scheduled: 'زمان‌بندی شده',
  published: 'منتشر شده',
  archived: 'آرشیو شده',
};

export const POST_STATUS_COLORS: Record<PostStatus, string> = {
  draft: 'bg-gray-100 text-gray-800',
  scheduled: 'bg-yellow-100 text-yellow-800',
  published: 'bg-green-100 text-green-800',
  archived: 'bg-red-100 text-red-800',
};

// =============================================
// SEO
// =============================================
export const ROBOTS_OPTIONS = [
  { value: 'index, follow', label: 'index, follow' },
  { value: 'noindex, follow', label: 'noindex, follow' },
  { value: 'index, nofollow', label: 'index, nofollow' },
  { value: 'noindex, nofollow', label: 'noindex, nofollow' },
];

export const SCHEMA_TYPES = [
  { value: 'Article', label: 'Article' },
  { value: 'BlogPosting', label: 'BlogPosting' },
  { value: 'NewsArticle', label: 'NewsArticle' },
];

export const SEO_LIMITS = {
  META_TITLE_MIN: 30,
  META_TITLE_MAX: 60,
  META_DESCRIPTION_MIN: 120,
  META_DESCRIPTION_MAX: 160,
};

// =============================================
// Security
// =============================================
export const ALLOWED_IPS = (process.env.ALLOWED_IPS || '').split(',').map((s) => s.trim()).filter(Boolean);
export const TRUST_PROXY = process.env.TRUST_PROXY === 'true';

// =============================================
// Notifications
// =============================================
export const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
export const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || '';

// =============================================
// ImageKit
// =============================================
export const IMAGEKIT = {
  PUBLIC_KEY: process.env.IMAGEKIT_PUBLIC_KEY || '',
  PRIVATE_KEY: process.env.IMAGEKIT_PRIVATE_KEY || '',
  URL_ENDPOINT: process.env.IMAGEKIT_URL_ENDPOINT || '',
  FOLDER: process.env.IMAGEKIT_FOLDER || '/cms',
};

// =============================================
// Image Extensions
// =============================================
export const IMAGE_EXTENSIONS = /\.(jpg|jpeg|png|gif|webp|svg|bmp|ico)$/i;
export const VIDEO_EXTENSIONS = /\.(mp4|mov|webm|avi)$/i;
export const DOC_EXTENSIONS = /\.(pdf|doc|docx)$/i;

// =============================================
// Extended constants (for migration)
// =============================================
export const TWITTER_CARDS = [
  { value: 'summary', label: 'summary' },
  { value: 'summary_large_image', label: 'summary_large_image' },
] as const;

export const STORAGE_KEYS = {
  TOKEN: 'cms-auth-token',
  USER: 'cms-user-info',
  TOTP: 'cms-totp-secret',
  SETTINGS: 'cms-settings',
} as const;

// =============================================
// Persian Messages
// =============================================
export * from './messages';

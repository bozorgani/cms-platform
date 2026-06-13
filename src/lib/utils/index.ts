import { IMAGE_EXTENSIONS } from '@/lib/constants';

// Image check
export function isImage(path: string | undefined | null): boolean {
  if (!path) return false;
  return IMAGE_EXTENSIONS.test(path);
}

// Slug generation
export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]+/g, '-')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 100);
}

// Truncate text
export function truncate(text: string, maxLength: number, suffix = '...'): string {
  if (!text || text.length <= maxLength) return text;
  return text.substring(0, maxLength - suffix.length) + suffix;
}

// Persian date
export function formatPersianDate(dateString: string | Date | undefined | null): string {
  if (!dateString) return '';
  try {
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    if (isNaN(date.getTime())) return '';
    return date.toLocaleDateString('fa-IR');
  } catch {
    return '';
  }
}

// File size
export function formatFileSize(bytes: number | undefined | null): string {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), sizes.length - 1);
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

// Debounce
export function debounce<T extends (...args: never[]) => void>(fn: T, delay: number): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout> | null = null;
  return (...args: Parameters<T>) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

// Get reference ID
export function getRefId<T extends { _id: string }>(ref: string | T | undefined | null): string {
  if (!ref) return '';
  if (typeof ref === 'string') return ref;
  return ref._id;
}

// Get reference name
export function getRefName<T extends { name?: string; slug?: string }>(
  ref: string | T | undefined | null,
  fallback = '—'
): string {
  if (!ref) return fallback;
  if (typeof ref === 'string') return fallback;
  return ref.name || ref.slug || fallback;
}

// classnames helper
export function cn(...classes: Array<string | undefined | null | false | Record<string, boolean>>): string {
  const out: string[] = [];
  for (const c of classes) {
    if (!c) continue;
    if (typeof c === 'string') out.push(c);
    else if (typeof c === 'object') {
      for (const [key, value] of Object.entries(c)) {
        if (value) out.push(key);
      }
    }
  }
  return out.join(' ');
}

// Get client IP
export function getClientIp(request: Request): string {
  const xff = request.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0].trim();
  return request.headers.get('x-real-ip') || 'unknown';
}

// Generate unique ID
export function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

// Extract text from TipTap
export function extractTextFromTiptap(content: any): string {
  if (!content) return '';
  if (typeof content === 'string') return content;
  if (!content.content || !Array.isArray(content.content)) return '';
  let text = '';
  function traverse(node: any) {
    if (node.type === 'text' && node.text) text += node.text + ' ';
    if (node.content && Array.isArray(node.content)) node.content.forEach(traverse);
  }
  content.content.forEach(traverse);
  return text.trim();
}

// Rate limiting (re-exported)
export { checkRateLimit, resetRateLimit, type RateLimitResult, type RateLimitOptions } from './rate-limit';

// Notifications (re-exported)
export { notify } from './notify';

// Safe storage helpers (for migration)
export const safeGetStorage = (key: string): string | null => {
  if (typeof window === 'undefined') return null;
  try { return localStorage.getItem(key); } catch { return null; }
};

export const safeSetStorage = (key: string, value: string): void => {
  if (typeof window === 'undefined') return;
  try { localStorage.setItem(key, value); } catch { /* ignore */ }
};

// Extract text from TipTap content (alias)
export const extractTextFromContent = extractTextFromTiptap;

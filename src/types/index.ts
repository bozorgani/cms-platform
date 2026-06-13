import { UserRole, PostStatus } from '@/lib/constants';

// =============================================
// User & Auth
// =============================================
export interface User {
  _id: string;
  email: string;
  name?: string;
  role: UserRole;
  createdAt?: string;
  updatedAt?: string;
}

export interface UserInput {
  email: string;
  password: string;
  name?: string;
  role?: UserRole;
}

export interface AuthResponse {
  ok: boolean;
  user?: User;
  token?: string;
  error?: string;
  requires2fa?: boolean;
}

// =============================================
// JWT Payload
// =============================================
export interface JWTPayload {
  userId: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

// =============================================
// Pagination
// =============================================
export interface PaginatedResponse<T> {
  ok: boolean;
  items?: T[];
  total?: number;
  page?: number;
  limit?: number;
  totalPages?: number;
  error?: string;
}

// =============================================
// Post
// =============================================
export interface Post {
  _id: string;
  title: string;
  slug: string;
  excerpt?: string;
  content: any;
  status: PostStatus;
  publishAt?: string;
  createdAt?: string;
  updatedAt?: string;
  authorId?: string | { _id: string; name: string };
  categoryId?: string | Category;
  categoryIds?: (string | Category)[];
  tags?: (string | Tag)[];
  keywords?: string[];
  coverImageId?: string | Media;
  canonicalUrl?: string;
  isFeatured?: boolean;
  readingTime?: number;
  views?: number;
  seo?: SEO;
}

export interface PostInput {
  title: string;
  slug?: string;
  excerpt?: string;
  content: any;
  status: PostStatus;
  publishAt?: string;
  categoryId?: string;
  categoryIds?: string[];
  tags?: string[];
  keywords?: string[];
  coverImageId?: string;
  canonicalUrl?: string;
  isFeatured?: boolean;
  seo?: SEO;
}

// =============================================
// Category
// =============================================
export interface Category {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  parentId?: string | Category;
  seo?: SEO;
  createdAt?: string;
  updatedAt?: string;
}

export interface CategoryInput {
  name: string;
  slug?: string;
  description?: string;
  parentId?: string;
  seo?: SEO;
}

// =============================================
// Tag
// =============================================
export interface Tag {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface TagInput {
  name: string;
  slug?: string;
  description?: string;
}

// =============================================
// Media
// =============================================
export interface Media {
  _id: string;
  path: string;
  url?: string;
  width?: number;
  height?: number;
  alt?: string;
  caption?: string;
  dominantColor?: string;
  variants?: any;
  imagekitFileId?: string;
  mime?: string;
  size?: number;
  createdAt?: string;
  updatedAt?: string;
}

// =============================================
// SEO
// =============================================
export interface SEO {
  metaTitle?: string;
  metaDescription?: string;
  robots?: 'index, follow' | 'noindex, follow' | 'index, nofollow' | 'noindex, nofollow';
  ogTitle?: string;
  ogDescription?: string;
  ogImageId?: string | Media;
  twitterCard?: 'summary' | 'summary_large_image';
  schemaType?: 'Article' | 'BlogPosting' | 'NewsArticle';
  jsonLd?: any;
}

// =============================================
// Tiptap
// =============================================
export interface TiptapMark {
  type: string;
  attrs?: Record<string, unknown>;
}

export interface TiptapNode {
  type: string;
  attrs?: Record<string, unknown>;
  content?: TiptapNode[];
  marks?: TiptapMark[];
  text?: string;
}

export interface TiptapContent {
  type: 'doc';
  content?: TiptapNode[];
}

// =============================================
// API Responses
// =============================================
export interface ApiSuccess<T = unknown> {
  ok: true;
  data?: T;
}

export interface ApiError {
  ok: false;
  error: string;
  status?: number;
}

export type ApiResult<T = unknown> = ApiSuccess<T> | ApiError;

// =============================================
// Settings
// =============================================
export interface Setting {
  _id: string;
  key: string;
  value: any;
  updatedAt?: string;
}

// =============================================
// Toast (added at end to avoid affecting other exports)
// =============================================
export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastMessage {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration?: number;
}

// Re-export PostStatus from constants for convenience
export type { PostStatus } from '@/lib/constants';
export type { UserRole } from '@/lib/constants';

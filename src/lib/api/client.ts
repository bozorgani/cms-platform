'use client';

import { API_PREFIX } from '@/lib/constants';
import type { User, Post, Category, Tag, Media } from '@/types';

function buildUrl(path: string, query?: URLSearchParams): string {
  let url = `${API_PREFIX}${path}`;
  if (query) {
    const qs = query.toString();
    if (qs) url += `?${qs}`;
  }
  return url;
}

export class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
    this.name = 'ApiError';
  }
}

async function handle<T>(res: Response): Promise<T> {
  if (res.status === 401 && typeof window !== 'undefined' && window.location.pathname !== '/login') {
    window.location.href = '/login';
    throw new ApiError('Session expired', 401);
  }
  let data: unknown = null;
  const text = await res.text();
  if (text) {
    try { data = JSON.parse(text); } catch { data = text; }
  }
  if (!res.ok) {
    const msg = (data as any)?.error || `HTTP ${res.status}`;
    throw new ApiError(msg, res.status);
  }
  return data as T;
}

async function fetchApi(path: string, options: RequestInit = {}): Promise<Response> {
  return fetch(buildUrl(path), {
    credentials: 'include',
    ...options,
    headers: {
      ...options.headers,
    },
  });
}

// ============================================
// Auth
// ============================================


export async function fetchCurrentUser(): Promise<User | null> {
  return getCurrentUser();
}

export async function login(email: string, password: string, totpCode?: string) {
  try {
    const res = await fetchApi('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, totpCode }),
    });
    return await handle<{ ok: boolean; user?: User; requires2fa?: boolean; error?: string }>(res);
  } catch (e) {
    if (e instanceof ApiError) return { ok: false, error: e.message };
    return { ok: false, error: 'Network error' };
  }
}

export async function logout() {
  try {
    await fetchApi('/auth/logout', { method: 'POST' });
  } catch { /* ignore */ }
  if (typeof window !== 'undefined') window.location.href = '/login';
}

export async function requestPasswordReset(email: string) {
  try {
    const res = await fetchApi('/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    return await handle<{ ok: boolean; message?: string; error?: string; devToken?: string; devLink?: string }>(res);
  } catch (e) {
    if (e instanceof ApiError) return { ok: false, error: e.message };
    return { ok: false, error: 'Network error' };
  }
}

export async function resetPassword(token: string, newPassword: string) {
  try {
    const res = await fetchApi('/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, newPassword }),
    });
    return await handle<{ ok: boolean; message?: string; error?: string }>(res);
  } catch (e) {
    if (e instanceof ApiError) return { ok: false, error: e.message };
    return { ok: false, error: 'Network error' };
  }
}

// ============================================
// Posts
// ============================================

interface ListPostsParams {
  status?: string;
  page?: number;
  limit?: number;
  search?: string;
}

export async function listPosts(params?: ListPostsParams): Promise<{ ok: boolean; items?: Post[]; total?: number; page?: number; error?: string }> {
  const query = new URLSearchParams();
  if (params?.status) query.append('status', params.status);
  if (params?.page) query.append('page', String(params.page));
  if (params?.limit) query.append('limit', String(params.limit));
  if (params?.search) query.append('search', params.search);

  try {
    const res = await fetchApi('/posts?' + query.toString());
    return await handle<{ ok: boolean; items?: Post[]; total?: number; page?: number }>(res);
  } catch (e) {
    if (e instanceof ApiError) return { ok: false, error: e.message };
    return { ok: false };
  }
}

export async function getPost(id: string): Promise<{ ok: boolean; post?: Post; error?: string }> {
  try {
    const res = await fetchApi(`/posts/${id}`);
    return await handle<{ ok: boolean; post?: Post }>(res);
  } catch (e) {
    if (e instanceof ApiError) return { ok: false, error: e.message };
    return { ok: false, error: 'Network error' };
  }
}

export async function createPost(data: Partial<Post>): Promise<{ ok: boolean; post?: Post; error?: string }> {
  try {
    const res = await fetchApi('/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return await handle<{ ok: boolean; post?: Post }>(res);
  } catch (e) {
    if (e instanceof ApiError) return { ok: false, error: e.message };
    return { ok: false, error: 'Network error' };
  }
}

export async function updatePost(id: string, data: Partial<Post>): Promise<{ ok: boolean; post?: Post; error?: string }> {
  try {
    const res = await fetchApi(`/posts/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return await handle<{ ok: boolean; post?: Post }>(res);
  } catch (e) {
    if (e instanceof ApiError) return { ok: false, error: e.message };
    return { ok: false, error: 'Network error' };
  }
}

export async function deletePost(id: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetchApi(`/posts/${id}`, { method: 'DELETE' });
    return await handle<{ ok: boolean }>(res);
  } catch (e) {
    if (e instanceof ApiError) return { ok: false, error: e.message };
    return { ok: false, error: 'Network error' };
  }
}

// ============================================
// Categories
// ============================================

export async function listCategories(params?: { page?: number; limit?: number }): Promise<{ ok: boolean; items?: Category[]; total?: number; page?: number; error?: string }> {
  try {
    const query = new URLSearchParams();
    if (params?.page) query.append('page', String(params.page));
    if (params?.limit) query.append('limit', String(params.limit));
    const res = await fetchApi('/categories?' + query.toString());
    return await handle<{ ok: boolean; items?: Category[]; total?: number; page?: number }>(res);
  } catch (e) {
    if (e instanceof ApiError) return { ok: false, error: e.message };
    return { ok: false };
  }
}

export async function getCategory(id: string): Promise<{ ok: boolean; category?: Category; error?: string }> {
  try {
    const res = await fetchApi(`/categories/${id}`);
    return await handle<{ ok: boolean; category?: Category }>(res);
  } catch (e) {
    if (e instanceof ApiError) return { ok: false, error: e.message };
    return { ok: false, error: 'Network error' };
  }
}

export async function createCategory(data: Partial<Category>): Promise<{ ok: boolean; category?: Category; error?: string }> {
  try {
    const res = await fetchApi('/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return await handle<{ ok: boolean; category?: Category }>(res);
  } catch (e) {
    if (e instanceof ApiError) return { ok: false, error: e.message };
    return { ok: false, error: 'Network error' };
  }
}

export async function updateCategory(id: string, data: Partial<Category>): Promise<{ ok: boolean; category?: Category; error?: string }> {
  try {
    const res = await fetchApi(`/categories/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return await handle<{ ok: boolean; category?: Category }>(res);
  } catch (e) {
    if (e instanceof ApiError) return { ok: false, error: e.message };
    return { ok: false, error: 'Network error' };
  }
}

export async function deleteCategory(id: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetchApi(`/categories/${id}`, { method: 'DELETE' });
    return await handle<{ ok: boolean }>(res);
  } catch (e) {
    if (e instanceof ApiError) return { ok: false, error: e.message };
    return { ok: false, error: 'Network error' };
  }
}

// ============================================
// Tags
// ============================================

export async function listTags(params?: { page?: number; limit?: number }): Promise<{ ok: boolean; items?: Tag[]; total?: number; page?: number; error?: string }> {
  try {
    const query2 = new URLSearchParams();
    if (params?.page) query2.append('page', String(params.page));
    if (params?.limit) query2.append('limit', String(params.limit));
    const res = await fetchApi('/tags?' + query2.toString());
    return await handle<{ ok: boolean; items?: Tag[]; total?: number; page?: number }>(res);
  } catch (e) {
    if (e instanceof ApiError) return { ok: false, error: e.message };
    return { ok: false };
  }
}

export async function getTag(id: string): Promise<{ ok: boolean; tag?: Tag; error?: string }> {
  try {
    const res = await fetchApi(`/tags/${id}`);
    return await handle<{ ok: boolean; tag?: Tag }>(res);
  } catch (e) {
    if (e instanceof ApiError) return { ok: false, error: e.message };
    return { ok: false, error: 'Network error' };
  }
}

export async function createTag(data: Partial<Tag>): Promise<{ ok: boolean; tag?: Tag; error?: string }> {
  try {
    const res = await fetchApi('/tags', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return await handle<{ ok: boolean; tag?: Tag }>(res);
  } catch (e) {
    if (e instanceof ApiError) return { ok: false, error: e.message };
    return { ok: false, error: 'Network error' };
  }
}

export async function updateTag(id: string, data: Partial<Tag>): Promise<{ ok: boolean; tag?: Tag; error?: string }> {
  try {
    const res = await fetchApi(`/tags/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return await handle<{ ok: boolean; tag?: Tag }>(res);
  } catch (e) {
    if (e instanceof ApiError) return { ok: false, error: e.message };
    return { ok: false, error: 'Network error' };
  }
}

export async function deleteTag(id: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetchApi(`/tags/${id}`, { method: 'DELETE' });
    return await handle<{ ok: boolean }>(res);
  } catch (e) {
    if (e instanceof ApiError) return { ok: false, error: e.message };
    return { ok: false, error: 'Network error' };
  }
}

// ============================================
// Media
// ============================================

export async function listMedia(params?: { page?: number; limit?: number }): Promise<{ ok: boolean; items?: Media[]; total?: number; page?: number; error?: string }> {
  const query = new URLSearchParams();
  if (params?.page) query.append('page', String(params.page));
  if (params?.limit) query.append('limit', String(params.limit));

  try {
    const res = await fetchApi('/media?' + query.toString());
    return await handle<{ ok: boolean; items?: Media[]; total?: number; page?: number }>(res);
  } catch (e) {
    if (e instanceof ApiError) return { ok: false, error: e.message };
    return { ok: false };
  }
}

export async function getMedia(id: string): Promise<{ ok: boolean; media?: Media; error?: string }> {
  try {
    const res = await fetchApi(`/media/${id}`);
    return await handle<{ ok: boolean; media?: Media }>(res);
  } catch (e) {
    if (e instanceof ApiError) return { ok: false, error: e.message };
    return { ok: false, error: 'Network error' };
  }
}

export async function uploadMedia(file: File, alt?: string, caption?: string): Promise<{ ok: boolean; media?: Media; error?: string }> {
  try {
    const formData = new FormData();
    formData.append('file', file);
    if (alt) formData.append('alt', alt);
    if (caption) formData.append('caption', caption);

    const res = await fetchApi('/media', {
      method: 'POST',
      body: formData,
    });
    return await handle<{ ok: boolean; media?: Media }>(res);
  } catch (e) {
    if (e instanceof ApiError) return { ok: false, error: e.message };
    return { ok: false, error: 'Network error' };
  }
}

export async function deleteMedia(id: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetchApi(`/media/${id}`, { method: 'DELETE' });
    return await handle<{ ok: boolean }>(res);
  } catch (e) {
    if (e instanceof ApiError) return { ok: false, error: e.message };
    return { ok: false, error: 'Network error' };
  }
}

// ============================================
// Users (admin only)
// ============================================

export async function listUsers(): Promise<{ ok: boolean; items?: User[]; error?: string }> {
  try {
    const res = await fetchApi('/users');
    return await handle<{ ok: boolean; items?: User[] }>(res);
  } catch (e) {
    if (e instanceof ApiError) return { ok: false, error: e.message };
    return { ok: false };
  }
}

// ============================================
// Media URL helper
// ============================================

export function getMediaUrl(path: string | undefined | null): string {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  if (path.startsWith('data:')) return path;
  if (path.startsWith('/')) return path;
  return `/${path}`;
}

// ============================================
// Media Update/Replace (extended)
// ============================================

export async function updateMedia(id: string, updates: { alt?: string; caption?: string }): Promise<{ ok: boolean; media?: Media; error?: string }> {
  try {
    const res = await fetchApi(`/media/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    return await handle<{ ok: boolean; media?: Media }>(res);
  } catch (e) {
    if (e instanceof ApiError) return { ok: false, error: e.message };
    return { ok: false, error: 'Network error' };
  }
}

export async function replaceMedia(id: string, file: File, alt?: string, caption?: string): Promise<{ ok: boolean; media?: Media; error?: string }> {
  try {
    const formData = new FormData();
    formData.append('file', file);
    if (alt) formData.append('alt', alt);
    if (caption) formData.append('caption', caption);

    const res = await fetchApi(`/media/${id}/replace`, {
      method: 'PUT',
      body: formData,
    });
    return await handle<{ ok: boolean; media?: Media }>(res);
  } catch (e) {
    if (e instanceof ApiError) return { ok: false, error: e.message };
    return { ok: false, error: 'Network error' };
  }
}

// Sync version that reads from cookie (for SSR compatibility)
export function getCurrentUserSync(): User | null {
  if (typeof document === 'undefined') return null;
  const cookies = document.cookie.split(';');
  for (const cookie of cookies) {
    const [name, ...rest] = cookie.trim().split('=');
    if (name === 'cms-user-info') {
      try {
        return JSON.parse(decodeURIComponent(rest.join('=')));
      } catch {
        return null;
      }
    }
  }
  return null;
}

// Alias for compatibility
export const getCurrentUser = getCurrentUserSync;

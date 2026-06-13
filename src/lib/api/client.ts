'use client';

import { API_PREFIX } from '@/lib/constants';
import type { User } from '@/types';

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

export async function getCurrentUser(): Promise<User | null> {
  try {
    const res = await fetchApi('/auth/me');
    if (!res.ok) return null;
    const data = await res.json();
    return data?.user || null;
  } catch {
    return null;
  }
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

export async function listPosts(params?: { status?: string; page?: number; limit?: number; search?: string }) {
  const query = new URLSearchParams();
  if (params?.status) query.append('status', params.status);
  if (params?.page) query.append('page', String(params.page));
  if (params?.limit) query.append('limit', String(params.limit));
  if (params?.search) query.append('search', params.search);

  try {
    const res = await fetchApi('/posts?' + query.toString());
    return await handle<{ ok: boolean; items?: any[]; total?: number; page?: number; error?: string }>(res);
  } catch (e) {
    if (e instanceof ApiError) return { ok: false, error: e.message };
    return { ok: false };
  }
}

export async function createPost(data: any) {
  try {
    const res = await fetchApi('/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return await handle<{ ok: boolean; post?: any; error?: string }>(res);
  } catch (e) {
    if (e instanceof ApiError) return { ok: false, error: e.message };
    return { ok: false, error: 'Network error' };
  }
}

export async function updatePost(id: string, data: any) {
  try {
    const res = await fetchApi(`/posts/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return await handle<{ ok: boolean; post?: any; error?: string }>(res);
  } catch (e) {
    if (e instanceof ApiError) return { ok: false, error: e.message };
    return { ok: false, error: 'Network error' };
  }
}

export async function deletePost(id: string) {
  try {
    const res = await fetchApi(`/posts/${id}`, { method: 'DELETE' });
    return await handle<{ ok: boolean; error?: string }>(res);
  } catch (e) {
    if (e instanceof ApiError) return { ok: false, error: e.message };
    return { ok: false, error: 'Network error' };
  }
}

export async function listCategories() {
  try {
    const res = await fetchApi('/categories');
    return await handle<{ ok: boolean; items?: any[]; error?: string }>(res);
  } catch (e) {
    if (e instanceof ApiError) return { ok: false, error: e.message };
    return { ok: false };
  }
}

export async function createCategory(data: any) {
  try {
    const res = await fetchApi('/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return await handle<{ ok: boolean; category?: any; error?: string }>(res);
  } catch (e) {
    if (e instanceof ApiError) return { ok: false, error: e.message };
    return { ok: false, error: 'Network error' };
  }
}

export async function listTags() {
  try {
    const res = await fetchApi('/tags');
    return await handle<{ ok: boolean; items?: any[]; error?: string }>(res);
  } catch (e) {
    if (e instanceof ApiError) return { ok: false, error: e.message };
    return { ok: false };
  }
}

export async function createTag(data: any) {
  try {
    const res = await fetchApi('/tags', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return await handle<{ ok: boolean; tag?: any; error?: string }>(res);
  } catch (e) {
    if (e instanceof ApiError) return { ok: false, error: e.message };
    return { ok: false, error: 'Network error' };
  }
}

export async function listMedia(params?: { page?: number; limit?: number }) {
  const query = new URLSearchParams();
  if (params?.page) query.append('page', String(params.page));
  if (params?.limit) query.append('limit', String(params.limit));

  try {
    const res = await fetchApi('/media?' + query.toString());
    return await handle<{ ok: boolean; items?: any[]; total?: number; page?: number; error?: string }>(res);
  } catch (e) {
    if (e instanceof ApiError) return { ok: false, error: e.message };
    return { ok: false };
  }
}

export async function uploadMedia(file: File, alt?: string, caption?: string) {
  try {
    const formData = new FormData();
    formData.append('file', file);
    if (alt) formData.append('alt', alt);
    if (caption) formData.append('caption', caption);

    const res = await fetchApi('/media', { method: 'POST', body: formData });
    return await handle<{ ok: boolean; media?: any; error?: string }>(res);
  } catch (e) {
    if (e instanceof ApiError) return { ok: false, error: e.message };
    return { ok: false, error: 'Network error' };
  }
}

export async function deleteMedia(id: string) {
  try {
    const res = await fetchApi(`/media/${id}`, { method: 'DELETE' });
    return await handle<{ ok: boolean; error?: string }>(res);
  } catch (e) {
    if (e instanceof ApiError) return { ok: false, error: e.message };
    return { ok: false, error: 'Network error' };
  }
}

export function getMediaUrl(path: string | undefined | null): string {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  if (path.startsWith('/')) return path;
  return `/${path}`;
}

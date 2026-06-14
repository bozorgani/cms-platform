# راهنمای مهاجرت از cms-api به cms-platform

اگر سایت اصلی شما از `cms-api` قدیمی استفاده می‌کرد، باید تغییرات زیر را اعمال کنید.

## 1️⃣ تغییر URL prefix

### قبل (cms-api قدیمی):
```typescript
// NEXT_PUBLIC_CMS_API=http://localhost:4000
const response = await fetch(`${process.env.NEXT_PUBLIC_CMS_API}/v1/posts`);
```

### بعد (cms-platform جدید):
```typescript
// گزینه الف: تغییر CMS_API به base کامل با /api
// NEXT_PUBLIC_CMS_API=http://localhost:3001/api
const response = await fetch(`${process.env.NEXT_PUBLIC_CMS_API}/v1/posts`);

// گزینه ب: استفاده از helper
import { cmsApiUrl } from '@/lib/cms-client';
const response = await fetch(cmsApiUrl('/v1/posts'));
```

## 2️⃣ URL های موجود

| URL قدیم (cms-api) | URL جدید (cms-platform) | تغییر لازم؟ |
|--------------------|------------------------|---------------|
| GET /v1/posts | GET /api/v1/posts | ✅ اضافه `/api` |
| GET /v1/posts/slug/:slug | GET /api/v1/posts/slug/:slug | ✅ اضافه `/api` |
| GET /v1/posts/:id | GET /api/v1/posts/:id | ✅ اضافه `/api` |
| GET /v1/categories | GET /api/v1/categories | ✅ اضافه `/api` |
| GET /v1/tags | GET /api/v1/tags | ✅ اضافه `/api` |
| GET /v1/media | GET /api/v1/media | ✅ اضافه `/api` |
| POST /v1/auth/login | POST /api/v1/auth/login | ✅ اضافه `/api` |

## 3️⃣ Helper Function برای سایت اصلی

کپی کنید در پروژه سایت اصلی خود:

```typescript
// lib/cms-client.ts
const CMS_API_URL = process.env.NEXT_PUBLIC_CMS_API || 'http://localhost:3001/api';

export function cmsApiUrl(path: string): string {
  // حذف /api اگر قبلاً وجود داشت
  const cleanPath = path.startsWith('/api') ? path.slice(4) : path;
  return `${CMS_API_URL}${cleanPath}`;
}

export async function cmsFetch(path: string, options: RequestInit = {}) {
  const res = await fetch(cmsApiUrl(path), {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`CMS API error: ${res.status}`);
  return res.json();
}

// استفاده:
// const posts = await cmsFetch('/v1/posts?status=published');
// const post = await cmsFetch('/v1/posts/slug/my-article-slug');
```

## 4️⃣ Environment Variables

### در Vercel/سرور سایت اصلی:

```bash
# قبل:
NEXT_PUBLIC_CMS_API=https://cms-api.bozorgani.ir

# بعد (دو گزینه):

# گزینه الف: URL کامل شامل /api
NEXT_PUBLIC_CMS_API=https://cms-platform.bozorgani.ir/api

# گزینه ب: فقط domain (helper خودش /api اضافه می‌کند)
NEXT_PUBLIC_CMS_API=https://cms-platform.bozorgani.ir
```

## 5️⃣ مثال کامل

```typescript
// در سایت اصلی شما
// app/blog/page.tsx
import { cmsFetch } from '@/lib/cms-client';

export default async function BlogPage() {
  const data = await cmsFetch('/v1/posts?status=published&limit=10');
  const posts = data.items;
  return <div>{posts.map(p => <h2>{p.title}</h2>)}</div>;
}
```

## 6️⃣ Public Endpoints (بدون نیاز به auth)

تمام endpoint های زیر بدون authentication در دسترس هستند:

- `GET /api/v1/posts` (با status=published)
- `GET /api/v1/posts/slug/:slug`
- `GET /api/v1/posts/:id`
- `GET /api/v1/categories`
- `GET /api/v1/tags`
- `GET /api/v1/media`
- `GET /api/v1/health`

## 7️⃣ تفاوت‌های دیگر

| مورد | cms-api قدیمی | cms-platform جدید |
|------|---------------|-------------------|
| Image Storage | فایل فیزیکی در `/uploads/` | Data URL در MongoDB (موقت) |
| Base URL | مستقیم | با proxy |
| Authentication | Bearer token | HttpOnly Cookie + JWT |
| Rate Limit | ❌ | ✅ |

## 8️⃣ اگر می‌خواهید سایت اصلی به cms-platform متصل شود

```bash
# 1. cms-platform را deploy کنید (Vercel):
# - Push to GitHub (انجام شد)
# - Vercel → New Project
# - Environment Variables: MONGODB_URI, JWT_SECRET, CMS_ENCRYPTION_KEY
# - Deploy

# 2. URL cms-platform را بگیرید:
# https://cms-platform.vercel.app

# 3. در سایت اصلی، NEXT_PUBLIC_CMS_API را تنظیم کنید:
NEXT_PUBLIC_CMS_API=https://cms-platform.vercel.app/api

# 4. سایت اصلی را redeploy کنید.
```

## 9️⃣ عیب‌یابی

### خطا: 404 Not Found
- ✅ بررسی کنید `/api` prefix اضافه شده
- ✅ URL کامل را چک کنید: `${CMS_API}/api/v1/posts`

### خطا: 401 Unauthorized
- ✅ endpoint باید public باشد (status=published)
- ✅ authentication لازم نیست برای GET public

### خطا: CORS
- ✅ cms-platform باید CORS_ORIGIN تنظیم شده باشد
- ✅ در .env: CORS_ORIGIN=https://your-main-site.com

## 📞 پشتیبانی

اگر مشکل دارید، URL endpoint هایی که سایت اصلی شما فراخوانی می‌کند را بفرستید تا کمک کنم.

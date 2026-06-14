# گزارش بررسی پروژه `cms-platform`

تاریخ بررسی: 2026-06-15

> نکته امنیتی: توکن GitHub که در پیام کاربر ارسال شده بود برای کلون استفاده نشد. مخزن بدون توکن کلون شد. آن توکن باید فوراً در GitHub revoke/rotate شود.

## خلاصه اجرایی

پروژه یک CMS یکپارچه با Next.js 14، TypeScript، MongoDB/Mongoose، پنل ادمین، REST API، JWT Cookie Auth، تلاش برای 2FA و Tailwind است. از نظر کامپایل و TypeScript وضعیت پایه خوب است، اما چند ایراد امنیتی/کارکردی مهم وجود دارد که قبل از production باید اصلاح شوند.

## نتیجه اجرای ابزارها

| بررسی | نتیجه |
|---|---|
| `git clone https://github.com/bozorgani/cms-platform.git` | موفق |
| `npm ci` | موفق؛ 8 آسیب‌پذیری گزارش شد |
| `npm run type-check` | موفق، exit 0 |
| `npm run lint` | موفق، اما 17 هشدار |
| `npm run build` | موفق، اما در stderr تلاش اتصال MongoDB در build برای health route دیده شد |
| اسکن ساده secret در repo | secret واقعی در فایل‌های پروژه یافت نشد؛ فقط placeholderهای `.env.example` |

## یافته‌های مهم با اولویت

### 1. بحرانی: Role escalation از طریق cookie قابل‌تغییر `cms-user-info`

**فایل‌ها:**
- `src/lib/auth/jwt.ts`
- `src/app/api/v1/auth/login/route.ts`

`requireRole()` نقش را از `auth.user.role` می‌خواند؛ `auth.user` از cookie سمت کلاینت `cms-user-info` می‌آید. این cookie در login با `httpOnly: false` ست می‌شود. بنابراین کاربر لاگین‌شده با نقش پایین‌تر می‌تواند مقدار cookie را تغییر دهد و role را `admin` کند، در حالی که `_id` همان `_id` توکن باقی بماند. چون `requireAuth()` فقط `_id` cookie را با `payload.userId` مقایسه می‌کند، این جعل نقش پذیرفته می‌شود.

**ریسک:** دسترسی غیرمجاز به APIهای admin مانند users.

**پیشنهاد اصلاح:**
- role و userId را فقط از JWT معتبر یا DB بگیرید، نه از cookie قابل خواندن/نوشتن.
- `requireAuth` باید token را verify کند و سپس user را از DB بخواند.
- اگر اطلاعات UI لازم است، cookie user باید صرفاً نمایشی باشد و هرگز مبنای authorization نباشد.

### 2. زیاد: endpointهای public پست‌ها draft/private را افشا می‌کنند

**فایل‌ها:**
- `src/app/api/v1/posts/route.ts`
- `src/app/api/v1/posts/[id]/route.ts`

`GET /api/v1/posts?status=all` بدون auth همه پست‌ها را برمی‌گرداند. همچنین `GET /api/v1/posts/:id` بدون auth هر پستی را با هر status برمی‌گرداند.

**ریسک:** افشای draft، archived و scheduled posts.

**پیشنهاد اصلاح:**
- برای کاربر ناشناس فقط `status: 'published'` مجاز باشد.
- `status=all` و گرفتن post غیر published فقط با auth/role مناسب مجاز باشد.

### 3. Password reset حذف شد

در مرحله اصلاح، قابلیت password reset اینترنتی به‌طور کامل حذف شد:

- صفحه‌های `/forgot-password` و `/reset-password` حذف شدند.
- APIهای `/api/v1/auth/forgot-password` و `/api/v1/auth/reset-password` حذف شدند.
- helperهای client مربوط به reset حذف شدند.
- لینک forgot password از صفحه login حذف شد.
- اسکریپت CLI `reset-password` و referenceهای آن حذف شد.

برای مدیریت رمز عبور همچنان ابزارهای مدیریتی `change-admin` و `emergency-reset` باقی هستند.

### 4. زیاد: 2FA UI به endpointهایی وصل است که وجود ندارند

**فایل:** `src/app/(admin)/settings/security/page.tsx`

UI این مسیرها را صدا می‌زند:
- `/api/auth/totp/status`
- `/api/auth/totp/setup`
- `/api/auth/totp/confirm`
- `/api/auth/totp/disable`

اما در پروژه فقط APIهای `/api/v1/...` وجود دارند و routeهای TOTP پیاده‌سازی نشده‌اند. بنابراین فعال/غیرفعال‌سازی 2FA از پنل کار نمی‌کند.

**پیشنهاد اصلاح:**
- endpointهای `/api/v1/auth/totp/*` پیاده‌سازی شود.
- UI به `/api/v1/auth/totp/*` اصلاح شود.
- backup codes باید hash شوند، نه خام.

### 5. زیاد: وابستگی‌های آسیب‌پذیر

`npm audit` تعداد 8 آسیب‌پذیری گزارش کرد: 1 low، 3 moderate، 4 high.

مهم‌ترین‌ها:
- `next` در نسخه فعلی `14.2.35` چند advisory DoS/SSRF/cache poisoning/XSS دارد و audit پیشنهاد upgrade به `15.5.16` می‌دهد.
- `cookie <0.7.0` آسیب‌پذیری low دارد.
- `imagekit` deprecated و وابسته به `uuid` آسیب‌پذیر است.
- `eslint-config-next` از مسیر `glob` high گزارش شده است.

**پیشنهاد اصلاح:**
- اگر مهاجرت ممکن است: Next را به نسخه امن‌تر ارتقا دهید و breaking changes را تست کنید.
- `cookie` را به `^0.7.0` یا بالاتر ارتقا دهید.
- اگر ImageKit واقعاً استفاده نشده، dependency را حذف کنید؛ اگر لازم است به `@imagekit/nodejs` مهاجرت کنید.

### 6. متوسط: Media upload validation ندارد و base64 در MongoDB ذخیره می‌کند

**فایل:** `src/app/api/v1/media/route.ts`

هر نوع فایل و هر اندازه‌ای پذیرفته می‌شود و فایل به data URL در MongoDB تبدیل می‌شود.

**ریسک:** پر شدن DB، عبور از limit سند MongoDB، آپلود MIME نامعتبر، هزینه و latency بالا.

**پیشنهاد اصلاح:**
- allowlist نوع فایل؛ مثلاً image/jpeg/png/webp.
- محدودیت اندازه؛ مثلاً 2-5MB.
- ذخیره در object storage مانند S3/Cloudinary/Vercel Blob.
- metadata را در MongoDB نگه دارید، نه محتوای کامل فایل.

### 7. متوسط: client API برای Media endpointهای غیرموجود دارد

**فایل‌ها:**
- `src/lib/api/client.ts`
- `src/app/api/v1/media/[id]/route.ts`

Client این عملیات‌ها را دارد:
- `PATCH /api/v1/media/:id`
- `PUT /api/v1/media/:id/replace`

ولی route فعلی فقط `GET` و `DELETE` دارد. بنابراین ویرایش alt/caption و replace media در UI شکست می‌خورد.

### 8. متوسط: AuthGuard تعریف شده ولی استفاده نشده است

**فایل‌ها:**
- `src/components/auth/AuthGuard.tsx`
- `src/components/Providers.tsx`
- `src/app/layout.tsx`

`AuthGuard` در layout/providers استفاده نشده، بنابراین صفحات ادمین در سطح UI redirect نمی‌شوند. APIها تا حدی محافظت شده‌اند، اما UX و defense-in-depth ناقص است.

### 9. متوسط: Session و JWT duration ناسازگارند

در login، auth cookie چهار ساعت maxAge دارد ولی JWT default هفت روز است. همچنین token در response JSON برگردانده می‌شود.

**پیشنهاد:**
- expiry JWT و cookie را هماهنگ کنید.
- اگر فقط Cookie Auth می‌خواهید، token را در JSON برنگردانید.
- refresh token/session revocation طراحی کنید.

### 10. متوسط: rate limit حافظه‌ای و ناپایدار است

**فایل:** `src/lib/utils/rate-limit.ts`

Rate limit با `Map` داخل حافظه پیاده‌سازی شده؛ در serverless/multi-instance بین instanceها مشترک نیست و با restart پاک می‌شود.

**پیشنهاد:** Redis/Upstash یا rate-limiter پایدار.

### 11. کم/متوسط: IP allowlist با `unknown` bypass می‌شود

**فایل:** `middleware.ts`

اگر `ALLOWED_IPS` تنظیم باشد اما IP `unknown` تشخیص داده شود، درخواست reject نمی‌شود. این در محیط‌هایی که header proxy درست تنظیم نشده خطرناک است.

**پیشنهاد:** وقتی allowlist فعال است، `unknown` هم reject شود مگر explicit dev mode.

### 12. کم: Health route bug

**فایل:** `src/app/api/v1/health/route.ts`

`uptime: process.uptime` باید `process.uptime()` باشد.

### 13. کم: Dashboard با HTTP fetch داخلی به `NEXT_PUBLIC_APP_URL` داده می‌گیرد

**فایل:** `src/app/(admin)/page.tsx`

برای گرفتن آمار از داخل Server Component، به جای HTTP round-trip بهتر است مستقیماً DB query شود. همچنین اگر `NEXT_PUBLIC_APP_URL` غلط باشد داشبورد صفر نشان می‌دهد.

## هشدارهای lint

- چندین هشدار `react-hooks/exhaustive-deps` در صفحات admin.
- چندین هشدار `@next/next/no-img-element` برای استفاده از `<img>`.
- `useConfirm.tsx` وابستگی‌های useCallback ناقص دارد.

## پیشنهاد نقشه راه اصلاح

1. **فوری قبل از هر deploy:** revoke/rotate توکن GitHub افشاشده.
2. **Security hotfix:** اصلاح `requireAuth/requireRole` و اتکا نکردن به `cms-user-info` برای authorization.
3. **Data exposure hotfix:** محدود کردن GET posts عمومی به `published`.
4. **Password reset:** انجام شد؛ قابلیت reset اینترنتی حذف شد.
5. **2FA:** پیاده‌سازی endpointهای TOTP یا حذف UI تا زمان آماده بودن.
6. **Dependency upgrade:** Next/cookie/imagekit و اجرای regression test.
7. **Media storage:** اضافه کردن validation و object storage.
8. **AuthGuard و RBAC UI:** استفاده از Guard و مخفی کردن menuهای غیرمجاز.
9. **Production hardening:** rate limit پایدار، CSRF/origin check برای mutating endpoints، CSP، logging امن.

## وضعیت کلی

کد از نظر TypeScript و build قابل قبول است، اما برای production هنوز آماده نیست. مهم‌ترین ریسک‌ها authorization مبتنی بر cookie قابل تغییر، افشای draftها، reset password خراب، و 2FA نیمه‌کاره هستند.

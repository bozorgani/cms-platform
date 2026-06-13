# CMS Platform - Unified Next.js Application

A complete CMS with admin panel, public blog, and API in one Next.js project.

## Features

- **Admin Panel**: Posts, Categories, Tags, Media, Users management
- **API**: RESTful endpoints at `/api/v1/*`
- **Public Blog**: SEO-friendly public pages (coming soon)
- **Security**: HttpOnly cookies, JWT, 2FA (TOTP), rate limiting, Telegram alerts
- **Database**: MongoDB with Mongoose ODM

## Quick Start

### 1. Install dependencies
\`\`\`bash
npm install
\`\`\`

### 2. Setup environment
\`\`\`bash
cp .env.example .env.local
# Edit .env.local with your values:
# - MONGODB_URI
# - JWT_SECRET (64 char hex)
# - CMS_ENCRYPTION_KEY (64 char hex)
\`\`\`

### 3. Create first admin user
\`\`\`bash
npm run create-user -- admin@example.com StrongPass123 "Admin" admin
\`\`\`

### 4. Start development server
\`\`\`bash
npm run dev
# Open http://localhost:3001
\`\`\`

## URLs

### Admin
- \`/\` - Dashboard
- \`/posts\` - Posts management
- \`/categories\` - Categories
- \`/tags\` - Tags
- \`/media\` - Media library
- \`/users\` - User management (admin only)
- \`/settings\` - Settings

### Auth
- \`/login\` - Login
- \`/forgot-password\` - Request reset link
- \`/reset-password?token=xxx\` - Reset with token

### API (versioned at /v1)
- \`GET /api/v1/health\` - Health check
- \`POST /api/v1/auth/login\` - Login
- \`POST /api/v1/auth/logout\` - Logout
- \`GET /api/v1/auth/me\` - Current user
- \`POST /api/v1/auth/forgot-password\` - Request reset
- \`POST /api/v1/auth/reset-password\` - Reset with token
- \`GET /api/v1/posts\` - List posts
- \`POST /api/v1/posts\` - Create post (auth)
- \`GET /api/v1/posts/:id\` - Get post
- \`PATCH /api/v1/posts/:id\` - Update (auth)
- \`DELETE /api/v1/posts/:id\` - Delete (auth)
- \`GET /api/v1/categories\` - List
- \`POST /api/v1/categories\` - Create (auth)
- \`GET /api/v1/categories/:id\` - Get
- \`PATCH /api/v1/categories/:id\` - Update (auth)
- \`DELETE /api/v1/categories/:id\` - Delete (auth)
- \`GET /api/v1/tags\` - List
- \`POST /api/v1/tags\` - Create (auth)
- \`GET /api/v1/tags/:id\` - Get
- \`PATCH /api/v1/tags/:id\` - Update (auth)
- \`DELETE /api/v1/tags/:id\` - Delete (auth)
- \`GET /api/v1/media\` - List
- \`POST /api/v1/media\` - Upload (auth)
- \`GET /api/v1/media/:id\` - Get
- \`DELETE /api/v1/media/:id\` - Delete (auth)
- \`GET /api/v1/users\` - List (admin)
- \`POST /api/v1/users\` - Create (admin)
- \`GET /api/v1/users/:id\` - Get (admin)
- \`PATCH /api/v1/users/:id\` - Update (admin)
- \`DELETE /api/v1/users/:id\` - Delete (admin)

## Scripts

\`\`\`bash
npm run dev              # Start dev server
npm run build            # Build for production
npm run start            # Run production
npm run lint             # ESLint
npm run type-check       # TypeScript check
npm run create-user      # Create user via CLI
npm run reset-password   # Reset password via CLI
\`\`\`

## Tech Stack

- Next.js 14 (App Router)
- TypeScript 5
- MongoDB + Mongoose 8
- JWT authentication
- TOTP 2FA
- Tailwind CSS
- bcryptjs for passwords
- Vercel-ready deployment

## Security Features

- HttpOnly + Secure + SameSite cookies
- JWT with role-based access control
- 2FA with TOTP (Google Authenticator compatible)
- Rate limiting on auth endpoints
- Telegram notifications for security events
- IP allowlist support
- Security headers (CSP, HSTS, X-Frame-Options)
- Encrypted TOTP secrets (AES-256-GCM)
- bcrypt password hashing (cost 10)

## Environment Variables
## License

MIT

## Environment Variables

### Required (الزامی)

| Variable | Description | Example |
|----------|-------------|---------|
| `MONGODB_URI` | MongoDB connection string | `mongodb://localhost:27017/cms-platform` |
| `JWT_SECRET` | 64-char hex for JWT signing | `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `CMS_ENCRYPTION_KEY` | 64-char hex for encryption | Same as above (generate new) |

### Optional (اختیاری)

| Variable | Description | When needed |
|----------|-------------|-------------|
| `NEXT_PUBLIC_APP_URL` | Public URL of your site | Production (for reset links, OG tags) |
| `ALLOWED_IPS` | Comma-separated IP allowlist | When you want to restrict access |
| `TRUST_PROXY` | Trust X-Forwarded-For | `true` for Vercel/proxies |
| `TELEGRAM_BOT_TOKEN` | Telegram bot for notifications | If you want security alerts |
| `TELEGRAM_CHAT_ID` | Your Telegram chat ID | With TELEGRAM_BOT_TOKEN |

### Media Storage (اختیاری - NOT in current code)

| Service | Variables | Notes |
|---------|-----------|-------|
| ImageKit | `IMAGEKIT_*` | ⚠️ Not implemented yet - placeholder only |
| Vercel Blob | `BLOB_READ_WRITE_TOKEN` | ✅ Best for Vercel |
| Cloudinary | `CLOUDINARY_*` | ✅ Best for images |
| AWS S3 | `AWS_*` + `S3_BUCKET` | ✅ Scalable |

**Current implementation**: Media is stored as base64 data URLs in MongoDB.
- ✅ Works for MVP/development
- ❌ Not scalable (16MB MongoDB doc limit)
- 💡 Recommended: Use Vercel Blob or Cloudinary for production

## License

MIT

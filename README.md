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

| Variable | Required | Description |
|----------|----------|-------------|
| MONGODB_URI | Yes | MongoDB connection string |
| JWT_SECRET | Yes | 64-char hex string for JWT signing |
| CMS_ENCRYPTION_KEY | Yes | 64-char hex string for encryption |
| NEXT_PUBLIC_APP_URL | No | Public URL (default: localhost) |
| ALLOWED_IPS | No | Comma-separated IP allowlist |
| TRUST_PROXY | No | Trust X-Forwarded-For (true/false) |
| TELEGRAM_BOT_TOKEN | No | Telegram bot for notifications |
| TELEGRAM_CHAT_ID | No | Telegram chat ID |
| IMAGEKIT_* | No | ImageKit for media hosting |

Generate random secrets:
\`\`\`bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
\`\`\`

## License

MIT

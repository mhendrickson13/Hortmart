# CXFlow Academy — E-Learning Platform

Production-grade LMS powering **CXFlow Academy** (`lms.cxflow.io`). Serverless backend on AWS Lambda, static SPA on CloudFront/S3, MySQL (RDS) datastore.

---

## Architecture

```
                ┌──────────────────────────────────────────────┐
                │              Amazon CloudFront                │
                │  ┌──────────────────────────────────────┐    │
                │  │   CloudFront Function (og-bot-rewrite)│    │
                │  │   Detects social crawlers → serves    │    │
                │  │   pre-rendered OG HTML from S3        │    │
                │  └──────────────────────────────────────┘    │
                └──────┬──────────────────────────┬────────────┘
                       │ /e/*  (API)              │ /* (SPA)
                       ▼                          ▼
              ┌─────────────────┐       ┌──────────────────┐
              │  AWS Lambda     │       │  S3 Bucket       │
              │  (Express.js)   │       │  static-frontend │
              │  @vendia/       │       │  dist/           │
              │  serverless-    │       └──────────────────┘
              │  express        │
              └────────┬────────┘
                       │
              ┌────────▼────────┐
              │  Amazon RDS     │
              │  MySQL 8.0      │
              └─────────────────┘
```

| Layer | Technology | Notes |
|-------|-----------|-------|
| **Frontend** | React 18 + Vite + TypeScript | SPA hosted on S3, served via CloudFront |
| **Backend** | Express.js on AWS Lambda | Wrapped with `@vendia/serverless-express` |
| **Database** | MySQL 8.0 (RDS) | Raw `mysql2/promise` — no ORM in prod (< 5 MB deploy) |
| **CDN** | CloudFront + CloudFront Functions | OG bot rewriting for social previews |
| **Auth** | JWT (HS256) | Stateless tokens, stored in `localStorage` |
| **Email** | Nodemailer → SendGrid SMTP | Transactional emails (invites, password reset) |
| **Video** | HLS via hls.js | AWS MediaConvert for transcoding, S3 for storage |
| **i18n** | react-i18next | EN, ES, PT, FR — geo-detected on first visit |

---

## Repository Structure

```
Hortmart/
├── backend/                    # Express.js API (Lambda-deployable)
│   ├── src/                    # TypeScript source
│   │   ├── app.ts             # Express app & route registration
│   │   ├── lambda.ts          # Lambda entrypoint (@vendia/serverless-express)
│   │   ├── db.ts              # mysql2/promise pool + helpers (query, execute, genId)
│   │   ├── cache.ts           # In-memory TTL cache for warm Lambda containers
│   │   ├── email.ts           # Nodemailer / SendGrid transactional emails
│   │   ├── og.ts              # OG HTML generator → S3 upload for social previews
│   │   ├── middleware/auth.ts # JWT verification middleware
│   │   └── routes/            # Resource route handlers
│   ├── lambda-deploy/          # Compiled JS bundle deployed to Lambda
│   │   └── prisma/schema.prisma  # Schema reference (not used at runtime)
│   ├── package.json
│   └── tsconfig.json
│
├── static-frontend/            # React SPA (Vite)
│   ├── src/
│   │   ├── App.tsx            # React Router v6 route definitions
│   │   ├── pages/             # 22 page components
│   │   ├── components/        # admin/ learner/ shared/ ui/
│   │   ├── layouts/           # AdminLayout, LearnerLayout, PlayerLayout, etc.
│   │   ├── hooks/             # Custom React hooks
│   │   ├── lib/               # api-client, auth-context, i18n, theme, validation
│   │   └── locales/           # en.json, es.json, pt.json, fr.json
│   ├── public/                # Static assets
│   ├── vite.config.ts
│   └── package.json
│
├── cf-function.js              # CloudFront Function: OG bot rewrite
├── cf-function-updated.js      # Updated CF function variant
├── cf-dist-config.json         # CloudFront distribution configuration
├── cf-dist-update.json         # Distribution update payload
└── payload.json / response.json # AWS CLI reference payloads
```

---

## Prerequisites

| Dependency | Version |
|-----------|---------|
| Node.js | 18+ |
| npm | 9+ |
| MySQL | 8.0+ (or RDS-compatible) |
| AWS CLI | v2 (for deployment) |

---

## Local Development

### 1. Backend

```bash
cd backend
npm install
```

Create `.env`:

```env
DATABASE_URL="mysql://user:pass@localhost:3306/cxflow"
JWT_SECRET="change-me-in-production"
JWT_EXPIRES_IN="7d"
PORT=3001
FRONTEND_URL="http://localhost:3000"

# Email (optional for local dev)
SMTP_HOST="smtp.sendgrid.net"
SMTP_PORT=587
EMAIL_USER="apikey"
EMAIL_PASSWORD=""
EMAIL_FROM="CXFlow Academy <noreply@cxflow.io>"

# AWS (optional — only needed for uploads, video, OG)
AWS_REGION="us-east-1"
S3_BUCKET="cxflowio"
```

```bash
npm run dev          # tsx watch — hot reload on :3001
```

Health check: `GET http://localhost:3001/e/test`

### 2. Frontend

```bash
cd static-frontend
npm install
```

Create `.env`:

```env
VITE_API_URL="http://localhost:3001"
```

```bash
npm run dev          # Vite dev server on :3000
```

### 3. Test Accounts

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@cxflow.io | admin123 |
| Creator | creator@cxflow.io | creator123 |
| Learner | juan@example.com | learner123 |

---

## Key Features

### Learner Experience
- Course catalog with full-text search and category filtering
- HLS video player with progress tracking and resume
- Module/lesson curriculum with free preview support
- Per-lesson notes (timestamped), Q&A, and downloadable resources
- Course reviews and ratings
- Favourites / wishlist
- Multi-language UI (EN / ES / PT / FR) with geo-detection

### Admin / Creator Experience
- Platform dashboard with enrollment and revenue analytics
- Course CRUD with cover image uploads (S3 presigned URLs)
- Drag-and-drop curriculum builder (modules → lessons)
- Video upload with automatic HLS transcoding (MediaConvert)
- User management with role assignment and block/unblock
- Per-course analytics (completions, drop-off, engagement)
- Invite system with email delivery
- Platform settings (branding, language, notifications)

### Infrastructure
- **Serverless**: Express wrapped via `@vendia/serverless-express` — zero idle cost
- **OG Social Previews**: CloudFront Function detects bots, serves pre-rendered HTML from S3
- **In-memory Cache**: TTL cache survives warm Lambda containers, auto-evicts on cold start
- **Optimized Bundle**: No ORM in production — raw `mysql2` keeps Lambda package < 5 MB
- **Code Splitting**: Vite manual chunks (react, radix, hls.js, tanstack-query)

---

## Deployment

### Backend → AWS Lambda

```bash
cd backend
npm run build                         # tsc → lambda-deploy/
cd lambda-deploy
zip -r function.zip .                 # Package for Lambda upload
```

Upload `function.zip` to Lambda. Set handler to `lambda.handler`.

Required Lambda environment variables: `DATABASE_URL`, `JWT_SECRET`, `S3_BUCKET`, `AWS_REGION`, `FRONTEND_URL`, `SMTP_*`.

### Frontend → S3 + CloudFront

```bash
cd static-frontend
VITE_API_URL="https://your-api-domain.com" npm run build
aws s3 sync dist/ s3://your-bucket/academy/ --delete
aws cloudfront create-invalidation --distribution-id XXXXX --paths "/*"
```

### CloudFront Function

Deploy `cf-function.js` as a **viewer request** function on the CloudFront distribution to enable OG bot rewriting for social link previews.

---

## API Reference

All endpoints are prefixed with `/e/`.

| Group | Endpoints | Auth |
|-------|----------|------|
| **Auth** | `POST /auth/register`, `POST /auth/login`, `GET /auth/session` | Public / JWT |
| **Users** | `GET /users`, `GET/PATCH/DELETE /users/:id`, `GET/PATCH /users/profile`, `PATCH /users/password` | JWT (Admin for list/delete) |
| **Courses** | `GET /courses`, `GET /courses/search`, `POST /courses`, `GET/PATCH/DELETE /courses/:id`, enroll, progress, publish/unpublish | JWT (Creator+ for mutations) |
| **Modules** | `GET/PATCH/DELETE /modules/:id`, reorder lessons | JWT (Creator+) |
| **Lessons** | `GET/PATCH/DELETE /lessons/:id`, progress, notes, Q&A, resources | JWT |
| **Questions** | `GET/PATCH/DELETE /questions/:id`, `POST /questions/:id/answers` | JWT |
| **Answers** | `GET/PATCH/DELETE /answers/:id`, `POST /answers/:id/accept` | JWT |
| **Notes** | `GET/PATCH/DELETE /notes/:id` | JWT (owner) |
| **Resources** | `GET/PATCH/DELETE /resources/:id` | JWT (Creator+) |
| **Reviews** | `GET/PATCH/DELETE /reviews/:id` | JWT |
| **Favourites** | `GET /favourites`, `POST/DELETE /favourites/:courseId` | JWT |
| **Uploads** | `POST /uploads/presign`, `POST /uploads/video` | JWT (Creator+) |
| **Video** | `GET /video/:id/stream` | JWT |
| **Notifications** | `GET /notifications`, `PATCH /notifications/:id/read` | JWT |
| **Settings** | `GET/PATCH /settings` | JWT (Admin) |
| **Invites** | `POST /invites`, `GET /invites/:token` | JWT (Admin) / Public |
| **Analytics** | `GET /analytics`, `GET /courses/:id/analytics` | JWT (Admin/Creator) |
| **External** | External integration endpoints | Varies |

See [backend/README.md](./backend/README.md) for full endpoint documentation.

---

## Database Schema

MySQL 8.0 with the following core models:

| Model | Purpose |
|-------|---------|
| `users` | Accounts with roles (LEARNER / CREATOR / ADMIN) |
| `courses` | Course metadata, status (DRAFT / PUBLISHED / ARCHIVED) |
| `modules` | Ordered sections within a course |
| `lessons` | Video lessons with duration, position, free-preview flag |
| `resources` | Downloadable files attached to lessons |
| `enrollments` | User ↔ Course enrollment records |
| `lesson_progress` | Per-lesson watch progress and completion |
| `questions` / `answers` | Lesson-level Q&A |
| `notes` | Timestamped user notes on lessons |
| `reviews` | Course ratings (1–5) with comments |

Schema reference: [`backend/lambda-deploy/prisma/schema.prisma`](./backend/lambda-deploy/prisma/schema.prisma)

---

## Tech Stack Summary

| Category | Technology |
|----------|-----------|
| Language | TypeScript 5.3 |
| Frontend | React 18, React Router 6, TanStack Query 5, Radix UI, Tailwind CSS 3.4 |
| Build | Vite 5 |
| Backend | Express 4, mysql2, bcryptjs, jsonwebtoken, nodemailer |
| Runtime | AWS Lambda (Node.js 20) |
| Database | MySQL 8.0 (Amazon RDS) |
| Storage | Amazon S3 |
| CDN | Amazon CloudFront + CloudFront Functions |
| Video | HLS (hls.js client), AWS MediaConvert |
| i18n | react-i18next (EN, ES, PT, FR) |
| Validation | Zod (frontend), manual (backend) |

---
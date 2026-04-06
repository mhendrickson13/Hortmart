# CXFlow Backend API

Serverless Express.js API for CXFlow Academy. Runs on **AWS Lambda** via `@vendia/serverless-express`. Uses raw **mysql2/promise** instead of an ORM to keep the deploy package under 5 MB.

---

## Quick Start (Local)

### 1. Install

```bash
cd backend
npm install
```

### 2. Environment

```bash
cp .env.example .env
```

```env
# ── Required ──
DATABASE_URL="mysql://user:pass@localhost:3306/cxflow"
JWT_SECRET="change-in-production"
JWT_EXPIRES_IN="7d"
PORT=3001
FRONTEND_URL="http://localhost:3000"

# ── Email (SendGrid SMTP) ──
SMTP_HOST="smtp.sendgrid.net"
SMTP_PORT=587
SMTP_SECURE=false
EMAIL_USER="apikey"
EMAIL_PASSWORD="SG.xxxxx"
EMAIL_FROM="CXFlow Academy <noreply@cxflow.io>"

# ── AWS (uploads, video, OG previews) ──
AWS_REGION="us-east-1"
S3_BUCKET="cxflowio"

# ── Setup endpoint protection ──
SETUP_KEY="cxflow-lms-setup-2026"
```

### 3. Run

```bash
npm run dev          # tsx watch — hot reload on :3001
```

Health check: `GET http://localhost:3001/e/test`

### 4. Build (for Lambda)

```bash
npm run build        # tsc → lambda-deploy/
```

---

## Project Structure

```
backend/
├── src/
│   ├── index.ts              # Local dev entrypoint (Express listen)
│   ├── lambda.ts             # AWS Lambda handler (@vendia/serverless-express)
│   ├── app.ts                # Express app, CORS config, route registration
│   ├── db.ts                 # mysql2/promise pool, query/execute/genId helpers
│   ├── cache.ts              # In-memory TTL cache (warm Lambda optimization)
│   ├── email.ts              # Nodemailer transactional emails (SendGrid)
│   ├── og.ts                 # OG HTML generator → S3 for social previews
│   ├── activity.ts           # User activity tracking
│   ├── middleware/
│   │   └── auth.ts           # JWT verification & role-based access
│   └── routes/
│       ├── auth.ts           # Registration, login, session
│       ├── users.ts          # User CRUD, profile, password
│       ├── courses.ts        # Course CRUD, enroll, publish, progress
│       ├── modules.ts        # Module CRUD, lesson reordering
│       ├── lessons.ts        # Lesson CRUD, progress, notes, Q&A, resources
│       ├── questions.ts      # Question CRUD
│       ├── answers.ts        # Answer CRUD, accept
│       ├── notes.ts          # Note CRUD
│       ├── resources.ts      # Resource CRUD
│       ├── reviews.ts        # Review CRUD
│       ├── favourites.ts     # Favourites/wishlist
│       ├── uploads.ts        # S3 presigned URL generation
│       ├── video.ts          # HLS streaming endpoints
│       ├── notifications.ts  # Notification management
│       ├── settings.ts       # Platform settings (admin)
│       ├── invites.ts        # Email invite system
│       ├── analytics.ts      # Dashboard & course analytics
│       └── external.ts       # External integrations
├── lambda-deploy/             # Compiled JS output (deployed to Lambda)
│   └── prisma/schema.prisma  # Schema reference (not used at runtime)
├── package.json
└── tsconfig.json
```

---

## Runtime Architecture

```
Client → CloudFront → API Gateway → Lambda → Express.js → MySQL (RDS)
                                       │
                                       ├── S3 (uploads, OG pages, video)
                                       └── SendGrid (transactional email)
```

### Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| Raw `mysql2` over Prisma | Lambda deploy < 5 MB; Prisma client + engine ≈ 15 MB |
| In-memory TTL cache | Exploits warm Lambda containers; auto-clears on cold start |
| `@vendia/serverless-express` | Full Express compatibility on Lambda with zero refactor |
| CUID-style IDs via `crypto` | Compatible with existing VARCHAR(30) columns; no dependency |
| Connection pool (limit 5) | Matches RDS proxy concurrency per Lambda instance |

---

## Test Accounts

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@cxflow.io | admin123 |
| Creator | creator@cxflow.io | creator123 |
| Learner | juan@example.com | learner123 |

---

## API Reference

All endpoints are prefixed with `/e/`. Authentication is via `Authorization: Bearer <JWT>` header.

### Authentication

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/e/auth/register` | Public | Register new user |
| `POST` | `/e/auth/login` | Public | Login → JWT token |
| `GET` | `/e/auth/session` | JWT | Validate session, return user |

### Users

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/e/users` | Admin | List all users (paginated) |
| `GET` | `/e/users/:id` | JWT | Get user by ID |
| `PATCH` | `/e/users/:id` | Admin | Update user (role, block) |
| `DELETE` | `/e/users/:id` | Admin | Delete user |
| `GET` | `/e/users/profile` | JWT | Get own profile |
| `PATCH` | `/e/users/profile` | JWT | Update own profile |
| `PATCH` | `/e/users/password` | JWT | Change password |
| `GET` | `/e/users/:id/enrollments` | JWT | Get user enrollments |

### Courses

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/e/courses` | Public | List published courses |
| `GET` | `/e/courses/search` | Public | Full-text search |
| `POST` | `/e/courses` | Creator+ | Create course |
| `GET` | `/e/courses/:id` | Public | Get course with curriculum |
| `PATCH` | `/e/courses/:id` | Creator+ | Update course |
| `DELETE` | `/e/courses/:id` | Creator+ | Delete course |
| `POST` | `/e/courses/:id/enroll` | JWT | Enroll in course |
| `GET` | `/e/courses/:id/enroll` | JWT | Check enrollment status |
| `DELETE` | `/e/courses/:id/enroll` | JWT | Unenroll |
| `GET` | `/e/courses/:id/progress` | JWT | Get course progress |
| `POST` | `/e/courses/:id/modules` | Creator+ | Add module |
| `POST` | `/e/courses/:id/lessons` | Creator+ | Add lesson |
| `PATCH` | `/e/courses/:id/reorder` | Creator+ | Reorder modules |
| `POST` | `/e/courses/:id/publish` | Creator+ | Publish course |
| `DELETE` | `/e/courses/:id/publish` | Creator+ | Unpublish course |
| `GET` | `/e/courses/:id/reviews` | Public | Get course reviews |
| `POST` | `/e/courses/:id/reviews` | JWT | Create review |
| `GET` | `/e/courses/:id/analytics` | Creator+ | Course analytics |

### Modules

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/e/modules/:id` | JWT | Get module |
| `PATCH` | `/e/modules/:id` | Creator+ | Update module |
| `DELETE` | `/e/modules/:id` | Creator+ | Delete module |
| `PATCH` | `/e/modules/:id/reorder` | Creator+ | Reorder lessons |

### Lessons

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/e/lessons/:id` | JWT | Get lesson |
| `PATCH` | `/e/lessons/:id` | Creator+ | Update lesson |
| `DELETE` | `/e/lessons/:id` | Creator+ | Delete lesson |
| `GET` | `/e/lessons/:id/progress` | JWT | Get lesson progress |
| `POST` | `/e/lessons/:id/progress` | JWT | Update watch progress |
| `GET` | `/e/lessons/:id/notes` | JWT | Get user notes |
| `POST` | `/e/lessons/:id/notes` | JWT | Create note |
| `GET` | `/e/lessons/:id/questions` | JWT | Get Q&A |
| `POST` | `/e/lessons/:id/questions` | JWT | Ask question |
| `GET` | `/e/lessons/:id/resources` | JWT | Get resources |
| `POST` | `/e/lessons/:id/resources` | Creator+ | Add resource |

### Questions & Answers

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/e/questions/:id` | JWT | Get question |
| `PATCH` | `/e/questions/:id` | JWT | Update question (owner) |
| `DELETE` | `/e/questions/:id` | JWT | Delete question (owner) |
| `POST` | `/e/questions/:id/answers` | JWT | Post answer |
| `GET` | `/e/answers/:id` | JWT | Get answer |
| `PATCH` | `/e/answers/:id` | JWT | Update answer (owner) |
| `DELETE` | `/e/answers/:id` | JWT | Delete answer (owner) |
| `POST` | `/e/answers/:id/accept` | JWT | Mark as accepted (creator) |

### Notes

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/e/notes/:id` | JWT | Get note (owner) |
| `PATCH` | `/e/notes/:id` | JWT | Update note (owner) |
| `DELETE` | `/e/notes/:id` | JWT | Delete note (owner) |

### Resources

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/e/resources/:id` | JWT | Get resource |
| `PATCH` | `/e/resources/:id` | Creator+ | Update resource |
| `DELETE` | `/e/resources/:id` | Creator+ | Delete resource |

### Reviews

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/e/reviews/:id` | Public | Get review |
| `PATCH` | `/e/reviews/:id` | JWT | Update review (owner) |
| `DELETE` | `/e/reviews/:id` | JWT | Delete review (owner) |

### Favourites

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/e/favourites` | JWT | List favourites |
| `POST` | `/e/favourites/:courseId` | JWT | Add to favourites |
| `DELETE` | `/e/favourites/:courseId` | JWT | Remove from favourites |

### Uploads & Video

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/e/uploads/presign` | Creator+ | Generate S3 presigned URL |
| `POST` | `/e/uploads/video` | Creator+ | Initiate video upload + transcoding |
| `GET` | `/e/video/:id/stream` | JWT | Get HLS streaming URL |

### Notifications

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/e/notifications` | JWT | List notifications |
| `PATCH` | `/e/notifications/:id/read` | JWT | Mark as read |

### Settings & Invites

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/e/settings` | Admin | Get platform settings |
| `PATCH` | `/e/settings` | Admin | Update platform settings |
| `POST` | `/e/invites` | Admin | Send invite email |
| `GET` | `/e/invites/:token` | Public | Validate invite token |

### Analytics

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/e/analytics` | Admin | Platform-wide dashboard analytics |
| `GET` | `/e/courses/:id/analytics` | Creator+ | Per-course analytics |

---

## Database

MySQL 8.0 (Amazon RDS). Schema defined in Prisma format for documentation; runtime uses raw SQL via `mysql2/promise`.

### Core Models

| Table | Purpose | Key Indexes |
|-------|---------|-------------|
| `users` | Accounts (LEARNER / CREATOR / ADMIN) | `email` UNIQUE |
| `courses` | Course metadata + status lifecycle | `creatorId`, `status` |
| `modules` | Ordered sections in a course | `courseId` |
| `lessons` | Video lessons with position & preview flags | `moduleId` |
| `resources` | Downloadable attachments per lesson | `lessonId` |
| `enrollments` | User ↔ Course (unique pair) | `userId + courseId` UNIQUE |
| `lesson_progress` | Watch progress & completion per lesson | `enrollmentId + lessonId` UNIQUE |
| `questions` | Lesson-level Q&A threads | `lessonId`, `userId` |
| `answers` | Answers to questions | `questionId`, `userId` |
| `notes` | Timestamped user notes on lessons | `lessonId`, `userId` |
| `reviews` | Ratings (1–5) + comments (unique per user/course) | `userId + courseId` UNIQUE |

Schema reference: [`lambda-deploy/prisma/schema.prisma`](./lambda-deploy/prisma/schema.prisma)

### Database Management

```bash
# One-time setup via API (creates tables on RDS)
curl -X POST https://your-api/e/setup \
  -H "Content-Type: application/json" \
  -H "x-setup-key: cxflow-lms-setup-2026"
```

---

## Deployment

### Lambda Package

```bash
npm run build                     # Compile TS → lambda-deploy/
cd lambda-deploy
zip -r function.zip .             # ~3 MB package
# Upload to Lambda via AWS Console or CLI
```

### Required Lambda Environment Variables

| Variable | Example |
|----------|---------|
| `DATABASE_URL` | `mysql://user:pass@rds-host:3306/cxflow` |
| `JWT_SECRET` | Random 64-char string |
| `JWT_EXPIRES_IN` | `7d` |
| `FRONTEND_URL` | `https://lms.cxflow.io` |
| `S3_BUCKET` | `cxflowio` |
| `AWS_REGION` | `us-east-1` |
| `SMTP_HOST` | `smtp.sendgrid.net` |
| `SMTP_PORT` | `587` |
| `EMAIL_USER` | `apikey` |
| `EMAIL_PASSWORD` | `SG.xxxxx` |
| `EMAIL_FROM` | `CXFlow Academy <noreply@cxflow.io>` |
| `NODE_ENV` | `production` |

### Lambda Configuration

- **Runtime**: Node.js 20.x
- **Handler**: `lambda.handler`
- **Memory**: 256 MB (sufficient for mysql2 + Express)
- **Timeout**: 30 s
- **Trigger**: API Gateway (HTTP API, proxy integration)

---

## Scripts

| Script | Command | Description |
|--------|---------|-------------|
| `dev` | `tsx watch src/index.ts` | Local development with hot reload |
| `build` | `tsc` | Compile TypeScript to `lambda-deploy/` |
| `start` | `node dist/index.js` | Run compiled JS locally |

---
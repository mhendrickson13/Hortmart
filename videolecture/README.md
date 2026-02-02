# VideoLecture - E-Learning Platform

A modern, full-stack e-learning platform built with Next.js 14, featuring a beautiful UI based on the provided design mockups.

## Features

### Learner Experience
- **Course Catalog**: Browse and search published courses
- **Course Overview**: View course details, curriculum, and instructor info
- **Course Player**: Watch video lessons with progress tracking
- **Progress Tracking**: Auto-save watch progress, resume where you left off
- **Tabs**: Overview, Q&A, Notes, and Resources per lesson

### Creator/Admin Experience
- **Dashboard**: View revenue, enrollments, active learners, and completion rates
- **Course Management**: Create, edit, and publish courses
- **Curriculum Editor**: Add modules and lessons with drag-and-drop
- **Analytics**: Sales charts and learner progress distribution

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS with custom design tokens
- **Database**: SQLite with Prisma ORM (zero configuration!)
- **Authentication**: NextAuth.js v5
- **State Management**: TanStack Query (React Query)
- **UI Components**: Custom components + Radix UI primitives

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

1. Clone the repository and navigate to the project:
   ```bash
   cd videolecture
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env
   ```
   
   The default SQLite database works out of the box. Optionally update the auth secret:
   ```
   DATABASE_URL="file:./dev.db"
   AUTH_SECRET="your-secret-key"
   ```

4. Generate Prisma client and push schema:
   ```bash
   npx prisma generate
   npx prisma db push
   ```

5. Seed the database with sample data:
   ```bash
   npm run db:seed
   ```

6. Start the development server:
   ```bash
   npm run dev
   ```

7. Open [http://localhost:3000](http://localhost:3000)

### Demo Accounts

After seeding, you can log in with these accounts:

| Role    | Email                      | Password    |
|---------|----------------------------|-------------|
| Learner | learner@videolecture.com   | learner123  |
| Creator | creator@videolecture.com   | creator123  |
| Admin   | admin@videolecture.com     | admin123    |

## Project Structure

```
videolecture/
├── src/
│   ├── app/
│   │   ├── (auth)/           # Login, Register pages
│   │   ├── (learner)/        # Learner routes (courses, player)
│   │   ├── (admin)/          # Admin routes (dashboard, editor)
│   │   └── api/              # API routes
│   ├── components/
│   │   ├── ui/               # Base UI components
│   │   ├── learner/          # Learner-specific components
│   │   ├── admin/            # Admin-specific components
│   │   └── shared/           # Shared components
│   ├── lib/
│   │   ├── db.ts             # Prisma client
│   │   ├── auth.ts           # NextAuth configuration
│   │   └── utils.ts          # Utility functions
│   └── types/                # TypeScript types
├── prisma/
│   ├── schema.prisma         # Database schema
│   └── seed.ts               # Seed data script
└── public/                   # Static assets
```

## Design System

The UI follows a "light, clean, premium SaaS" aesthetic:

- **Primary Color**: #2F6FED (Blue)
- **Background**: #F6F7FB
- **Surface**: #FFFFFF with soft shadows
- **Border Radius**: 12-22px for a modern look
- **Typography**: Poppins font family

## API Routes

| Method | Endpoint                     | Description              |
|--------|------------------------------|--------------------------|
| POST   | /api/auth/register           | Register new user        |
| GET    | /api/courses                 | List published courses   |
| POST   | /api/courses                 | Create course (creator)  |
| PATCH  | /api/courses/[id]            | Update course            |
| POST   | /api/courses/[id]/enroll     | Enroll in course         |
| POST   | /api/courses/[id]/modules    | Add module to course     |
| POST   | /api/courses/[id]/lessons    | Add lesson to course     |
| PATCH  | /api/lessons/[id]            | Update lesson            |
| POST   | /api/lessons/[id]/progress   | Save lesson progress     |

## License

MIT

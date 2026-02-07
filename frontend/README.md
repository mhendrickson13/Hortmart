# CXFlow - E-Learning Platform Frontend

A modern, full-stack e-learning platform built with Next.js 14, featuring a beautiful UI based on the provided design mockups. This frontend connects to the CXFlow backend API.

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
- **Backend API**: External API at api.cxflow.io
- **Authentication**: NextAuth.js (credentials via backend API)
- **State Management**: TanStack Query (React Query)
- **UI Components**: Custom components + Radix UI primitives

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Backend API running (see `../backend/README.md`)

### Installation

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env
   ```
   
   Configure the API URL to point to your backend:
   ```
   NEXT_PUBLIC_API_URL=https://api.cxflow.io/e
   API_URL=https://api.cxflow.io/e
   NEXTAUTH_URL=http://localhost:3000
   NEXTAUTH_SECRET=your-secret-key-here
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000)

### Demo Accounts

Use these accounts to log in (credentials validated against backend):

| Role    | Email                      | Password    |
|---------|----------------------------|-------------|
| Learner | learner@cxflow.io          | learner123  |
| Creator | creator@cxflow.io          | creator123  |
| Admin   | admin@cxflow.io            | admin123    |

## Project Structure

```
frontend/
├── src/
│   ├── app/
│   │   ├── (auth)/           # Login, Register pages
│   │   ├── (learner)/        # Learner routes (courses, player)
│   │   ├── (admin)/          # Admin routes (dashboard, editor)
│   │   ├── (player)/         # Course player layout
│   │   └── (shared)/         # Shared routes (profile, settings)
│   ├── components/
│   │   ├── ui/               # Base UI components
│   │   ├── learner/          # Learner-specific components
│   │   ├── admin/            # Admin-specific components
│   │   └── shared/           # Shared components
│   ├── lib/
│   │   ├── api-client.ts     # API client for backend
│   │   ├── server-api.ts     # Server-side API helpers
│   │   ├── auth.ts           # NextAuth configuration
│   │   └── utils.ts          # Utility functions
│   └── types/                # TypeScript types
└── public/                   # Static assets
```

## Design System

The UI follows a "light, clean, premium SaaS" aesthetic:

- **Primary Color**: #2F6FED (Blue)
- **Background**: #F6F7FB
- **Surface**: #FFFFFF with soft shadows
- **Border Radius**: 12-22px for a modern look
- **Typography**: Poppins font family

## Backend API

This frontend connects to the CXFlow backend API. All data is fetched from and sent to the API endpoints. Key endpoints include:

| Method | Endpoint                     | Description              |
|--------|------------------------------|--------------------------|
| POST   | /auth/register               | Register new user        |
| POST   | /auth/login                  | Login user               |
| GET    | /courses                     | List published courses   |
| GET    | /courses/:id                 | Get course details       |
| POST   | /courses/:id/enroll          | Enroll in course         |
| GET    | /courses/:id/progress        | Get course progress      |
| GET    | /users/profile               | Get current user profile |
| GET    | /analytics                   | Get analytics data       |

See `../docs/backend-api-spec.md` for full API documentation.

## Environment Variables

| Variable             | Required | Description                        |
|---------------------|----------|------------------------------------|
| NEXT_PUBLIC_API_URL | Yes      | Backend API URL (client-side)      |
| API_URL             | Yes      | Backend API URL (server-side)      |
| NEXTAUTH_URL        | Yes      | Frontend URL for NextAuth          |
| NEXTAUTH_SECRET     | Yes      | Secret key for NextAuth sessions   |
| AUTH_SECRET         | Yes      | Legacy NextAuth secret (same value)|
| AUTH_URL            | Yes      | Legacy NextAuth URL (same value)   |

## License

MIT

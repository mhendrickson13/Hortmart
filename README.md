# Hotmart - VideoLecture E-Learning Platform

A modern, full-stack e-learning platform with comprehensive design documentation and implementation.

## Project Overview

This repository contains the complete VideoLecture e-learning platform, including:
- **Next.js Application**: Full-stack implementation with learner and admin features
- **Design Mockups**: HTML prototypes for all major screens
- **Design Documentation**: Comprehensive UX/UI specifications and design system

## Repository Structure

```
Hotmart/
├── videolecture/          # Next.js application (main codebase)
│   ├── src/              # Application source code
│   ├── prisma/           # Database schema and migrations
│   └── README.md         # Detailed setup and development guide
│
├── client_designs/       # HTML mockups and prototypes
│   ├── learner_*.html    # Learner-facing screens
│   ├── admin_*.html      # Admin/creator screens
│   └── course_player_*.html  # Course player variations
│
├── docs/                 # Design documentation
│   └── design/           # UX/UI specifications
│       ├── README.md     # Design docs overview
│       ├── 01-mockup-audit.md
│       ├── 02-design-system.md
│       ├── 03-learner-experience.md
│       ├── 04-admin-experience.md
│       └── 05-handoff.md
│
└── README.md            # This file
```

## Quick Start

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Getting Started

1. **Navigate to the application directory:**
   ```bash
   cd videolecture
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables:**
   ```bash
   cp .env.example .env
   ```

4. **Initialize the database:**
   ```bash
   npx prisma generate
   npx prisma db push
   npm run db:seed
   ```

5. **Start the development server:**
   ```bash
   npm run dev
   ```

6. **Open your browser:**
   Navigate to [http://localhost:3000](http://localhost:3000)

For detailed setup instructions, see [videolecture/README.md](./videolecture/README.md).

### Demo Accounts

After seeding the database, you can log in with:

| Role    | Email                      | Password    |
|---------|----------------------------|-------------|
| Learner | learner@videolecture.com   | learner123  |
| Creator | creator@videolecture.com   | creator123  |
| Admin   | admin@videolecture.com     | admin123    |

## Features

### Learner Experience
- Course catalog with search functionality
- Course overview with curriculum details
- Video player with progress tracking
- Mobile-responsive design
- Progress tracking and completion status

### Admin/Creator Experience
- Dashboard with analytics
- Course creation and management
- Curriculum editor with drag-and-drop
- User management
- Analytics and reporting

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Database**: SQLite with Prisma ORM
- **Authentication**: NextAuth.js v5
- **State Management**: TanStack Query

## Design Resources

- **Design System**: See [docs/design/02-design-system.md](./docs/design/02-design-system.md)
- **Mockups**: Browse HTML files in `client_designs/`
- **UX Specifications**: See [docs/design/README.md](./docs/design/README.md)

## Documentation

- **Application Setup**: [videolecture/README.md](./videolecture/README.md)
- **Design Documentation**: [docs/design/README.md](./docs/design/README.md)

## License

MIT

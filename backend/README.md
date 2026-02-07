# CXFlow Backend API

Backend API for the CXFlow Learning Platform. Built with Express.js, Prisma, and SQLite.

## Quick Start

### 1. Install dependencies

```bash
cd backend
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env` with your settings:

```env
DATABASE_URL="file:./dev.db"
JWT_SECRET="your-super-secret-jwt-key-change-in-production"
JWT_EXPIRES_IN="7d"
PORT=3001
FRONTEND_URL="http://localhost:3000"
```

### 3. Setup database

```bash
# Generate Prisma client
npm run db:generate

# Push schema to database
npm run db:push

# Seed with sample data
npm run db:seed
```

### 4. Run the server

```bash
# Development (with hot reload)
npm run dev

# Production
npm run build
npm start
```

The API will be available at `http://localhost:3001/e`

## Test Accounts

After seeding, use these accounts:

| Role    | Email              | Password    |
|---------|-------------------|-------------|
| Admin   | admin@cxflow.io   | admin123    |
| Creator | creator@cxflow.io | creator123  |
| Learner | juan@example.com  | learner123  |

## API Endpoints

### Authentication
- `POST /e/auth/register` - Register new user
- `POST /e/auth/login` - Login user
- `GET /e/auth/session` - Get current session

### Users
- `GET /e/users` - List users (Admin)
- `GET /e/users/:id` - Get user
- `PATCH /e/users/:id` - Update user
- `DELETE /e/users/:id` - Delete user (Admin)
- `GET /e/users/profile` - Get profile
- `PATCH /e/users/profile` - Update profile
- `PATCH /e/users/password` - Change password
- `GET /e/users/:id/enrollments` - Get enrollments

### Courses
- `GET /e/courses` - List courses
- `GET /e/courses/search` - Search courses
- `POST /e/courses` - Create course
- `GET /e/courses/:id` - Get course
- `PATCH /e/courses/:id` - Update course
- `DELETE /e/courses/:id` - Delete course
- `POST /e/courses/:id/enroll` - Enroll
- `GET /e/courses/:id/enroll` - Check enrollment
- `DELETE /e/courses/:id/enroll` - Unenroll
- `GET /e/courses/:id/progress` - Get progress
- `POST /e/courses/:id/modules` - Create module
- `POST /e/courses/:id/lessons` - Create lesson
- `PATCH /e/courses/:id/reorder` - Reorder modules
- `POST /e/courses/:id/publish` - Publish
- `DELETE /e/courses/:id/publish` - Unpublish
- `GET /e/courses/:id/reviews` - Get reviews
- `POST /e/courses/:id/reviews` - Create review
- `GET /e/courses/:id/analytics` - Get analytics

### Modules
- `GET /e/modules/:id` - Get module
- `PATCH /e/modules/:id` - Update module
- `DELETE /e/modules/:id` - Delete module
- `PATCH /e/modules/:id/reorder` - Reorder lessons

### Lessons
- `GET /e/lessons/:id` - Get lesson
- `PATCH /e/lessons/:id` - Update lesson
- `DELETE /e/lessons/:id` - Delete lesson
- `GET /e/lessons/:id/progress` - Get progress
- `POST /e/lessons/:id/progress` - Update progress
- `GET /e/lessons/:id/notes` - Get notes
- `POST /e/lessons/:id/notes` - Create note
- `GET /e/lessons/:id/questions` - Get Q&A
- `POST /e/lessons/:id/questions` - Ask question
- `GET /e/lessons/:id/resources` - Get resources
- `POST /e/lessons/:id/resources` - Add resource

### Questions & Answers
- `GET /e/questions/:id` - Get question
- `PATCH /e/questions/:id` - Update question
- `DELETE /e/questions/:id` - Delete question
- `POST /e/questions/:id/answers` - Answer question
- `GET /e/answers/:id` - Get answer
- `PATCH /e/answers/:id` - Update answer
- `DELETE /e/answers/:id` - Delete answer
- `POST /e/answers/:id/accept` - Accept answer

### Notes
- `GET /e/notes/:id` - Get note
- `PATCH /e/notes/:id` - Update note
- `DELETE /e/notes/:id` - Delete note

### Resources
- `GET /e/resources/:id` - Get resource
- `PATCH /e/resources/:id` - Update resource
- `DELETE /e/resources/:id` - Delete resource

### Reviews
- `GET /e/reviews/:id` - Get review
- `PATCH /e/reviews/:id` - Update review
- `DELETE /e/reviews/:id` - Delete review

### Analytics
- `GET /e/analytics` - Dashboard analytics (Admin)

## Database Management

```bash
# View database in browser
npm run db:studio

# Reset database (drop all data)
npx prisma db push --force-reset
npm run db:seed
```

## Deployment

### Environment Variables

Set these in production:

```env
DATABASE_URL="file:./prod.db"
JWT_SECRET=your-production-secret-key
JWT_EXPIRES_IN=7d
PORT=3001
NODE_ENV=production
FRONTEND_URL=https://your-frontend-domain.com
```

> **Note:** For production with high traffic, consider migrating to PostgreSQL by changing the provider in `prisma/schema.prisma`.

### Docker

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
RUN npm run db:generate
EXPOSE 3001
CMD ["npm", "start"]
```

## License

MIT

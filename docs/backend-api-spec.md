# Backend API Specification

**Base URL:** `https://api.cxflow.io/e`

This document defines all endpoints required for the frontend to work without mock data.

---

## Authentication

All authenticated endpoints require a session cookie or Bearer token in the `Authorization` header.

```
Authorization: Bearer <token>
```

---

## Database Schema (SQL)

### Users
```sql
CREATE TABLE users (
  id VARCHAR(25) PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  email_verified TIMESTAMP,
  password VARCHAR(255),
  name VARCHAR(255),
  image TEXT,
  bio TEXT,
  role VARCHAR(20) DEFAULT 'LEARNER', -- LEARNER | CREATOR | ADMIN
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Courses
```sql
CREATE TABLE courses (
  id VARCHAR(25) PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  subtitle VARCHAR(255),
  description TEXT,
  cover_image TEXT,
  price DECIMAL(10,2) DEFAULT 0,
  currency VARCHAR(3) DEFAULT 'USD',
  status VARCHAR(20) DEFAULT 'DRAFT', -- DRAFT | PUBLISHED | ARCHIVED
  level VARCHAR(20) DEFAULT 'ALL_LEVELS', -- BEGINNER | INTERMEDIATE | ADVANCED | ALL_LEVELS
  category VARCHAR(100),
  language VARCHAR(50) DEFAULT 'English',
  creator_id VARCHAR(25) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  published_at TIMESTAMP
);
CREATE INDEX idx_courses_creator ON courses(creator_id);
CREATE INDEX idx_courses_status ON courses(status);
```

### Modules
```sql
CREATE TABLE modules (
  id VARCHAR(25) PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  position INT DEFAULT 0,
  course_id VARCHAR(25) NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_modules_course ON modules(course_id);
```

### Lessons
```sql
CREATE TABLE lessons (
  id VARCHAR(25) PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  video_url TEXT,
  duration_seconds INT DEFAULT 0,
  position INT DEFAULT 0,
  is_locked BOOLEAN DEFAULT FALSE,
  is_free_preview BOOLEAN DEFAULT FALSE,
  module_id VARCHAR(25) NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_lessons_module ON lessons(module_id);
```

### Resources
```sql
CREATE TABLE resources (
  id VARCHAR(25) PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL, -- pdf | link | template | video | image
  url TEXT NOT NULL,
  file_size INT,
  lesson_id VARCHAR(25) NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_resources_lesson ON resources(lesson_id);
```

### Enrollments
```sql
CREATE TABLE enrollments (
  id VARCHAR(25) PRIMARY KEY,
  user_id VARCHAR(25) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id VARCHAR(25) NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  enrolled_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, course_id)
);
CREATE INDEX idx_enrollments_user ON enrollments(user_id);
CREATE INDEX idx_enrollments_course ON enrollments(course_id);
```

### Lesson Progress
```sql
CREATE TABLE lesson_progress (
  id VARCHAR(25) PRIMARY KEY,
  enrollment_id VARCHAR(25) NOT NULL REFERENCES enrollments(id) ON DELETE CASCADE,
  lesson_id VARCHAR(25) NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  progress_percent INT DEFAULT 0,
  last_watched_timestamp INT DEFAULT 0,
  last_watched_at TIMESTAMP,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(enrollment_id, lesson_id)
);
CREATE INDEX idx_progress_enrollment ON lesson_progress(enrollment_id);
CREATE INDEX idx_progress_lesson ON lesson_progress(lesson_id);
```

### Questions
```sql
CREATE TABLE questions (
  id VARCHAR(25) PRIMARY KEY,
  content TEXT NOT NULL,
  user_id VARCHAR(25) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lesson_id VARCHAR(25) NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_questions_user ON questions(user_id);
CREATE INDEX idx_questions_lesson ON questions(lesson_id);
```

### Answers
```sql
CREATE TABLE answers (
  id VARCHAR(25) PRIMARY KEY,
  content TEXT NOT NULL,
  user_id VARCHAR(25) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  question_id VARCHAR(25) NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  is_accepted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_answers_user ON answers(user_id);
CREATE INDEX idx_answers_question ON answers(question_id);
```

### Notes
```sql
CREATE TABLE notes (
  id VARCHAR(25) PRIMARY KEY,
  content TEXT NOT NULL,
  timestamp_seconds INT DEFAULT 0,
  user_id VARCHAR(25) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lesson_id VARCHAR(25) NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_notes_user ON notes(user_id);
CREATE INDEX idx_notes_lesson ON notes(lesson_id);
```

### Reviews
```sql
CREATE TABLE reviews (
  id VARCHAR(25) PRIMARY KEY,
  rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  user_id VARCHAR(25) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id VARCHAR(25) NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, course_id)
);
CREATE INDEX idx_reviews_user ON reviews(user_id);
CREATE INDEX idx_reviews_course ON reviews(course_id);
```

---

## API Endpoints

### Response Format

**Success:**
```json
{
  "data": { ... },
  "message": "Success"
}
```

**Error:**
```json
{
  "error": "Error message here"
}
```

**Paginated:**
```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

---

## 1. Authentication Endpoints

### POST /auth/register
Create a new user account.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "securepassword",
  "name": "John Doe"
}
```

**Response (201):**
```json
{
  "user": {
    "id": "clx1234567890",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "LEARNER",
    "createdAt": "2026-02-05T00:00:00.000Z"
  }
}
```

### POST /auth/login
Authenticate user.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "securepassword"
}
```

**Response (200):**
```json
{
  "user": { ... },
  "token": "jwt_token_here"
}
```

### GET /auth/session
Get current session.

**Response (200):**
```json
{
  "user": {
    "id": "clx1234567890",
    "email": "user@example.com",
    "name": "John Doe",
    "image": "https://...",
    "role": "LEARNER"
  }
}
```

---

## 2. Users Endpoints

### GET /users
List all users (Admin only).

**Query Parameters:**
- `page` (number, default: 1)
- `limit` (number, default: 20)
- `search` (string) - Search by name or email
- `role` (string) - Filter by role: LEARNER | CREATOR | ADMIN

**Response (200):**
```json
{
  "users": [
    {
      "id": "clx1234567890",
      "email": "user@example.com",
      "name": "John Doe",
      "image": "https://...",
      "role": "LEARNER",
      "createdAt": "2026-02-05T00:00:00.000Z",
      "_count": {
        "enrollments": 5,
        "courses": 0
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

### GET /users/:id
Get user details (Admin or self).

**Response (200):**
```json
{
  "user": {
    "id": "clx1234567890",
    "email": "user@example.com",
    "name": "John Doe",
    "image": "https://...",
    "bio": "About me...",
    "role": "LEARNER",
    "createdAt": "2026-02-05T00:00:00.000Z",
    "updatedAt": "2026-02-05T00:00:00.000Z",
    "_count": {
      "enrollments": 5,
      "courses": 0,
      "reviews": 3
    }
  }
}
```

### PATCH /users/:id
Update user (Admin or self).

**Request:**
```json
{
  "name": "John Smith",
  "bio": "Updated bio",
  "image": "https://new-image.jpg",
  "role": "CREATOR"  // Admin only
}
```

**Response (200):**
```json
{
  "user": { ... }
}
```

### DELETE /users/:id
Delete user (Admin only).

**Response (200):**
```json
{
  "message": "User deleted successfully"
}
```

### GET /users/:id/enrollments
Get user's enrollments.

**Response (200):**
```json
{
  "enrollments": [
    {
      "id": "enr123",
      "enrolledAt": "2026-02-05T00:00:00.000Z",
      "course": {
        "id": "crs123",
        "title": "Course Title",
        "coverImage": "https://...",
        "creator": {
          "name": "Instructor Name"
        }
      },
      "progress": 45.5  // Percentage
    }
  ]
}
```

### GET /users/profile
Get current user profile.

**Response (200):**
```json
{
  "user": { ... }
}
```

### PATCH /users/profile
Update current user profile.

**Request:**
```json
{
  "name": "New Name",
  "bio": "New bio",
  "image": "https://..."
}
```

### PATCH /users/password
Change password.

**Request:**
```json
{
  "currentPassword": "oldpassword",
  "newPassword": "newpassword"
}
```

---

## 3. Courses Endpoints

### GET /courses
List courses.

**Query Parameters:**
- `page` (number, default: 1)
- `limit` (number, default: 20)
- `status` (string) - DRAFT | PUBLISHED | ARCHIVED
- `creatorId` (string) - Filter by creator

**Response (200):**
```json
{
  "courses": [
    {
      "id": "crs123",
      "title": "Course Title",
      "subtitle": "Course Subtitle",
      "description": "Description...",
      "coverImage": "https://...",
      "price": 99.99,
      "currency": "USD",
      "status": "PUBLISHED",
      "level": "BEGINNER",
      "category": "Programming",
      "language": "English",
      "createdAt": "2026-02-05T00:00:00.000Z",
      "publishedAt": "2026-02-05T00:00:00.000Z",
      "creator": {
        "id": "usr123",
        "name": "Instructor Name",
        "image": "https://..."
      },
      "_count": {
        "modules": 5,
        "enrollments": 120,
        "reviews": 25
      },
      "avgRating": 4.5,
      "totalDuration": 7200  // seconds
    }
  ],
  "pagination": { ... }
}
```

### POST /courses
Create course (Creator/Admin).

**Request:**
```json
{
  "title": "New Course",
  "subtitle": "Learn something new",
  "description": "Detailed description",
  "coverImage": "https://...",
  "price": 49.99,
  "currency": "USD",
  "level": "BEGINNER",
  "category": "Programming",
  "language": "English"
}
```

**Response (201):**
```json
{
  "course": { ... }
}
```

### GET /courses/:id
Get course with modules and lessons.

**Response (200):**
```json
{
  "course": {
    "id": "crs123",
    "title": "Course Title",
    "subtitle": "...",
    "description": "...",
    "coverImage": "https://...",
    "price": 99.99,
    "currency": "USD",
    "status": "PUBLISHED",
    "level": "BEGINNER",
    "category": "Programming",
    "language": "English",
    "createdAt": "...",
    "updatedAt": "...",
    "publishedAt": "...",
    "creator": {
      "id": "usr123",
      "name": "Instructor",
      "image": "...",
      "bio": "..."
    },
    "modules": [
      {
        "id": "mod123",
        "title": "Module 1: Introduction",
        "position": 0,
        "lessons": [
          {
            "id": "les123",
            "title": "Lesson 1",
            "description": "...",
            "videoUrl": "https://...",
            "durationSeconds": 600,
            "position": 0,
            "isLocked": false,
            "isFreePreview": true
          }
        ]
      }
    ],
    "_count": {
      "modules": 5,
      "enrollments": 120,
      "reviews": 25
    },
    "avgRating": 4.5,
    "totalDuration": 7200,
    "totalLessons": 20
  }
}
```

### PATCH /courses/:id
Update course (Creator/Admin).

**Request:**
```json
{
  "title": "Updated Title",
  "description": "Updated description",
  "price": 79.99
}
```

### DELETE /courses/:id
Delete course (Creator/Admin).

### GET /courses/search
Search courses.

**Query Parameters:**
- `q` (string) - Search query
- `category` (string) - Filter by category
- `level` (string) - Filter by level
- `priceRange` (string) - "free" | "paid" | "0-50" | "50-100" | "100+"
- `sort` (string) - "newest" | "popular" | "rating" | "price-low" | "price-high"
- `page` (number)
- `limit` (number)

**Response (200):**
```json
{
  "courses": [...],
  "pagination": { ... }
}
```

### POST /courses/:id/enroll
Enroll in course.

**Response (201):**
```json
{
  "enrollment": {
    "id": "enr123",
    "userId": "usr123",
    "courseId": "crs123",
    "enrolledAt": "2026-02-05T00:00:00.000Z"
  }
}
```

### GET /courses/:id/enroll
Check enrollment status.

**Response (200):**
```json
{
  "enrolled": true,
  "enrollment": {
    "id": "enr123",
    "enrolledAt": "..."
  }
}
```

### DELETE /courses/:id/enroll
Unenroll from course.

### GET /courses/:id/progress
Get detailed course progress.

**Response (200):**
```json
{
  "progress": {
    "courseId": "crs123",
    "enrollmentId": "enr123",
    "overallProgress": 45.5,
    "completedLessons": 10,
    "totalLessons": 22,
    "modules": [
      {
        "id": "mod123",
        "title": "Module 1",
        "progress": 100,
        "completedLessons": 5,
        "totalLessons": 5,
        "lessons": [
          {
            "id": "les123",
            "title": "Lesson 1",
            "progressPercent": 100,
            "completedAt": "2026-02-05T00:00:00.000Z",
            "lastWatchedTimestamp": 600
          }
        ]
      }
    ],
    "lastAccessedLesson": {
      "id": "les456",
      "title": "Lesson 6"
    }
  }
}
```

### PATCH /courses/:id/reorder
Reorder modules.

**Request:**
```json
{
  "moduleOrder": ["mod3", "mod1", "mod2"]
}
```

### POST /courses/:id/publish
Publish course.

**Response (200):**
```json
{
  "course": {
    ...
    "status": "PUBLISHED",
    "publishedAt": "2026-02-05T00:00:00.000Z"
  }
}
```

### DELETE /courses/:id/publish
Unpublish course (set to DRAFT).

### GET /courses/:id/reviews
Get course reviews.

**Query Parameters:**
- `page` (number)
- `limit` (number)

**Response (200):**
```json
{
  "reviews": [
    {
      "id": "rev123",
      "rating": 5,
      "comment": "Great course!",
      "createdAt": "2026-02-05T00:00:00.000Z",
      "user": {
        "id": "usr123",
        "name": "John Doe",
        "image": "https://..."
      }
    }
  ],
  "pagination": { ... },
  "stats": {
    "averageRating": 4.5,
    "totalReviews": 25,
    "distribution": {
      "5": 15,
      "4": 5,
      "3": 3,
      "2": 1,
      "1": 1
    }
  }
}
```

### POST /courses/:id/reviews
Create review.

**Request:**
```json
{
  "rating": 5,
  "comment": "Excellent course!"
}
```

### GET /courses/:id/analytics
Get course analytics (Creator/Admin).

**Response (200):**
```json
{
  "analytics": {
    "courseId": "crs123",
    "overview": {
      "totalEnrollments": 120,
      "activeStudents": 85,
      "completionRate": 65.5,
      "averageProgress": 72.3,
      "averageRating": 4.5,
      "totalRevenue": 5940.00
    },
    "enrollmentTrend": [
      { "date": "2026-01-01", "count": 5 },
      { "date": "2026-01-02", "count": 8 }
    ],
    "lessonStats": [
      {
        "lessonId": "les123",
        "title": "Lesson 1",
        "completionRate": 95,
        "averageWatchTime": 580,
        "dropOffRate": 5
      }
    ],
    "topStudents": [
      {
        "userId": "usr123",
        "name": "John Doe",
        "progress": 100,
        "completedAt": "2026-02-01T00:00:00.000Z"
      }
    ]
  }
}
```

---

## 4. Modules Endpoints

### GET /modules/:id
Get module.

### PATCH /modules/:id
Update module.

**Request:**
```json
{
  "title": "Updated Module Title"
}
```

### DELETE /modules/:id
Delete module.

### PATCH /modules/:id/reorder
Reorder lessons within module.

**Request:**
```json
{
  "lessonOrder": ["les3", "les1", "les2"]
}
```

---

## 5. Lessons Endpoints

### GET /lessons/:id
Get lesson with resources.

**Response (200):**
```json
{
  "lesson": {
    "id": "les123",
    "title": "Lesson Title",
    "description": "...",
    "videoUrl": "https://...",
    "durationSeconds": 600,
    "position": 0,
    "isLocked": false,
    "isFreePreview": true,
    "moduleId": "mod123",
    "createdAt": "...",
    "updatedAt": "...",
    "resources": [
      {
        "id": "res123",
        "title": "Slides",
        "type": "pdf",
        "url": "https://...",
        "fileSize": 1024000
      }
    ],
    "module": {
      "id": "mod123",
      "title": "Module 1",
      "course": {
        "id": "crs123",
        "title": "Course Title"
      }
    }
  }
}
```

### PATCH /lessons/:id
Update lesson.

**Request:**
```json
{
  "title": "Updated Title",
  "description": "Updated description",
  "videoUrl": "https://new-video.mp4",
  "durationSeconds": 720
}
```

### DELETE /lessons/:id
Delete lesson.

### GET /lessons/:id/progress
Get lesson progress for current user.

**Response (200):**
```json
{
  "progress": {
    "id": "prog123",
    "progressPercent": 45,
    "lastWatchedTimestamp": 270,
    "lastWatchedAt": "2026-02-05T00:00:00.000Z",
    "completedAt": null
  }
}
```

### POST /lessons/:id/progress
Update lesson progress.

**Request:**
```json
{
  "progressPercent": 75,
  "lastWatchedTimestamp": 450
}
```

**Response (200):**
```json
{
  "progress": {
    "id": "prog123",
    "progressPercent": 75,
    "lastWatchedTimestamp": 450,
    "lastWatchedAt": "2026-02-05T00:00:00.000Z",
    "completedAt": null  // Set automatically when progressPercent >= 90
  }
}
```

### GET /lessons/:id/notes
Get user's notes for lesson.

**Response (200):**
```json
{
  "notes": [
    {
      "id": "note123",
      "content": "Important point here",
      "timestampSeconds": 120,
      "createdAt": "2026-02-05T00:00:00.000Z"
    }
  ]
}
```

### POST /lessons/:id/notes
Create note.

**Request:**
```json
{
  "content": "Remember this!",
  "timestampSeconds": 300
}
```

### GET /lessons/:id/questions
Get lesson questions.

**Query Parameters:**
- `page` (number)
- `limit` (number)

**Response (200):**
```json
{
  "questions": [
    {
      "id": "q123",
      "content": "How does this work?",
      "createdAt": "2026-02-05T00:00:00.000Z",
      "user": {
        "id": "usr123",
        "name": "John Doe",
        "image": "https://..."
      },
      "answers": [
        {
          "id": "ans123",
          "content": "It works like this...",
          "isAccepted": true,
          "createdAt": "...",
          "user": {
            "id": "usr456",
            "name": "Instructor",
            "image": "..."
          }
        }
      ],
      "_count": {
        "answers": 3
      }
    }
  ],
  "pagination": { ... }
}
```

### POST /lessons/:id/questions
Create question.

**Request:**
```json
{
  "content": "Can you explain this concept?"
}
```

### GET /lessons/:id/resources
Get lesson resources.

### POST /lessons/:id/resources
Create resource.

**Request:**
```json
{
  "title": "Slides PDF",
  "type": "pdf",
  "url": "https://...",
  "fileSize": 1024000
}
```

---

## 6. Questions & Answers

### GET /questions/:id
Get question with answers.

### PATCH /questions/:id
Update question (author only).

### DELETE /questions/:id
Delete question (author/admin).

### POST /questions/:id/answers
Create answer.

**Request:**
```json
{
  "content": "Here's the answer..."
}
```

### GET /answers/:id
Get answer.

### PATCH /answers/:id
Update answer (author only).

### DELETE /answers/:id
Delete answer (author/admin).

### POST /answers/:id/accept
Mark answer as accepted (question author only).

---

## 7. Notes

### GET /notes/:id
Get note.

### PATCH /notes/:id
Update note.

**Request:**
```json
{
  "content": "Updated note content"
}
```

### DELETE /notes/:id
Delete note.

---

## 8. Resources

### GET /resources/:id
Get resource.

### PATCH /resources/:id
Update resource.

### DELETE /resources/:id
Delete resource.

---

## 9. Reviews

### GET /reviews/:id
Get review.

### PATCH /reviews/:id
Update review (author only).

**Request:**
```json
{
  "rating": 4,
  "comment": "Updated review"
}
```

### DELETE /reviews/:id
Delete review (author/admin).

---

## 10. Analytics (Admin)

### GET /analytics
Get dashboard analytics.

**Response (200):**
```json
{
  "analytics": {
    "overview": {
      "totalUsers": 500,
      "totalCourses": 25,
      "totalEnrollments": 1200,
      "totalRevenue": 45000.00,
      "activeUsers": 350,
      "completionRate": 68.5
    },
    "trends": {
      "users": [
        { "date": "2026-01", "count": 50 },
        { "date": "2026-02", "count": 75 }
      ],
      "enrollments": [
        { "date": "2026-01", "count": 120 },
        { "date": "2026-02", "count": 180 }
      ],
      "revenue": [
        { "date": "2026-01", "amount": 5000 },
        { "date": "2026-02", "amount": 7500 }
      ]
    },
    "topCourses": [
      {
        "id": "crs123",
        "title": "Popular Course",
        "enrollments": 150,
        "revenue": 7500,
        "rating": 4.8
      }
    ],
    "userDistribution": {
      "LEARNER": 450,
      "CREATOR": 45,
      "ADMIN": 5
    },
    "categoryDistribution": [
      { "category": "Programming", "count": 10 },
      { "category": "Design", "count": 8 }
    ]
  }
}
```

---

## Error Codes

| Status | Description |
|--------|-------------|
| 400 | Bad Request - Invalid input |
| 401 | Unauthorized - Not authenticated |
| 403 | Forbidden - Not authorized |
| 404 | Not Found |
| 409 | Conflict - Resource already exists |
| 422 | Unprocessable Entity - Validation error |
| 500 | Internal Server Error |

---

## Frontend Integration

To connect the frontend to this backend, update the API base URL in the frontend:

```typescript
// frontend/src/lib/api.ts or frontend/.env.local
export const API_BASE_URL = 'https://api.cxflow.io/e';
```

Or create an environment variable in `frontend/.env.local`:
```
NEXT_PUBLIC_API_URL=https://api.cxflow.io/e
```

---

## CORS Configuration

Enable CORS for the frontend domain:

```
Access-Control-Allow-Origin: https://your-frontend-domain.com
Access-Control-Allow-Methods: GET, POST, PATCH, DELETE, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization
Access-Control-Allow-Credentials: true
```

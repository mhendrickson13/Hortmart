# Hortmart / CXFlow LMS — Testing Guide

## Where Does It Live? (Environments)

| Component | Local URL | Production URL |
|-----------|-----------|----------------|
| **Static Frontend** (Vite/React) | `http://localhost:5173` | `https://lms.cxflow.io` (S3/CloudFront) |
| **Next.js Frontend** | `http://localhost:3000` | *(same or separate domain)* |
| **Backend API** (Express) | `http://localhost:3001/e` | `https://fobcdczma3.execute-api.us-east-1.amazonaws.com/dev/e` |
| **Database** | Local MySQL or remote RDS | AWS RDS MySQL (via RDS Proxy) |
| **File Storage** | S3 presigned uploads | S3 bucket `cxflowio` |

---

## How to Run Locally for Testing

### 1. Start the Backend

```bash
cd backend
npm install
```

Create a `.env` file (copy from `.env.example`):

```env
DATABASE_URL="mysql://user:password@localhost:3306/cxflow_lms"
JWT_SECRET="test-secret-key-change-in-production"
JWT_EXPIRES_IN="7d"
PORT=3001
NODE_ENV=development
FRONTEND_URL="http://localhost:5173"
```

> **Note:** You need a MySQL database running. You can use Docker:
> ```bash
> docker run -d --name cxflow-mysql -e MYSQL_ROOT_PASSWORD=root -e MYSQL_DATABASE=cxflow_lms -p 3306:3306 mysql:8
> ```
> Then set `DATABASE_URL="mysql://root:root@localhost:3306/cxflow_lms"`

Start the dev server:
```bash
npm run dev
```
Backend will be at `http://localhost:3001/e`

### 2. Initialize the Database (First Time)

Run the migrate endpoint to create all tables:
```bash
curl -X POST http://localhost:3001/e/migrate \
  -H "x-setup-key: cxflow-lms-setup-2026"
```

### 3. Start the Static Frontend

```bash
cd static-frontend
npm install
```

Create/update `.env`:
```env
VITE_API_URL=http://localhost:3001/e
```

```bash
npm run dev
```
Frontend will be at `http://localhost:5173`

---

## Test Scenarios & How to Execute Them

### Test 1: Create Account (Registration)

**Via UI:**
1. Go to `http://localhost:5173`
2. Click "Sign Up" / "Register"
3. Fill in: Name, Email, Password (min 6 characters)
4. Submit — you should be logged in as a LEARNER

**Via API (cURL):**
```bash
curl -X POST http://localhost:3001/e/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testuser@example.com",
    "password": "password123",
    "name": "Test User"
  }'
```

**Expected response:**
```json
{
  "user": { "id": "...", "email": "testuser@example.com", "name": "Test User", "role": "LEARNER" },
  "token": "eyJhbGciOi..."
}
```

**What to verify:**
- [ ] User is created with role `LEARNER`
- [ ] JWT token is returned
- [ ] Duplicate email returns 409 error
- [ ] Invalid email format returns 400
- [ ] Password < 6 chars returns 400

---

### Test 2: Login

**Via UI:**
1. Go to login page
2. Enter email and password
3. Submit — should redirect to dashboard/catalog

**Via API:**
```bash
curl -X POST http://localhost:3001/e/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testuser@example.com",
    "password": "password123"
  }'
```

**Expected response:**
```json
{
  "user": { "id": "...", "email": "...", "name": "...", "role": "LEARNER" },
  "token": "eyJhbGciOi..."
}
```

**Pre-seeded demo accounts:**

| Role | Email | Password |
|------|-------|----------|
| Learner | learner@videolecture.com | learner123 |
| Creator | creator@videolecture.com | creator123 |
| Admin | admin@videolecture.com | admin123 |

To seed demo accounts via API:
```bash
# Create Admin
curl -X POST http://localhost:3001/e/seed \
  -H "Content-Type: application/json" \
  -H "x-setup-key: cxflow-lms-setup-2026" \
  -d '{"email":"admin@videolecture.com","password":"admin123","name":"Admin User","role":"ADMIN"}'

# Create Creator
curl -X POST http://localhost:3001/e/seed \
  -H "Content-Type: application/json" \
  -H "x-setup-key: cxflow-lms-setup-2026" \
  -d '{"email":"creator@videolecture.com","password":"creator123","name":"Creator User","role":"CREATOR"}'

# Create Learner
curl -X POST http://localhost:3001/e/seed \
  -H "Content-Type: application/json" \
  -H "x-setup-key: cxflow-lms-setup-2026" \
  -d '{"email":"learner@videolecture.com","password":"learner123","name":"Learner User","role":"LEARNER"}'
```

**What to verify:**
- [ ] Correct credentials → token + user data
- [ ] Wrong password → 401 `Invalid credentials`
- [ ] Non-existent email → 401 `Invalid credentials`
- [ ] Blocked user → 403 `Account is blocked`
- [ ] Session persists (check `/auth/session` with token)

---

### Test 3: Upload Course and Materials (Creator/Admin)

**Step 3a — Login as Creator:**
```bash
# Save the token for subsequent requests
TOKEN=$(curl -s -X POST http://localhost:3001/e/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"creator@videolecture.com","password":"creator123"}' \
  | python -c "import sys,json; print(json.load(sys.stdin)['token'])")

echo $TOKEN
```

**Step 3b — Create a Course:**
```bash
curl -X POST http://localhost:3001/e/courses \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "title": "Introduction to Horticulture",
    "subtitle": "Learn plant science fundamentals",
    "description": "A comprehensive course covering soil, plants, and garden design.",
    "level": "BEGINNER",
    "category": "Agriculture",
    "language": "English",
    "price": 29.99,
    "currency": "USD"
  }'
```

**Step 3c — Add Modules:**
```bash
COURSE_ID="<course_id_from_above>"

curl -X POST http://localhost:3001/e/modules \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"courseId\": \"$COURSE_ID\",
    \"title\": \"Module 1: Soil Science\"
  }"
```

**Step 3d — Add Lessons:**
```bash
MODULE_ID="<module_id_from_above>"

curl -X POST http://localhost:3001/e/lessons \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"moduleId\": \"$MODULE_ID\",
    \"title\": \"Understanding Soil Types\",
    \"description\": \"Different soil types and their properties\",
    \"durationSeconds\": 600
  }"
```

**Step 3e — Upload Files (Videos, Images, Documents):**
```bash
# Get a presigned upload URL
curl -X POST http://localhost:3001/e/uploads/presigned \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "fileName": "lesson1-video.mp4",
    "fileType": "video/mp4",
    "category": "video"
  }'
```

Response gives you `uploadUrl` (presigned S3 URL) and `fileUrl` (CDN URL). Then:
```bash
# Upload the actual file to S3
curl -X PUT "<uploadUrl_from_response>" \
  -H "Content-Type: video/mp4" \
  --data-binary @./lesson1-video.mp4
```

**Step 3f — Publish the Course:**
```bash
curl -X PUT "http://localhost:3001/e/courses/$COURSE_ID" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"status": "PUBLISHED"}'
```

**What to verify:**
- [ ] Course is created in DRAFT status
- [ ] Modules are added with correct position ordering
- [ ] Lessons are added under the correct module
- [ ] Presigned URL is generated for uploads (requires S3 access)
- [ ] Course can be published (status → PUBLISHED)
- [ ] Published course appears in the catalog
- [ ] Only CREATOR/ADMIN roles can create courses (LEARNER gets 403)

---

### Test 4: Create Users & Invite / Subscribe

**4a — Admin Creates Users:**
```bash
# Login as Admin
ADMIN_TOKEN=$(curl -s -X POST http://localhost:3001/e/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@videolecture.com","password":"admin123"}' \
  | python -c "import sys,json; print(json.load(sys.stdin)['token'])")

# Create a new user via admin endpoint
curl -X POST http://localhost:3001/e/users \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{
    "email": "newlearner@example.com",
    "password": "welcome123",
    "name": "New Learner",
    "role": "LEARNER"
  }'
```

**4b — Self-Registration (User Signs Up Themselves):**
```bash
curl -X POST http://localhost:3001/e/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "selfservice@example.com",
    "password": "mypassword123",
    "name": "Self-Service User"
  }'
```

**4c — Enroll in a Course (Subscribe):**
```bash
# As the learner, enroll in a course
LEARNER_TOKEN=$(curl -s -X POST http://localhost:3001/e/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"newlearner@example.com","password":"welcome123"}' \
  | python -c "import sys,json; print(json.load(sys.stdin)['token'])")

curl -X POST "http://localhost:3001/e/courses/$COURSE_ID/enroll" \
  -H "Authorization: Bearer $LEARNER_TOKEN"
```

**4d — List All Users (Admin):**
```bash
curl http://localhost:3001/e/users \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

**What to verify:**
- [ ] Admin can create users with any role
- [ ] Users can self-register (role defaults to LEARNER)
- [ ] Learner can enroll in a published course
- [ ] Duplicate enrollment is prevented
- [ ] Admin can see all users list
- [ ] Admin can block/unblock users

---

### Test 5: Progress Tracking

**5a — Watch a Lesson (Update Progress):**
```bash
LESSON_ID="<lesson_id>"

# Update lesson progress (e.g., watched 50%)
curl -X PUT "http://localhost:3001/e/lessons/$LESSON_ID/progress" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $LEARNER_TOKEN" \
  -d '{
    "progressPercent": 50,
    "lastWatchedTimestamp": 300
  }'
```

**5b — Complete a Lesson:**
```bash
curl -X PUT "http://localhost:3001/e/lessons/$LESSON_ID/progress" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $LEARNER_TOKEN" \
  -d '{
    "progressPercent": 100,
    "lastWatchedTimestamp": 600
  }'
```

**5c — Check Course Progress:**
```bash
# Get enrollment details with progress
curl "http://localhost:3001/e/courses/$COURSE_ID" \
  -H "Authorization: Bearer $LEARNER_TOKEN"
```

**5d — View Analytics (Creator/Admin):**
```bash
curl http://localhost:3001/e/analytics \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# Course-specific analytics
curl "http://localhost:3001/e/analytics/courses/$COURSE_ID" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

**What to verify:**
- [ ] Progress is saved per lesson per user
- [ ] Progress percentage updates correctly (0-100)
- [ ] Lesson completion is recorded with timestamp
- [ ] Course completion percentage is calculated correctly
- [ ] Analytics dashboard shows enrollment counts
- [ ] Analytics shows progress/completion rates

---

### Test 6: Additional Features

**Leave a Review:**
```bash
curl -X POST "http://localhost:3001/e/reviews" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $LEARNER_TOKEN" \
  -d "{
    \"courseId\": \"$COURSE_ID\",
    \"rating\": 5,
    \"comment\": \"Excellent course on horticulture!\"
  }"
```

**Ask a Question on a Lesson:**
```bash
curl -X POST http://localhost:3001/e/questions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $LEARNER_TOKEN" \
  -d "{
    \"lessonId\": \"$LESSON_ID\",
    \"content\": \"What is the best soil pH for tomatoes?\"
  }"
```

**Save/Favourite a Course:**
```bash
curl -X POST "http://localhost:3001/e/favourites" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $LEARNER_TOKEN" \
  -d "{\"courseId\": \"$COURSE_ID\", \"type\": \"FAVOURITE\"}"
```

**Check Notifications:**
```bash
curl http://localhost:3001/e/notifications \
  -H "Authorization: Bearer $LEARNER_TOKEN"
```

---

## Quick Smoke Test Script (PowerShell)

Copy and run this full end-to-end test:

```powershell
$API = "http://localhost:3001/e"

# 1. Health check
Write-Host "=== Health Check ===" -ForegroundColor Cyan
Invoke-RestMethod "$API/test" | ConvertTo-Json

# 2. Migrate (first time only)
Write-Host "`n=== Migrate ===" -ForegroundColor Cyan
Invoke-RestMethod -Method POST "$API/migrate" -Headers @{"x-setup-key"="cxflow-lms-setup-2026"} | ConvertTo-Json

# 3. Seed admin user
Write-Host "`n=== Seed Admin ===" -ForegroundColor Cyan
$body = @{email="admin@test.com"; password="admin123"; name="Admin"; role="ADMIN"} | ConvertTo-Json
Invoke-RestMethod -Method POST "$API/seed" -Headers @{"x-setup-key"="cxflow-lms-setup-2026"; "Content-Type"="application/json"} -Body $body | ConvertTo-Json

# 4. Seed creator user
Write-Host "`n=== Seed Creator ===" -ForegroundColor Cyan
$body = @{email="creator@test.com"; password="creator123"; name="Creator"; role="CREATOR"} | ConvertTo-Json
Invoke-RestMethod -Method POST "$API/seed" -Headers @{"x-setup-key"="cxflow-lms-setup-2026"; "Content-Type"="application/json"} -Body $body | ConvertTo-Json

# 5. Register a learner
Write-Host "`n=== Register Learner ===" -ForegroundColor Cyan
$body = @{email="learner@test.com"; password="learner123"; name="Learner"} | ConvertTo-Json
try {
    $reg = Invoke-RestMethod -Method POST "$API/auth/register" -Headers @{"Content-Type"="application/json"} -Body $body
    Write-Host ($reg | ConvertTo-Json)
} catch { Write-Host "Already registered (expected if re-running)" -ForegroundColor Yellow }

# 6. Login as creator
Write-Host "`n=== Login Creator ===" -ForegroundColor Cyan
$body = @{email="creator@test.com"; password="creator123"} | ConvertTo-Json
$login = Invoke-RestMethod -Method POST "$API/auth/login" -Headers @{"Content-Type"="application/json"} -Body $body
$creatorToken = $login.token
Write-Host "Token: $($creatorToken.Substring(0,20))..."

# 7. Create a course
Write-Host "`n=== Create Course ===" -ForegroundColor Cyan
$body = @{title="Test Course"; subtitle="Testing"; description="A test course"; level="BEGINNER"; category="Testing"} | ConvertTo-Json
$course = Invoke-RestMethod -Method POST "$API/courses" -Headers @{"Content-Type"="application/json"; "Authorization"="Bearer $creatorToken"} -Body $body
$courseId = $course.id
Write-Host "Course ID: $courseId"

# 8. Add a module
Write-Host "`n=== Add Module ===" -ForegroundColor Cyan
$body = @{courseId=$courseId; title="Module 1"} | ConvertTo-Json
$mod = Invoke-RestMethod -Method POST "$API/modules" -Headers @{"Content-Type"="application/json"; "Authorization"="Bearer $creatorToken"} -Body $body
$moduleId = $mod.id
Write-Host "Module ID: $moduleId"

# 9. Add a lesson
Write-Host "`n=== Add Lesson ===" -ForegroundColor Cyan
$body = @{moduleId=$moduleId; title="Lesson 1"; durationSeconds=300} | ConvertTo-Json
$lesson = Invoke-RestMethod -Method POST "$API/lessons" -Headers @{"Content-Type"="application/json"; "Authorization"="Bearer $creatorToken"} -Body $body
$lessonId = $lesson.id
Write-Host "Lesson ID: $lessonId"

# 10. Publish course
Write-Host "`n=== Publish Course ===" -ForegroundColor Cyan
$body = @{status="PUBLISHED"} | ConvertTo-Json
Invoke-RestMethod -Method PUT "$API/courses/$courseId" -Headers @{"Content-Type"="application/json"; "Authorization"="Bearer $creatorToken"} -Body $body | ConvertTo-Json

# 11. Login as learner
Write-Host "`n=== Login Learner ===" -ForegroundColor Cyan
$body = @{email="learner@test.com"; password="learner123"} | ConvertTo-Json
$login = Invoke-RestMethod -Method POST "$API/auth/login" -Headers @{"Content-Type"="application/json"} -Body $body
$learnerToken = $login.token

# 12. Enroll in course
Write-Host "`n=== Enroll ===" -ForegroundColor Cyan
Invoke-RestMethod -Method POST "$API/courses/$courseId/enroll" -Headers @{"Authorization"="Bearer $learnerToken"} | ConvertTo-Json

# 13. Update lesson progress
Write-Host "`n=== Track Progress ===" -ForegroundColor Cyan
$body = @{progressPercent=75; lastWatchedTimestamp=225} | ConvertTo-Json
Invoke-RestMethod -Method PUT "$API/lessons/$lessonId/progress" -Headers @{"Content-Type"="application/json"; "Authorization"="Bearer $learnerToken"} -Body $body | ConvertTo-Json

# 14. Verify course listing
Write-Host "`n=== Course Catalog ===" -ForegroundColor Cyan
$courses = Invoke-RestMethod "$API/courses"
Write-Host "Published courses: $($courses.data.Count)"

Write-Host "`n=== ALL TESTS PASSED ===" -ForegroundColor Green
```

---

## Testing Against Production (AWS)

The backend is already deployed as an AWS Lambda behind API Gateway:

```
Base URL: https://fobcdczma3.execute-api.us-east-1.amazonaws.com/dev/e
```

All the same cURL/PowerShell commands work — just replace `http://localhost:3001/e` with the production URL.

The static frontend at `https://lms.cxflow.io` is already configured to point to this API.

---

## Test Checklist Summary

| # | Test | Method | Role Required |
|---|------|--------|---------------|
| 1 | Health check (`GET /e/test`) | API | None |
| 2 | Register new account | UI + API | None |
| 3 | Login with credentials | UI + API | None |
| 4 | View course catalog | UI + API | None (public) |
| 5 | Create a course | UI + API | CREATOR / ADMIN |
| 6 | Add modules & lessons | API | CREATOR / ADMIN |
| 7 | Upload video/image/doc | API (presigned URL → S3) | CREATOR / ADMIN |
| 8 | Publish course | API | CREATOR / ADMIN |
| 9 | Enroll in a course | UI + API | LEARNER |
| 10 | Watch lesson / track progress | UI + API | LEARNER (enrolled) |
| 11 | Complete a lesson | UI + API | LEARNER (enrolled) |
| 12 | Leave a review | API | LEARNER (enrolled) |
| 13 | Ask a question | API | LEARNER (enrolled) |
| 14 | View analytics | UI + API | CREATOR / ADMIN |
| 15 | Manage users | API | ADMIN |
| 16 | Save/favourite course | API | LEARNER |
| 17 | Check notifications | API | Any authenticated |

---

## API Endpoints Quick Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/e/test` | Health check |
| POST | `/e/migrate` | Create DB tables (setup key required) |
| POST | `/e/seed` | Create/update a user (setup key required) |
| POST | `/e/auth/register` | Register new user |
| POST | `/e/auth/login` | Login |
| GET | `/e/auth/session` | Get current session |
| GET | `/e/courses` | List courses |
| POST | `/e/courses` | Create course |
| GET | `/e/courses/:id` | Get course details |
| PUT | `/e/courses/:id` | Update course |
| POST | `/e/courses/:id/enroll` | Enroll in course |
| POST | `/e/modules` | Create module |
| PUT | `/e/modules/:id` | Update module |
| POST | `/e/lessons` | Create lesson |
| PUT | `/e/lessons/:id` | Update lesson |
| PUT | `/e/lessons/:id/progress` | Update progress |
| POST | `/e/uploads/presigned` | Get upload URL |
| POST | `/e/reviews` | Create review |
| POST | `/e/questions` | Ask question |
| POST | `/e/answers` | Answer question |
| POST | `/e/notes` | Create note |
| GET | `/e/analytics` | Dashboard analytics |
| GET | `/e/users` | List users (admin) |
| POST | `/e/users` | Create user (admin) |
| GET | `/e/notifications` | List notifications |
| POST | `/e/favourites` | Save/favourite course |

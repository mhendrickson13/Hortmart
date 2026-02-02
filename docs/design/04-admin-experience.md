# 04 — Creator / Admin experience

This section defines the creator/admin UX for:

- Course creation interface
- Lesson management
- Basic analytics (sales, progress, users)
- Settings & profile

## Primary admin jobs-to-be-done

- Create a course quickly (with a clear “draft → published” lifecycle).
- Manage curriculum at scale (reorder, upload, lock/drip, attach resources).
- Understand performance (sales, enrollments, learner progress, active users).
- Manage profile, payouts, and basic app settings.

---

## Admin navigation

### Desktop

- LeftRail items (icons + tooltips) or left sidebar:
  - Dashboard
  - Courses
  - Analytics
  - Users
  - Settings

### Mobile (admin mode)

If admin is used on mobile:
- Keep bottom nav but include **Create** / **Admin** entry.
- Course editor uses bottom sheets and stacked screens; avoid dense tables.

---

## Screen set (creator/admin)

### A1 — Admin Dashboard

Purpose: quick “health check” + shortcuts.

Top cards:
- Revenue (this month)
- Enrollments (this month)
- Active learners (7d)
- Completion rate (avg)

Sections:
- “Top courses” list (revenue + enrollments)
- “Learner progress snapshot” (distribution)
- Recent activity (new enrollments, reviews)

Empty state:
- No published courses → CTA “Create your first course”.

### A2 — Courses list

Filters:
- All / Draft / Published / Archived
- Search by title

Rows (cards on mobile):
- Title + status pill (Draft/Published)
- Price
- Last updated
- Primary actions: Edit, View, Analytics
- Secondary: Duplicate, Archive

### A3 — Course creation (wizard or editor-first)

Recommended: editor-first with clear sections + publish checklist.

Sections:
- Basics: title, subtitle, description
- Cover: upload image, preview
- Category/tags
- Pricing:
  - Free / Paid
  - Price amount
  - Coupons (optional)
- Visibility: Draft / Published

Publish checklist (right panel on desktop, collapsible on mobile):
- Title set
- Cover uploaded
- At least 1 module + 1 lesson
- Pricing set

Primary CTAs:
- Save (auto-save preferred)
- Preview
- Publish (disabled until checklist passes)

### A4 — Curriculum / Lesson manager (core)

Structure:
- Modules (sections) containing lessons
- Drag-and-drop reorder for:
  - modules
  - lessons within modules

Lesson row shows:
- Title
- Duration (auto from video)
- Status (Draft/Published)
- Free preview toggle
- Lock rules (optional)

Lesson editor (drawer or page):
- Video upload / attach (file picker)
- Title + description
- Resources (upload/link)
- Transcript (optional)
- Quiz (future)

Lock/drip options (optional, but spec’d):
- Lock until previous completed
- Drip: available after N days from enrollment

Destructive actions:
- Delete lesson (confirm modal with lesson name)

### A5 — Analytics (basic)

Tabs:
- Sales
- Learner progress
- Users

#### Sales view

Cards:
- Revenue
- Purchases
- Refunds
- Conversion rate (if funnel tracked)

Charts:
- Revenue over time (daily/weekly)
- Top courses table/list

Filters:
- Date range
- Course (All vs single)

#### Learner progress view

Charts:
- Distribution (0–25 / 25–50 / 50–75 / 75–100 / completed)
- Avg time spent per course (7d/30d)

List:
- Learners with progress % and “last active”

#### Users view

List:
- Name/email
- Courses enrolled
- Last active
- Status (active/blocked)

Actions:
- View profile
- Block/unblock (confirm)

### A6 — Settings & Profile

Creator profile:
- Name, bio, avatar
- Social links

Payments/payouts:
- Payout method
- Tax info (optional)
- Payout schedule (optional)

Branding (optional):
- Logo upload
- Primary color override

Account security:
- Password change
- 2FA (optional)

---

## Admin interaction specs (important details)

### Autosave

Recommended:
- Autosave form changes with subtle “Saved” status + timestamp.
- Offline/failed save shows inline error and retry.

### Publishing

- Publish is a deliberate action (modal confirm).
- Post-publish toast: “Course published”.
- Provide rollback: “Unpublish” (with warning).

### Upload experience

Video upload states:
- idle → uploading (progress) → processing → ready
- failure: retry + error detail

---

## Permissions (future-proofing)

If teams are planned, define roles early:
- **Owner**: billing + payouts + publish
- **Admin**: manage courses + users
- **Editor**: edit content, cannot publish

---

## Visual consistency rules

- Reuse learner design system tokens and components (`02-design-system.md`).
- Admin tables on desktop; convert to cards on mobile.
- Keep primary actions in a fixed footer on mobile editors (Save/Publish).


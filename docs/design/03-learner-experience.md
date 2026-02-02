# 03 — Learner experience (mobile-first)

This section defines the learner UX for **progress & completion** and the **course player** aligned to the mockup.

## Primary learner jobs-to-be-done

- Resume learning fast (“continue where I left off”).
- Understand what’s next (syllabus + lesson states).
- Capture learning (notes + timestamps) and ask questions (Q&A).
- Get proof of completion (completed badge/certificate).

---

## Navigation (mobile-first)

### Mobile bottom nav (recommended)

- **Home** (featured/recommended)
- **MyCourses** (continue learning)
- **Search**
- **Profile**
- Optional: **Downloads** (if offline is important)

### Desktop/tablet

- LeftRail as in mockup (icons only) with active pill highlight.

---

## Screen set (learner)

### L1 — My Courses (Continue Learning)

Purpose: fast resume + overall progress.

Layout:
- Header: “Continue learning”
- Course cards list (vertical)
  - Course title + instructor
  - Progress bar (course-level)
  - CTA: **Resume**
  - Secondary: View syllabus

Empty state:
- No enrollments → prompt to browse courses.

### L2 — Course Player (core screen)

Desktop mapping matches the mockup:
- LeftRail (desktop)
- Main column: course header + video + tabs + metadata row
- Right panel: lesson list + mini chart

Mobile mapping (critical):
- Video pinned at top.
- Under video: **UpNextBar** + progress.
- Lesson list becomes a **BottomSheet** opened by UpNextBar.
- Tabs become **sticky segmented control** under the video.

#### Anatomy (all platforms)

Header:
- Title + instructor line
- “Leave a rating” (enabled only after completion threshold)
- Icon actions: like, save, share
- Search in this course

Video:
- Poster/play overlay before play
- Playback controls (native or custom)
- End-of-lesson overlay: **Next lesson** + **Mark complete** (if not auto)

Tabs:
- Overview / Q&A / Notes / Resources

Metadata chips:
- Skill level / course length / students / language

Lesson list:
- Status icons and pills (see `01-mockup-audit.md`)

### L3 — Lesson list (mobile bottom sheet)

Sheet states:
- **Peek**: 64–88px bar with current lesson + “Up next”
- **Half**: shows 6–8 lessons
- **Full**: full screen syllabus navigation

Rows:
- Shows module headers (collapsible)
- LessonRow with state: locked / available / in_progress / completed
- “Now watching” highlight for current lesson

Interactions:
- Tap available lesson → starts playback, sheet collapses to peek.
- Locked lesson → shows tooltip with reason (e.g., “Complete previous lesson” or “Available in 2 days”).
- Search within course filters list and highlights matches.

### L4 — Overview tab

Contents:
- Course description
- “What you’ll learn” bullets
- Instructor card
- Reviews summary (rating + distribution)
- Syllabus preview (first 3 modules) with “View all”

### L5 — Q&A tab

Core features:
- Ask question (text + optional screenshot/timecode)
- Threads list, sortable (Newest / Top / Instructor)
- Accepted answer or instructor badge

Moderation:
- Report / hide

### L6 — Notes tab (timestamped)

Core features:
- Add note at current timestamp
- List notes with timestamp pills (tap jumps video)
- Search notes (local search)
- Export notes (optional)

Empty state:
- “Create your first note” CTA with keyboard focus.

### L7 — Resources tab

Core features:
- Resource groups: PDFs, links, templates
- Download button + size
- “Open in new tab”

Empty state:
- “No resources for this lesson yet.”

### L8 — Progress & completion

User sees:
- Course progress card (percentage + lessons completed)
- Weekly activity (“Your time on the course”) mini chart
- Achievements:
  - **Completed** badge when completion criteria met
  - Certificate CTA (if enabled)

Completion criteria (choose one rule; implement consistently):
- **Default**: course completed when **all lessons marked completed**
- Alternative: completion when watched ≥ 95% of each lesson (harder, more accurate)

Completion actions:
- On final lesson end:
  - “Course completed” celebration (subtle)
  - CTA: **Download certificate** (if enabled)
  - CTA: **Leave a rating**
  - CTA: **Start next course** (recommendations)

---

## Lesson state rules (behavior)

### Autocomplete vs manual

Recommended:
- Auto-set **in_progress** after 10s watched
- Auto-set **completed** when watched ≥ 95%
- Provide “Mark as complete” for edge cases (seeking/skipping)

### Resume behavior

- Resume at last watched timestamp per lesson.
- If user reopens course: open last lesson viewed; if completed, open next available.

### Ratings

- Enable rating CTA after:
  - Course progress ≥ 20% OR
  - At least 1 lesson completed
- Prompt again on completion.

---

## Key flows (step-by-step)

### Flow A — Resume learning (mobile)

1. MyCourses → tap **Resume**
2. Course Player opens
3. Video auto-loads at last timestamp
4. UpNextBar shows next lesson; swipe up to browse syllabus

### Flow B — Select a lesson from syllabus sheet

1. In player, swipe up UpNextBar
2. Tap lesson row
3. Sheet collapses
4. Video loads; “Now watching” row updates

### Flow C — Completion + certificate

1. Finish last lesson
2. Completion overlay appears
3. Tap **Download certificate** or **Leave a rating**
4. Course card in MyCourses shows “Completed”

---

## Edge cases to design

- Poor connection (video buffering): show inline status + retry
- Lesson missing/removed: show “Lesson unavailable” and skip
- Locked lessons: clear reason + CTA (upgrade plan / wait / complete prerequisites)
- User switches devices: last-played timestamp sync


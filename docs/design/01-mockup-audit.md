# 01 — Mockup audit (course player)

Mockup: `E:\VideoLecture\WhatsApp Image 2026-01-27 at 11.25.07 AM.jpeg`

## What the mockup is (IA + layout)

The screen is a **course player** experience with three persistent zones:

- **Primary nav**: a compact **left icon rail** (desktop/tablet)
- **Main content**: course header + **video player** + content tabs
- **Secondary panel**: a **right lesson list** with status chips (Completed / Now watching)

### Key primitives visible in the mockup

- **Search-in-course** input (top)
- **Course header**:
  - Course title
  - Instructor line
  - Social proof (“Other students” avatars)
  - Primary action: “Leave a rating”
  - Secondary quick actions: like / share / save (icons)
- **Video card**:
  - Poster/hero image
  - Center play button overlay
  - Rounded container + soft shadow
- **Content tabs** (below video): Overview / Q&A / Notes / Resources
- **Metadata row** (below tabs): skill level, length, students, language (small icon + label/value)
- **Lesson list panel** (right):
  - Each row has title + duration
  - Status states:
    - **Completed** rows show a “Completed” pill and subdued styling
    - **Now watching** row is highlighted (primary background) and shows “Now watching”
    - Future/other rows are neutral; some appear disabled/faded (implying locked/unavailable)
- **Micro-analytics** (bottom right): “Your time on the course” small chart

## Component inventory implied by the mockup

### Navigation

- **LeftRail**
  - Icon button items (active/inactive)
  - Collapsed by default (icons only)
  - Active state uses primary color + filled pill background

### Course player header

- **CourseTitleBlock**
  - Title (H2)
  - Subline (Instructor name + label)
- **AvatarStack** (social proof)
- **PrimaryCTA** (pill button: “Leave a rating”)
- **IconActions** (like/share/save)
- **SearchField** (within course)

### Video

- **VideoCard**
  - Rounded corners
  - Soft shadow/elevation
  - Play overlay control

### Content areas

- **Tabs / SegmentedControl** for Overview / Q&A / Notes / Resources
- **StatChips** for course metadata (icon + label + value)

### Lessons panel

- **LessonRow**
  - Left: status icon (empty circle / check / in-progress ring)
  - Middle: title + duration
  - Right: status pill (“Completed”) or subtle meta
  - Row background changes by state (neutral / active / disabled)
- **StatusPill**
  - Completed
  - NowWatching
  - Locked (not shown explicitly, implied by faded rows)

### Analytics snippet

- **MiniChart** (sparkline + days)

## State model (must be consistent everywhere)

Define a single lesson state model used in learner UI + admin analytics:

- **locked**: user can see it exists, cannot play (shows lock icon + tooltip)
- **available**: can start
- **in_progress**: started, progress \(0% < p < 100%\)
- **completed**: 100% watched (or “completed” criteria met)
- **now_watching**: the currently open lesson (a UI highlight, not a persisted “status”)

### Lesson row UI mapping (desktop)

- **locked**
  - Leading icon: lock
  - Row: reduced contrast, disabled pointer states except “View details”
  - Trailing: “Locked” pill
- **available**
  - Leading icon: empty circle
  - Trailing: duration only
- **in_progress**
  - Leading icon: progress ring (or half-filled circle)
  - Trailing: progress % or “Resume”
- **completed**
  - Leading icon: check circle
  - Trailing: “Completed” pill
- **now_watching**
  - Row background: primary tint (as mockup)
  - Trailing: “Now watching”

## Responsive translation (mobile-first)

The mockup reads like **desktop**. For mobile-first, preserve the same mental model with different containers.

### Breakpoints (design + implementation)

- **Mobile**: ≤ 480px
- **Tablet**: 481–1024px
- **Desktop**: ≥ 1024px

### Desktop (>=1024)

- LeftRail visible
- Right lesson panel visible (sticky / fixed within viewport)
- Video + tabs are central column

### Tablet (481–1024)

- LeftRail can collapse into a top bar (or keep compact icons)
- Right lesson panel becomes a **drawer** that opens from the right

### Mobile (<=480)

- Replace LeftRail with **BottomNav** (3–5 items max)
- Lesson list becomes a **bottom sheet**:
  - Collapsed “Up next” bar under the video
  - Expand to full screen for syllabus navigation
- Tabs become a **sticky segmented control** under the video
- Optional: **mini-player** on scroll

## Interaction rules inferred (to preserve “premium feel”)

- **Motion**: subtle, quick (150–200ms), ease-out; avoid bouncy motion
- **Elevation**: use soft shadows, not hard borders
- **Corners**: consistent medium radius (10–16px); pills for chips/buttons
- **Focus**: visible focus ring for keyboard navigation (web)

## What to keep consistent from the mockup (non-negotiables)

- Clean light surfaces with soft elevation
- Strong hierarchy: video is the hero
- Lesson list communicates status clearly (Completed / Now watching)
- Tabs provide quick access to Overview/Q&A/Notes/Resources
- “Course stats” are visible and scannable


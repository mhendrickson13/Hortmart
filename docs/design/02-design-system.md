# 02 — Design system (light, clean, premium)

Goal: reproduce the mockup’s **soft, light, premium SaaS** aesthetic while staying implementation-friendly.

## Design principles

- **Light surfaces + soft elevation**: borders are subtle; shadows do the work.
- **One strong brand color**: use sparingly for highlights and primary actions.
- **Legibility first**: high contrast text on light surfaces; avoid low-contrast gray-on-gray.
- **Consistency via tokens**: every color/space/radius maps to a token.

---

## Tokens

### Color (semantic)

Use semantic tokens in UI; map them to brand palette values.

#### Surfaces

- `--bg`: app background
- `--surface-1`: primary surfaces (cards/panels)
- `--surface-2`: elevated surfaces (menus, sheets)
- `--surface-3`: extra emphasis (selected rows)

#### Text

- `--text-1`: primary text
- `--text-2`: secondary text
- `--text-3`: tertiary/disabled
- `--text-on-primary`: text on primary

#### Borders & dividers

- `--border-1`: default border
- `--border-2`: subtle dividers

#### Brand + feedback

- `--primary`: brand
- `--primary-600`: pressed/strong
- `--primary-100`: tinted background

- `--success`: completed/progress success
- `--warning`: caution
- `--danger`: destructive

#### Suggested palette (light)

These values match the “soft pink + warm neutrals” vibe from the mockup. Adjust brand hue if needed.

- `--bg`: `#F6F7FB`
- `--surface-1`: `#FFFFFF`
- `--surface-2`: `#FFFFFF`
- `--surface-3`: `#FFF4F7`

- `--text-1`: `#151923`
- `--text-2`: `#5A6272`
- `--text-3`: `#8C95A6`
- `--text-on-primary`: `#FFFFFF`

- `--border-1`: `#E8EAF2`
- `--border-2`: `#F0F2F7`

- `--primary`: `#F05478`
- `--primary-600`: `#E63D65`
- `--primary-100`: `#FFE3EA`

- `--success`: `#22C55E`
- `--warning`: `#F59E0B`
- `--danger`: `#EF4444`

#### Overlay

- `--overlay-scrim`: `rgba(21,25,35,0.35)` (modals/sheets)

### Spacing scale

Use 4pt base.

- `--space-0`: 0
- `--space-1`: 4
- `--space-2`: 8
- `--space-3`: 12
- `--space-4`: 16
- `--space-5`: 20
- `--space-6`: 24
- `--space-7`: 32
- `--space-8`: 40
- `--space-9`: 48

### Radius scale

- `--radius-sm`: 8
- `--radius-md`: 12
- `--radius-lg`: 16
- `--radius-pill`: 999

### Elevation (shadows)

Soft, wide shadows; avoid harsh outlines.

- `--shadow-1`: `0 6px 18px rgba(21,25,35,0.08)`
- `--shadow-2`: `0 10px 30px rgba(21,25,35,0.10)`
- `--shadow-3`: `0 18px 50px rgba(21,25,35,0.14)`

### Stroke widths

- `--stroke-1`: 1
- `--stroke-2`: 2

---

## Typography

### Font recommendation

- **Primary**: Inter (web-safe, SaaS default)
- **Alternative**: Plus Jakarta Sans (slightly more “premium”)

### Type ramp (desktop → mobile)

- **Display**: 40/48 → 32/40 (marketing only)
- **H1**: 28/36 → 24/32
- **H2**: 22/30 → 20/28
- **H3**: 18/26 → 18/26
- **Body**: 16/24 → 16/24
- **Small**: 14/20 → 14/20
- **Caption**: 12/16 → 12/16

### Weight usage

- Titles: 600–700
- Body: 400–500
- Meta/captions: 500

---

## Layout rules

### Grid

- **Mobile**: 4 columns; 16px margins; 12px gutters
- **Tablet**: 8 columns; 24px margins; 16px gutters
- **Desktop**: 12 columns; 32px margins; 24px gutters

### Tap targets

- Minimum 44×44px for touch.

---

## Components (spec + states)

Each component should have variants + states in Figma:

### Buttons

Variants:
- **Primary**: filled `--primary`, text `--text-on-primary`
- **Secondary**: `--surface-1` with `--border-1`
- **Ghost**: transparent + hover tint
- **Destructive**: filled `--danger`

Sizes:
- **sm**: 32px height, 12px horizontal padding
- **md**: 40px height, 16px padding
- **lg**: 48px height, 18–20px padding

States:
- default / hover / pressed / disabled / loading

### Icon button

- 40×40 (desktop), 44×44 (mobile)
- Variants: default / filled (active)
- Used for like/share/save and nav items.

### Input

Types:
- Text, search, textarea

Spec:
- Height 44 (mobile) / 40 (desktop)
- Background: `--surface-1`
- Border: `--border-1`
- Focus ring: `--primary` at 2px with 20–30% opacity

States:
- default / hover / focused / filled / error / disabled

### Tabs / Segmented control

- Tabs become segmented control on mobile (sticky under video).

States:
- selected: filled tint `--primary-100` or underline with `--primary`
- unselected: `--text-2`
- disabled: `--text-3`

### Card

Spec:
- Background: `--surface-1`
- Radius: `--radius-lg`
- Shadow: `--shadow-1`
- Padding: 16–24

### Badge / Pill

Use pills for status and metadata:

- **Completed**: background `rgba(34,197,94,0.12)`, text `#15803D`
- **NowWatching**: background `--primary`, text `--text-on-primary`
- **Locked**: background `rgba(90,98,114,0.10)`, text `--text-2`

Size:
- Height 24–28px, radius `--radius-pill`

### Progress

- **Linear progress bar**: 6–8px height, radius pill, fill `--primary`
- **Ring progress** (lesson row): 16–18px ring, stroke 2px, fill `--primary`

### List row (LessonRow)

Anatomy:
- Leading status icon
- Title + meta (duration)
- Trailing status (pill or action)

Row states:
- default
- hover (desktop): subtle tint `--surface-3`
- pressed (mobile): slightly darker tint
- selected/now_watching: `--primary` background and `--text-on-primary`
- disabled/locked: reduced contrast, shows lock

### Modal + Bottom sheet

- Modal: centered (desktop), width 360–480
- Bottom sheet: mobile default, full-height option

Spec:
- Scrim: `--overlay-scrim`
- Surface: `--surface-1`, radius top 16–20 (sheet)

### Toast

- Success/warn/error variants, auto-dismiss 3–5s
- Use for “Saved”, “Published”, “Rating submitted”

### Skeleton loaders

- Use skeletons for video poster, lesson list rows, cards.

---

## Navigation patterns

### Desktop left rail (matches mockup)

- 56–72px width
- Active item: filled pill with `--primary`, icon in white
- Inactive: icon in `--text-2`

### Mobile bottom nav

- 4–5 items max (Home, Search, My Courses, Create/Admin, Profile)
- Active: `--primary`

---

## CSS variable starter (developer-friendly)

```css
:root{
  --bg:#F6F7FB;
  --surface-1:#FFFFFF;
  --surface-3:#FFF4F7;
  --text-1:#151923;
  --text-2:#5A6272;
  --text-3:#8C95A6;
  --border-1:#E8EAF2;
  --primary:#F05478;
  --primary-600:#E63D65;
  --primary-100:#FFE3EA;
  --success:#22C55E;
  --warning:#F59E0B;
  --danger:#EF4444;
  --overlay-scrim:rgba(21,25,35,0.35);
  --radius-md:12px;
  --radius-lg:16px;
  --shadow-1:0 6px 18px rgba(21,25,35,0.08);
}
```


---
name: better-in-ui-taste
description: Better-In design system — tokens, typography, layout, components, motion, accessibility. Load when building any UI.
version: 1.0.0
---

# Better-In UI Taste

Better-In is a professional network that respects users. The UI is clean, fast, and purposeful. No dark patterns, no engagement bait, no visual noise.

**Personality:** Calm confidence. Bloomberg-dense information but Vercel-clean chrome.

---

## 1. Color Tokens

Define in `src/styles.css` under `@layer base { :root { ... } }`:

```css
:root {
  /* Brand */
  --color-brand:         #2563EB;  /* blue-600 — primary CTA, links, active states */
  --color-brand-hover:   #1D4ED8;  /* blue-700 */
  --color-brand-subtle:  #EFF6FF;  /* blue-50  — hover bg on light */

  /* Surface */
  --color-bg:            #FFFFFF;
  --color-bg-secondary:  #F9FAFB;  /* gray-50 — sidebar, right panel */
  --color-bg-tertiary:   #F3F4F6;  /* gray-100 — hover, input bg */

  /* Border */
  --color-border:        #E5E7EB;  /* gray-200 */
  --color-border-strong: #D1D5DB;  /* gray-300 — focused inputs */

  /* Text */
  --color-text:          #111827;  /* gray-900 */
  --color-text-secondary:#6B7280;  /* gray-500 */
  --color-text-tertiary: #9CA3AF;  /* gray-400 — timestamps, placeholders */
  --color-text-inverted: #FFFFFF;

  /* Semantic */
  --color-success:       #16A34A;  /* green-600 */
  --color-warning:       #D97706;  /* amber-600 */
  --color-error:         #DC2626;  /* red-600 */
  --color-info:          #2563EB;  /* same as brand */

  /* Salary (jobs) */
  --color-salary:        #059669;  /* emerald-600 — always visible, never hidden */
}

.dark {
  --color-brand:         #4C9AFF;
  --color-brand-hover:   #6BAFFF;
  --color-brand-subtle:  #1E3A5F;

  --color-bg:            #0A0A0A;
  --color-bg-secondary:  #111111;
  --color-bg-tertiary:   #1A1A1A;

  --color-border:        #2A2A2A;
  --color-border-strong: #3A3A3A;

  --color-text:          #F9FAFB;
  --color-text-secondary:#A1A1AA;
  --color-text-tertiary: #71717A;
  --color-text-inverted: #0A0A0A;

  --color-success:       #4ADE80;
  --color-warning:       #FCD34D;
  --color-error:         #F87171;
  --color-salary:        #34D399;
}
```

**Rules:**
- Always use token names in Tailwind: `text-[var(--color-text)]` or map tokens to Tailwind utilities via `@theme`.
- Never hardcode hex values in component files.
- Brand blue `#2563EB` is the only accent color. No secondary accent.

---

## 2. Typography

Font: **Geist Sans** (primary), **Geist Mono** (metrics, code, timestamps).

```css
/* src/styles.css */
@import url('https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700&family=Geist+Mono:wght@400;500&display=swap');

:root {
  --font-sans: 'Geist', system-ui, -apple-system, sans-serif;
  --font-mono: 'Geist Mono', 'Fira Code', monospace;
}
```

### Type Scale

| Token | Size | Weight | Leading | Use |
|---|---|---|---|---|
| `--text-xs` | 11px | 400 | 1.4 | Timestamps, badges |
| `--text-sm` | 13px | 400 | 1.5 | Secondary labels, metadata |
| `--text-base` | 15px | 400 | 1.6 | Body text, post content |
| `--text-md` | 16px | 500 | 1.5 | UI labels, nav items |
| `--text-lg` | 18px | 600 | 1.4 | Card titles, section headers |
| `--text-xl` | 22px | 700 | 1.3 | Page titles |
| `--text-2xl` | 28px | 700 | 1.2 | Hero/display |

**Rules:**
- Body text is 15px, NOT 14px (14px feels cramped on a professional tool).
- Name + headline text is always 500 weight, never bold (bold feels aggressive).
- Timestamps, connection count, reaction counts → `--font-mono` at `--text-xs`.
- No text below 11px. No text above 28px except marketing pages.

---

## 3. Layout

### App Shell (3-column desktop, 1-column mobile)

```
Desktop (≥1024px):
┌──────────────────────────────────────────────────────────┐
│ TopNav (h-14, sticky)                                    │
├──────────┬───────────────────────────┬───────────────────┤
│ Sidebar  │  Main (flex-1, max-w-2xl) │  Right (w-80)     │
│ w-60     │  px-4 py-6                │  hidden <1280px   │
│ sticky   │                           │  sticky           │
│ top-14   │                           │  top-14           │
└──────────┴───────────────────────────┴───────────────────┘

Mobile (<768px):
┌──────────────────┐
│ TopNav (h-14)    │
├──────────────────┤
│ Main (full width)│
│ px-4 py-4        │
├──────────────────┤
│ BottomNav (h-16) │
└──────────────────┘
```

```tsx
// AppShell.tsx pattern
<div className="min-h-screen bg-[var(--color-bg)]">
  <TopNav />
  <div className="mx-auto max-w-screen-xl px-4">
    <div className="flex gap-6 pt-14"> {/* pt = topnav height */}
      <Sidebar className="hidden lg:block w-60 shrink-0 sticky top-14 h-[calc(100vh-3.5rem)]" />
      <main className="flex-1 min-w-0 max-w-2xl py-6">{children}</main>
      <aside className="hidden xl:block w-80 shrink-0 sticky top-14 h-[calc(100vh-3.5rem)] py-6">{rightPanel}</aside>
    </div>
  </div>
  <BottomNav className="lg:hidden" />
</div>
```

### Spacing Scale

Use Tailwind's 4px-base scale. Key values:
- `2` (8px) — tight: icon padding, badge padding
- `3` (12px) — compact: list item padding
- `4` (16px) — default: card padding, section gaps
- `6` (24px) — comfortable: section spacing
- `8` (32px) — loose: page-level separation

---

## 4. Cards

All feed items, job listings, profile summaries, and conversation previews use the Card primitive.

### Anatomy

```
┌─ card ─────────────────────────────────────────────────┐
│  bg-white dark:bg-[--color-bg-secondary]                │
│  border border-[--color-border]                         │
│  rounded-xl                                             │
│  p-4 or p-5                                             │
│  hover:shadow-sm transition-shadow                      │
│                                                         │
│  ┌─ card-header ──────────────────────────────────────┐ │
│  │  [Avatar 40px]  [Name 500]  ·  [Timestamp mono]   │ │
│  │                 [Headline secondary]               │ │
│  └────────────────────────────────────────────────────┘ │
│                                                         │
│  ┌─ card-body ────────────────────────────────────────┐ │
│  │  Post content, 15px, line-clamp-5 by default      │ │
│  └────────────────────────────────────────────────────┘ │
│                                                         │
│  ┌─ card-actions ─────────────────────────────────────┐ │
│  │  [👍 Like]  [💬 Comment]  [↗ Share]               │ │
│  │  text-sm text-[--color-text-secondary]             │ │
│  └────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────┘
```

**Rules:**
- `rounded-xl` on all cards (12px radius). Never `rounded-lg` (too small) or `rounded-2xl` (too bubbly).
- No drop shadow on cards in rest state. `shadow-sm` on hover only.
- No card within card (no nested cards).
- Dividers between card sections use `divide-y divide-[--color-border]`.

### Job Card (additional fields)

```
┌─ job card ──────────────────────────────────────────────┐
│  [Company logo 48px]  Title (600 weight)                │
│                       Company · Location · Remote badge │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│  💰 $120k – $160k  (emerald, --font-mono, always shown) │
│  📅 Posted 2 days ago · Expires in 28 days              │
│  [Apply]  [Save]                                        │
└─────────────────────────────────────────────────────────┘
```

Salary is always `text-[var(--color-salary)]` in `--font-mono`. Never hidden. If somehow missing, show "Salary not disclosed" in `--color-error`.

---

## 5. Avatars

```tsx
// Three sizes only
<Avatar size="sm" />   // 32px — comment threads, compact lists
<Avatar size="md" />   // 40px — feed cards, nav
<Avatar size="lg" />   // 96px — profile page header

// Always with initials fallback:
// bg-[--color-brand-subtle] text-[--color-brand] font-medium
```

Rules:
- Always `rounded-full`.
- Always provide `alt` text: "Avatar for {name}".
- On error, show initials (first + last name initial), never broken image icon.
- Online indicator: 8px green dot, absolute bottom-right, `ring-2 ring-white dark:ring-[--color-bg]`.

---

## 6. Interactive Elements

### Buttons

```tsx
// Primary — brand blue, white text
<Button variant="primary">Connect</Button>
// bg-[--color-brand] text-white hover:bg-[--color-brand-hover]
// px-4 py-2 rounded-lg font-medium text-sm

// Secondary — border, transparent bg
<Button variant="secondary">Message</Button>
// border border-[--color-brand] text-[--color-brand] bg-transparent
// hover:bg-[--color-brand-subtle]

// Ghost — no border, text only
<Button variant="ghost">View profile</Button>
// text-[--color-text-secondary] hover:bg-[--color-bg-tertiary]

// Destructive
<Button variant="destructive">Disconnect</Button>
// bg-[--color-error] text-white hover:bg-red-700
```

All buttons: `transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[--color-brand]`

### Input / Textarea

```css
/* Base input styles */
border border-[--color-border]
bg-[--color-bg]
rounded-lg
px-3 py-2
text-base              /* 15px */
text-[--color-text]
placeholder:text-[--color-text-tertiary]
focus:outline-none
focus:border-[--color-border-strong]
focus:ring-1
focus:ring-[--color-brand]
transition-colors
```

### Links

```css
text-[--color-brand]
hover:underline
focus-visible:outline-2
focus-visible:outline-offset-2
focus-visible:outline-[--color-brand]
```

---

## 7. Navigation

### Sidebar Items

```tsx
<SidebarItem icon={Home} label="Home" href="/feed" />
// px-3 py-2 rounded-lg flex items-center gap-3
// text-[--color-text-secondary] hover:bg-[--color-bg-tertiary] hover:text-[--color-text]
// aria-current="page" → bg-[--color-brand-subtle] text-[--color-brand] font-medium
```

### Bottom Nav (mobile)

```
h-16 border-t border-[--color-border] bg-[--color-bg]
5 items: Home, Jobs, Messages, Notifications, Profile
Icon only, 24px, active = brand blue
```

---

## 8. Reaction Bar

```
[👍 Like]  [💬 Comment]  [↗ Share]

text-sm text-[--color-text-secondary]
gap-1 between icon and label
hover:text-[--color-brand] hover:bg-[--color-brand-subtle]
rounded-md px-3 py-1.5 transition-colors
```

**Do NOT show reaction counts** — displaying counts drives engagement-bait behavior. Show reaction type icons (liked indicator) but not numbers.

---

## 9. Badges

```tsx
// Connection degree
<Badge>1st</Badge>   // bg-blue-50 text-blue-700 dark: bg-blue-950 text-blue-300
<Badge>2nd</Badge>   // bg-gray-100 text-gray-600

// Job type
<Badge variant="remote">Remote</Badge>    // green
<Badge variant="hybrid">Hybrid</Badge>    // amber
<Badge variant="onsite">On-site</Badge>   // gray

// Open to work (profile)
<Badge variant="open">Open to Work</Badge>  // emerald, always visible if set
```

All badges: `text-xs font-medium px-2 py-0.5 rounded-full`.

---

## 10. Motion

Keep motion purposeful and fast.

```css
/* Default transition for interactive elements */
transition-colors duration-150 ease-out

/* Card hover elevation */
hover:shadow-sm transition-shadow duration-150

/* Page transitions (TanStack Router) */
/* Fade only — no slides, no bounces */
.page-enter { opacity: 0; }
.page-enter-active { opacity: 1; transition: opacity 200ms ease-out; }

/* List item appear (feed, notifications) */
/* Stagger via CSS, not JS */
@keyframes fade-up {
  from { opacity: 0; transform: translateY(4px); }
  to   { opacity: 1; transform: translateY(0); }
}
.feed-item { animation: fade-up 200ms ease-out; }
```

**Rules:**
- No bounces, no spring physics, no slide-in panels.
- Duration: 150ms for micro (hover), 200ms for appear, 300ms max for anything.
- `prefers-reduced-motion` must be respected: wrap all animations in `@media (prefers-reduced-motion: no-preference)`.

---

## 11. Loading States

```tsx
// Skeleton — never a spinner for content
<Skeleton className="h-4 w-3/4 rounded" />   // text line
<Skeleton className="h-10 w-10 rounded-full" /> // avatar

// Skeleton card (feed)
<div className="card p-4 space-y-3">
  <div className="flex gap-3">
    <Skeleton className="h-10 w-10 rounded-full" />
    <div className="flex-1 space-y-2">
      <Skeleton className="h-4 w-1/3" />
      <Skeleton className="h-3 w-1/2" />
    </div>
  </div>
  <Skeleton className="h-4 w-full" />
  <Skeleton className="h-4 w-5/6" />
</div>
```

Use `useSuspenseQuery` with `<Suspense fallback={<FeedSkeleton />}>` — no loading booleans in components.

---

## 12. Theme Toggle

```tsx
// Persist to localStorage + system preference
// Class-based dark mode (Tailwind v4: `darkMode: 'class'`)

function ThemeToggle() {
  const { theme, setTheme } = useTheme() // custom hook
  return (
    <button
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
      className="p-2 rounded-lg hover:bg-[var(--color-bg-tertiary)] transition-colors"
    >
      {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  )
}
```

---

## 13. Accessibility (a11y)

Every component must pass:

**Keyboard nav:**
- All interactive elements reachable via Tab.
- Enter/Space activate buttons. Escape closes dialogs/dropdowns.
- Arrow keys navigate menus and lists.

**ARIA:**
- `aria-label` on all icon-only buttons: `<button aria-label="Like post">`.
- `role="navigation"` on `<nav>`. `aria-current="page"` on active nav item.
- Dialogs use `role="dialog"` + `aria-labelledby` + focus trap.
- Live regions for dynamic content: `aria-live="polite"` on notification count.

**Color:**
- Every text/background pair ≥ 4.5:1 contrast (WCAG AA). Brand blue on white = 4.8:1 ✓.
- Never rely on color alone to convey meaning (always + icon or label).

**Images:**
- All `<img>` have `alt`. Decorative images have `alt=""`.
- Avatar fallback initials are aria-hidden (screen reader reads the name from context).

**Forms:**
- Every `<input>` has an associated `<label>` (not just placeholder).
- Error messages use `aria-describedby` linking input to error text.

---

## 14. Anti-Patterns

Never do these:

```
❌ Showing engagement counts (like counts, view counts)
❌ "X people viewed your profile this week" prompts
❌ Notification red badges for non-urgent events
❌ Auto-playing video/audio in the feed
❌ "Boost your post" upsell banners
❌ Dark-pattern modals ("Are you sure you want to leave?")
❌ Progress bars nudging profile completeness
❌ "People also viewed" algorithmic sidebar content
❌ Salary hidden behind "click to reveal" or "apply to see"
❌ Inline styles on any component
❌ Hardcoded hex colors — always use tokens
❌ rounded-2xl on cards (too bubbly for a professional tool)
❌ Font size below 11px
❌ Reaction count numbers visible in feed
❌ Loading spinners for primary content (use skeletons)
```

---

## 15. Route-Level UI Patterns

### Feed Route (`/feed`)

```tsx
// src/routes/_authed/feed.tsx
export const Route = createFileRoute('/_authed/feed')({
  loader: ({ context }) => context.queryClient.ensureQueryData(feedQueryOptions()),
  component: FeedPage,
})

function FeedPage() {
  return (
    <div className="space-y-4">
      <PostComposer />
      <Suspense fallback={<FeedSkeleton />}>
        <FeedList />
      </Suspense>
    </div>
  )
}
```

### Profile Route (`/profile/$handle`)

```tsx
// Three-zone layout: cover → header → content tabs
// Tabs: Posts | Experience | About
// No "Skills endorsed by N people" LinkedIn-style vanity
```

### Jobs Route (`/jobs`)

```tsx
// Left: filters (location, remote, salary range slider, tags)
// Right: job list cards
// Salary range filter always visible, never behind "More filters"
// Sort: newest | salary-high | salary-low (no "relevance" black-box)
```

### Messages Route (`/messages`)

```tsx
// Two-pane: conversation list (left) + active conversation (right)
// Mobile: full-screen conversation, back button
// No read receipts shown to sender (privacy)
// No "last seen" timestamps
```

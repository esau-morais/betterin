# Better-In — Agent Memory

Better-In is a faster, privacy-first LinkedIn alternative. Anti-cringe, anti-dark-pattern, chronological feed, salary-required job posts.

## Intent Skills

<!-- intent-skills:start -->
# Skill mappings — when working in these areas, load the linked skill file into context.
skills:
  - task: "UI components, design tokens, colors, typography, layout, spacing, cards, avatars, buttons, icons, motion, accessibility, theme"
    load: ".agents/skills/better-in-ui-taste/SKILL.md"
<!-- intent-skills:end -->

---

## TanStack CLI — Docs Lookup Rule

**Always use the TanStack CLI for authoritative docs before making decisions on TanStack APIs.**

```sh
# Search docs
bunx @tanstack/cli@latest search-docs "server functions" --library start --json
bunx @tanstack/cli@latest search-docs "authenticated routes" --library router --json

# Fetch a specific doc page
bunx @tanstack/cli@latest doc start framework/react/guide/authentication --json
bunx @tanstack/cli@latest doc router guide/authenticated-routes --json
bunx @tanstack/cli@latest doc query framework/react/guides/query-keys --json

# List add-ons / libraries
bunx @tanstack/cli@latest create --list-add-ons --framework React --json
bunx @tanstack/cli@latest libraries --json
```

- Use `bunx @tanstack/cli@latest` — NOT `bunx tanstack` (that resolves a different unrelated package)
- `tanstack mcp` is removed — use CLI commands directly
- Library IDs: `start`, `router`, `query`, `table`, `form`, `virtual`, `pacer`
- Doc path format: `framework/react/guide/<slug>` for Start; `guide/<slug>` for Router/Query

---

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | TanStack Start (RC) — Vite + Nitro |
| Routing | TanStack Router (file-based) |
| Data fetching | TanStack Query |
| Auth | Better Auth (`tanstackStartCookies` + `bearer` plugins, Drizzle adapter) |
| ORM | Drizzle ORM |
| Database | PostgreSQL (Docker) |
| Cache / pubsub | Redis (Docker) |
| Styling | Tailwind CSS v4 + shadcn/ui |
| Font | Geist Sans (primary), Geist Mono (metrics/code) |
| Icons | Lucide React |
| Package manager | **bun** — always use `bun add`, `bun run`, never npm/pnpm/yarn |
| Linter/formatter | Biome |
| Push (iOS) | `apns2` npm package behind `PushProvider` interface |
| Real-time | SSE via Nitro `createEventStream()` + Redis pub/sub |

---

## Project Structure

```
better-in/
├── src/
│   ├── routes/
│   │   ├── __root.tsx          # Root layout (nav, theme, fonts)
│   │   ├── _authed.tsx         # Auth-required layout wrapper
│   │   ├── _authed/
│   │   │   ├── feed.tsx        # Chronological feed
│   │   │   ├── profile.$handle.tsx
│   │   │   ├── jobs.tsx
│   │   │   ├── messages.tsx
│   │   │   ├── messages.$id.tsx
│   │   │   ├── notifications.tsx
│   │   │   └── search.tsx
│   │   ├── api/
│   │   │   ├── auth/$.ts       # Better Auth catch-all handler
│   │   │   ├── feed.ts
│   │   │   ├── posts.ts
│   │   │   ├── jobs.ts
│   │   │   ├── messages.ts
│   │   │   └── sse.$channel.ts # SSE endpoint
│   │   ├── sign-in.tsx
│   │   ├── sign-up.tsx
│   │   └── index.tsx           # Landing / redirect
│   ├── components/
│   │   ├── ui/                 # shadcn/ui primitives (do not hand-edit)
│   │   ├── layout/
│   │   │   ├── AppShell.tsx    # 3-col desktop, 1-col mobile
│   │   │   ├── Sidebar.tsx
│   │   │   └── TopNav.tsx
│   │   ├── feed/
│   │   │   ├── PostCard.tsx
│   │   │   ├── PostComposer.tsx
│   │   │   └── FeedList.tsx
│   │   ├── profile/
│   │   ├── jobs/
│   │   └── shared/
│   │       ├── Avatar.tsx
│   │       └── TimeAgo.tsx
│   ├── lib/
│   │   ├── auth.ts             # Better Auth server instance
│   │   ├── auth-client.ts      # Better Auth React client
│   │   ├── db/
│   │   │   ├── index.ts        # Drizzle instance
│   │   │   └── schema.ts       # Full schema
│   │   ├── redis.ts            # Redis client (ioredis)
│   │   └── push/
│   │       ├── provider.ts     # PushProvider interface
│   │       └── apns.ts         # APNs implementation
│   ├── router.tsx
│   └── styles.css              # Tailwind v4 + CSS tokens
├── .agents/
│   └── skills/
│       └── better-in-ui-taste/
│           └── SKILL.md
├── docker-compose.yml
├── .env.example
├── AGENTS.md                   # this file
└── package.json
```

---

## Architecture Diagrams

### Desktop Layout (1280px+)

```
┌─────────────────────────────────────────────────────────┐
│  TopNav: [logo] [search──────────] [notif] [avatar]     │
├──────────┬──────────────────────────┬───────────────────┤
│          │                          │                   │
│ Sidebar  │      Feed / Main         │   Right Panel     │
│ 240px    │      flex-1 max-w-2xl    │   320px           │
│          │                          │                   │
│ • Home   │  ┌─ PostComposer ──────┐ │  Profile card     │
│ • Jobs   │  │ [avatar] What's on  │ │  Job alerts       │
│ • Msgs   │  │ your mind?    [Post]│ │  People you know  │
│ • Search │  └─────────────────────┘ │                   │
│ • Notifs │                          │                   │
│ • Profile│  ┌─ PostCard ──────────┐ │                   │
│          │  │ [av] Name · 2h      │ │                   │
│ [avatar] │  │ Content text…       │ │                   │
│ [name]   │  │ ─────────────────── │ │                   │
│          │  │ 👍 Like  💬 Comment │ │                   │
│          │  └─────────────────────┘ │                   │
└──────────┴──────────────────────────┴───────────────────┘
```

### Mobile Layout (<768px)

```
┌──────────────────────────┐
│  [logo]   [search] [av]  │  TopNav
├──────────────────────────┤
│                          │
│   PostComposer           │
│   PostCard               │
│   PostCard               │
│   PostCard               │
│                          │
├──────────────────────────┤
│ 🏠  💼  ✉️  🔔  👤      │  BottomNav (mobile only)
└──────────────────────────┘
```

### Profile Page Layout

```
┌─────────────────────────────────────────────────────────┐
│  [──────── Cover photo 1200x300 ────────────────────]   │
│      [avatar 96px]  Name           [Connect] [Message]  │
│      Headline · Company · Location                      │
│      500+ connections                                    │
├─────────────────────────────────────────────────────────┤
│  ┌── About ───────────────────────────────────────────┐ │
│  │  Bio text                                          │ │
│  └────────────────────────────────────────────────────┘ │
│  ┌── Experience ──────────────────────────────────────┐ │
│  │  [logo] Title · Company · 2022–Present            │ │
│  │  [logo] Title · Company · 2019–2022               │ │
│  └────────────────────────────────────────────────────┘ │
│  ┌── Activity (posts) ───────────────────────────────┐  │
│  │  Chronological list, no engagement metrics shown  │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

### Auth Flow

```
Browser                 Nitro Server              DB
   │                        │                      │
   │── POST /api/auth/sign-in ──>                  │
   │                        │── verify creds ────> │
   │                        │<── user row ─────────│
   │                        │── create session ──> │
   │<── Set-Cookie (session) ──                    │
   │── GET /feed (cookie) ──>                      │
   │                        │── validate session -> │
   │<── 200 feed data ────────                     │
   │                                               │
iOS App                                            │
   │── POST /api/auth/sign-in ──>                  │
   │<── { token } ─────────────                    │
   │── GET /api/feed (Authorization: Bearer token) │
```

### Real-Time SSE Architecture

```
Client                  Nitro Server             Redis
  │                         │                      │
  │── GET /api/sse/user:123 ─>                     │
  │                         │── SUBSCRIBE user:123 >│
  │<── text/event-stream ───│                      │
  │                         │                      │
  │   (another user sends a message)               │
  │                         │<── PUBLISH user:123 ──│
  │<── data: {"type":"msg"} │                      │
  │                         │                      │
  │   (browser auto-reconnects on disconnect)      │
```

---

## Database Schema (Drizzle)

### Tables

- **users** — Better Auth managed (id, email, name, emailVerified, image, createdAt, updatedAt)
- **sessions** — Better Auth managed
- **accounts** — Better Auth managed (OAuth)
- **verifications** — Better Auth managed

- **profiles** — (userId FK, handle UNIQUE, headline, bio, location, website, avatarUrl, coverUrl, openToWork, createdAt, updatedAt)
- **experiences** — (id, userId FK, company, title, startDate, endDate, current, description)
- **skills** — (id, userId FK, name)

- **connections** — (id, requesterId FK, addresseeId FK, status enum[pending,accepted,blocked], createdAt)
- **follows** — (id, followerId FK, followedId FK, createdAt) — for one-way follow without connecting

- **posts** — (id, authorId FK, content, mediaUrls[], visibility enum[public,connections,private], createdAt, updatedAt, deletedAt)
- **reactions** — (id, postId FK, userId FK, type enum[like,insightful,celebrate,support], createdAt)
- **comments** — (id, postId FK, authorId FK, parentId FK nullable, content, createdAt, updatedAt, deletedAt)

- **jobs** — (id, posterId FK, title, company, location, remote enum[remote,hybrid,onsite], salaryMin INT NOT NULL, salaryMax INT NOT NULL, currency, description, tags[], status enum[open,closed,expired], expiresAt DEFAULT now()+30days, createdAt)
  - `salaryMin/Max NOT NULL` enforces salary transparency
  - `expiresAt` auto-set to +30 days; cron job marks expired

- **job_applications** — (id, jobId FK, applicantId FK, message, status enum[applied,viewed,rejected,accepted], createdAt)

- **conversations** — (id, type enum[direct,group], name nullable, createdAt)
- **conversation_members** — (conversationId FK, userId FK, joinedAt, lastReadAt)
- **messages** — (id, conversationId FK, senderId FK, content, mediaUrls[], createdAt, deletedAt)
  - Opt-in only: conversation created only when both parties are connections

- **notifications** — (id, userId FK, type enum[connection_request,connection_accepted,post_reaction,post_comment,job_match,message], actorId FK, entityId, entityType, read BOOL, createdAt)
  - Batched: max 1 notification per type per entity per 24h per user

- **push_tokens** — (id, userId FK, platform enum[ios,android], token, createdAt)
- **moderation_queue** — (id, entityId, entityType, reportedBy FK, reason, status enum[pending,reviewed,actioned,dismissed], createdAt)

---

## Key Conventions

### Package Manager
Always use **bun**. Never npm, pnpm, or yarn.
```sh
bun add <package>
bun add -d <package>
bun run dev
bun run build
```

### TanStack Intent
Before making decisions on patterns for TanStack libraries, check if there are skills available:
```sh
npx @tanstack/intent@latest list
```
Use skills to inform correct usage patterns for TanStack Start, Router, Query, etc.

### File-Based Routing
- `src/routes/__root.tsx` — root layout, always rendered
- `src/routes/_authed.tsx` — layout route, redirects to /sign-in if no session
- `src/routes/_authed/feed.tsx` — nested under auth guard
- `src/routes/api/auth/$.ts` — Better Auth catch-all (must be exact path)

### Router Context (auth pattern from TanStack docs)

```ts
// src/routes/__root.tsx
export const Route = createRootRouteWithContext<{ auth: AuthState }>()(...)

// src/router.tsx
createRouter({ routeTree, context: { auth: undefined! } })

// src/App.tsx — pass auth from hook into RouterProvider
function InnerApp() {
  const auth = useAuth()
  return <RouterProvider router={router} context={{ auth }} />
}
```

### _authed.tsx Guard Pattern

```tsx
// src/routes/_authed.tsx
export const Route = createFileRoute('/_authed')({
  beforeLoad: async ({ location }) => {
    try {
      const session = await getSessionFn()
      if (!session) throw redirect({ to: '/sign-in', search: { redirect: location.href } })
      return { user: session.user }
    } catch (error) {
      if (isRedirect(error)) throw error  // always re-throw redirects
      throw redirect({ to: '/sign-in', search: { redirect: location.href } })
    }
  },
})
```

Access user in child routes: `const { user } = Route.useRouteContext()`

After login, redirect back: `router.history.push(search.redirect ?? '/feed')`

### Better Auth Integration
```ts
// src/lib/auth.ts
import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { tanstackStartCookies, bearer } from "better-auth/plugins"

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg" }),
  plugins: [
    bearer(),
    tanstackStartCookies(), // MUST be last
  ],
})
```

```ts
// src/routes/api/auth/$.ts
import { auth } from "#/lib/auth"
import { createAPIFileRoute } from "@tanstack/react-start/api"

export const APIRoute = createAPIFileRoute("/api/auth/$")({
  GET: ({ request }) => auth.handler(request),
  POST: ({ request }) => auth.handler(request),
})
```

Web uses cookies (automatic). iOS uses `Authorization: Bearer <token>` header (same session table).

### TanStack Query + Start
- Use `createServerFn` for server-side data fetching in route `loader`s
- Use `useSuspenseQuery` / `useQuery` on the client
- Invalidate queries after mutations — don't manually update cache

### SSE (Real-Time)
```ts
// src/routes/api/sse.$channel.ts
import { createEventStream } from "nitro/utils"
export default defineEventHandler(async (event) => {
  const stream = createEventStream(event)
  // subscribe to Redis, push to stream
  return stream.send()
})
```

### CSS / Styling
- Tailwind v4 — CSS-first config in `src/styles.css`, no tailwind.config.js
- shadcn/ui components live in `src/components/ui/` — never hand-edit generated files
- Custom tokens defined in `src/styles.css` under `@layer base { :root { ... } }`
- Brand blue: `#2563EB` (light), `#4C9AFF` (dark)
- No inline styles. No arbitrary Tailwind values for colors (use tokens).

### Biome (Lint/Format)
```sh
bun run check    # lint + format check
bun run format   # auto-format
bun run lint     # lint only
```

### Environment Variables
Required at runtime:
```
DATABASE_URL=postgres://...
REDIS_URL=redis://...
BETTER_AUTH_SECRET=...
BETTER_AUTH_URL=http://localhost:3000
APNS_KEY_ID=...
APNS_TEAM_ID=...
APNS_KEY_PATH=...
```

---

## Anti-LinkedIn Principles (enforce in code)

1. **Chronological feed** — no engagement ranking. `ORDER BY created_at DESC` only.
2. **No engagement metrics visible** — hide like counts on posts, show reactions as icons only.
3. **Salary required** — `salaryMin`/`salaryMax` are `NOT NULL` in jobs table. Reject job posts without salary via API validation.
4. **30-day job auto-expire** — `expiresAt = NOW() + INTERVAL '30 days'` on insert. Cron marks expired.
5. **Opt-in messaging** — `createConversation` checks both parties are connected first.
6. **Minimal notifications** — batch: max 1 notification per type/entity/user/24h. No "X viewed your profile" spam.
7. **No extension fingerprinting** — never enumerate browser extensions.
8. **No clipboard snooping** — never read clipboard without explicit user action.

---

## Content Moderation (3-tier)

1. **In-process keyword filter** — runs synchronously before DB write. Maintains professional allowlist: `["terminated","hostile work environment","sexual harassment","kill the project","fired","laid off"]` (these are legitimate professional terms).
2. **OpenAI Moderation API** — async, non-blocking, free. Fires after successful DB write. Flags content for human review if score > 0.7.
3. **Human review queue** — `moderation_queue` table. Admins review via internal tool. Users can report via "Report" button.

---

## iOS App (Phase 2, Week 5+)

- SwiftUI, iOS 17+, `@Observable`, SwiftData
- URLSession only (no Alamofire)
- NavigationStack + NavigationSplitView (iPad supported v1)
- SPM deps: NukeUI (image loading), KeychainAccess (token storage)
- Auth: Bearer token stored in Keychain
- Push: APNs via `apns2` on server, `UNUserNotificationCenter` on iOS
- Background limitation: iOS suspends connections ~30s after background → use APNs for delivery, REST catch-up on foreground

---

## Development Commands

```sh
bun run dev          # start dev server (port 3000)
bun run build        # production build
bun run test         # vitest
bun run check        # biome lint + format check

docker compose up -d # start postgres + redis
docker compose down  # stop
docker compose logs  # view logs
```

---

## Gotchas

- **TanStack CLI for docs**: Always `bunx @tanstack/cli@latest doc <lib> <path>` or `search-docs` before coding TanStack APIs. NOT `bunx tanstack` (wrong package).
- **Package manager**: Always **bun**. Never npm/pnpm/yarn.
- `tanstackStartCookies()` MUST be the **last** plugin in Better Auth's `plugins` array.
- Better Auth route handler must be at exactly `src/routes/api/auth/$.ts` (dollar sign catch-all).
- Nitro WebSocket is experimental — use SSE. Only upgrade to WS if sub-50ms bidirectional latency is required.
- Tailwind v4 has no `tailwind.config.js` — all config is in CSS via `@theme` directive.
- TanStack Start is in RC — check for breaking changes before upgrading.
- Perspective API is sunsetting Dec 2026 — do not adopt.
- `apns2` requires HTTP/2 — ensure Node.js version supports it (v22+ is fine).
- Do NOT use `npx` for day-to-day project scripts — use `bun run`.
- Job posts missing salary should return HTTP 422, not 400 (validation error, not bad request).

---

## Implementation Timeline

### Web App (8 weeks)

| Week | Focus |
|---|---|
| 1 | Foundation: Docker, DB schema, Better Auth, Tailwind/shadcn, root layout |
| 2 | Auth flows (sign-in, sign-up, email verification), profile creation |
| 3 | Feed (chronological, composer, post cards, reactions, comments) |
| 4 | Jobs (listing, search, filters, salary display, apply flow) |
| 5 | Messaging (conversations, real-time SSE, connection-gated) |
| 6 | Notifications (batched, SSE delivery, minimal set) |
| 7 | Search (profiles, jobs, posts), connections, recommendations |
| 8 | Polish: a11y audit, perf, content moderation wiring, Docker prod build |

### iOS App (16 weeks, starts week 5)

| Week | Focus |
|---|---|
| 5–6 | Xcode setup, auth (sign-in/up, Keychain), API client |
| 7–8 | Profile view/edit, connection list |
| 9–10 | Feed (list, composer, reactions, comments) |
| 11–12 | Jobs (listing, filters, apply) |
| 13–14 | Messaging (conversations, APNs push) |
| 15–16 | Notifications, search, polish, TestFlight |

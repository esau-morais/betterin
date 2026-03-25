# Better-In — Agent Memory

Better-In is a faster, privacy-first social network with career features. Anti-cringe, anti-dark-pattern, chronological feed, salary-required job posts.

## Intent Skills

<!-- intent-skills:start -->
# Skill mappings — when working in these areas, load the linked skill file into context.
skills:
  - task: "UI components, design tokens, colors, typography, layout, spacing, cards, avatars, buttons, icons, motion, accessibility, theme"
    load: ".agents/skills/better-in-ui-taste/SKILL.md"
  - task: "mutations, server functions, data fetching, queries, optimistic updates, TanStack Query, TanStack Start, notifications, settings, preferences, useMutation, useQuery, createServerFn"
    load: ".agents/skills/better-in-tanstack-patterns/SKILL.md"
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
| Icons | Phosphor Icons (`@phosphor-icons/react`, always use `Icon` suffix e.g. `HouseIcon`), [SVGL](https://svgl.app/) (brand logos via `https://api.svgl.app?search=<name>`) |
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
│   │   │   ├── feed.tsx        # Relevance-ranked feed (toggleable chronological)
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
├── MEMORY.md                   # Agent memory (context & conventions)
├── PLAN.md                     # Implementation timeline & architecture
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

- **posts** — (id, authorId FK, content, mediaUrls[], visibility enum[public,connections,private], qualityScore FLOAT DEFAULT 1.0, createdAt, updatedAt, deletedAt)
  - `qualityScore` updated async by anti-slop pipeline; feeds into feed ranking formula
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

- **feed_events** — (id, userId FK, postId FK, action enum[impression,click,like,comment,share,save,hide,mute_author,not_interested], dwellMsBucket enum[<2s,2-5s,5-15s,15-30s,30s+], sessionId, feedPosition INT, feedMode enum[ranked,chronological], createdAt)
  - The ML training data factory — log every feed interaction from day 1
  - `feedPosition` enables position bias correction in model training
  - `dwellMsBucket` bucketed (not raw) to prevent optimizing for raw dwell time
- **feed_impressions** — (id, userId FK, sessionId, postIds JSONB, rankingScores JSONB, rankingStage enum[rule_v1,ml_v1,neural_v1], createdAt)
  - What was shown and in what order — required for counterfactual evaluation and A/B testing of ranking models

- **user_preferences** — (id, userId FK, feedMode enum[ranked,chronological] DEFAULT ranked, aiConsentFeedPersonalization BOOL DEFAULT false, aiConsentContentModeration BOOL DEFAULT false, aiConsentJobMatching BOOL DEFAULT false, showImpressionCount BOOL DEFAULT true, shareLocationInAnalytics BOOL DEFAULT true, createdAt, updatedAt)
  - `feedMode` toggle between ranked and chronological
  - `aiConsent*` granular per-use-case consent for ML training on user content (default: opted out)
  - `shareLocationInAnalytics` opt-out: user's city appears in post authors' analytics (default: opted in)

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
bun run lint     # lint only
bun run format   # auto-format
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

## Code Style

- DO NOT write unnecessary comments. Only write comments to explain business rules, edge cases, or non-obvious constraints — not to describe what the code obviously does. Never use long-line banner/divider comments (`// ---...---`, `// ───...───`, `/* ───...─── */`) to separate sections of a file.
- TDD: write tests before or alongside implementation. Tests must cover real behavior and edge cases — not just happy paths. Goal is correctness, not coverage %.

### TypeScript Best Practices

- **Never use `any`** — use `unknown` + type guards, generics, or proper interface definitions. If interfacing with untyped external APIs, define the expected shape as an interface and validate at the boundary.
- **Avoid `as` type assertions** — use type narrowing (`if`, `in`, discriminated unions) instead. Only acceptable for tuple literals (`[a, b] as const`) and `satisfies`-style patterns. If you find yourself needing `as`, the type design is likely wrong.
- **Prefer `satisfies`** over `as` when constraining object shapes while preserving literal types.
- **Use `unknown` for catch blocks** — `catch (error: unknown)` + `instanceof` check, never `catch (error: any)`.
- **Zod for external data** — all data from external APIs, user input, and server responses must be validated with zod at the boundary. Derive TypeScript types from zod schemas with `z.infer<>`.
- **Single source of truth for types** — shared types live in `src/lib/validation.ts` (zod schemas) or co-located with the domain logic. Never duplicate union types inline.
- **Strict null checks** — handle `null`/`undefined` explicitly. Use optional chaining and nullish coalescing, not non-null assertions (`!`).

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
- shadcn composable components (e.g. `DialogContent`, `AvatarImage`): use inline `export function` instead of a separate `export { X }` line at the bottom.
- Tailwind v4 CSS vars: all `--color-*` tokens are registered in `@theme inline` in `styles.css`. Use bare utility classes (`text-brand`, `bg-bg`, `border-border`) — never `-[var(--color-*)]`.
- Always use `size-X` instead of `h-X w-X` for square dimensions.
- In server functions, use `getRequest()` from `@tanstack/react-start/server` to access the incoming request (not `getWebRequest` — that doesn't exist).
- `tanstackStartCookies` imports from `"better-auth/tanstack-start"`, not `"better-auth/plugins"`.
- `bearer` (server plugin) imports from `"better-auth/plugins"`. There is no `bearerClient` — web uses cookies automatically.
- **Brand icons**: Always use SVGL (`https://api.svgl.app?search=<name>`) for brand/company logos. Never hand-draw brand SVGs. SVGL returns JSON with `route` (SVG URL) — some have light/dark variants as `{ light, dark }` objects. GitHub has separate light/dark SVGs; Google has a multi-color SVG.
- **Social provider type**: The canonical type for OAuth providers is `SocialProvider` defined in `src/routes/sign-in.tsx`. Never duplicate the union inline — import or co-locate from the single definition. Adding a new provider = update the type in one place only.

---

## Development Commands

```sh
bun run typecheck        # typescript check
bun run test         # vitest
bun run lint        # biome lint

docker compose up -d # start postgres + redis
docker compose down  # stop
docker compose logs  # view logs
```

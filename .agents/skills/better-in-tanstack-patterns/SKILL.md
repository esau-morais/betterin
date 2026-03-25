---
name: better-in-tanstack-patterns
description: TanStack Query/Start patterns for Better-In — mutations, optimistic updates, server functions, data flow. Load when writing data-fetching code, mutations, or server functions.
version: 1.0.0
---

# Better-In TanStack Patterns

## Server Functions (TanStack Start)

All server-side logic uses `createServerFn` from `@tanstack/react-start`. Auth is checked via `getRequest()` + `auth.api.getSession()` or `requireSession()`.

### Read pattern

```ts
// src/lib/server/preferences.ts
export const getUserPreferencesFn = createServerFn({ method: "GET" }).handler(
  async () => {
    const session = await requireSession();
    const [row] = await db
      .select()
      .from(userPreferences)
      .where(eq(userPreferences.userId, session.user.id))
      .limit(1);
    return row ?? null;
  },
);
```

### Write pattern (upsert)

```ts
export const updateShowImpressionCountFn = createServerFn({ method: "POST" })
  .inputValidator(z.object({ value: z.boolean() }))
  .handler(async ({ data }) => {
    const request = getRequest();
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) throw new Error("Unauthorized");

    const [existing] = await db
      .select({ id: userPreferences.id })
      .from(userPreferences)
      .where(eq(userPreferences.userId, session.user.id))
      .limit(1);

    if (existing) {
      await db
        .update(userPreferences)
        .set({ showImpressionCount: data.value, updatedAt: new Date() })
        .where(eq(userPreferences.userId, session.user.id));
    } else {
      await db.insert(userPreferences).values({
        userId: session.user.id,
        showImpressionCount: data.value,
      });
    }

    return { showImpressionCount: data.value };
  });
```

### Dynamic field write (enum-validated)

When multiple toggles share the same upsert logic, use a factory:

```ts
const EMAIL_NOTIF_FIELDS = [
  "emailNotifConnectionRequests",
  "emailNotifComments",
  // ...
] as const;

function notifPrefHandler(fieldsEnum: readonly [string, ...string[]]) {
  return createServerFn({ method: "POST" })
    .inputValidator(z.object({ field: z.enum(fieldsEnum), value: z.boolean() }))
    .handler(async ({ data }) => {
      // ... upsert with [data.field]: data.value
    });
}

export const updateEmailNotifFn = notifPrefHandler(EMAIL_NOTIF_FIELDS);
export const updateInAppNotifFn = notifPrefHandler(IN_APP_NOTIF_FIELDS);
```

---

## Query Options

Defined in `src/lib/queries.ts`. Used in both route `loader`s and client components.

```ts
export const preferencesQueryOptions = () =>
  queryOptions({
    queryKey: ["preferences"],
    queryFn: () => getUserPreferencesFn(),
  });
```

### Route loader pattern

```ts
export const Route = createFileRoute("/_authed/settings/privacy")({
  loader: ({ context: { queryClient } }) =>
    queryClient.ensureQueryData(preferencesQueryOptions()),
  component: PrivacyPage,
});
```

### Client read pattern

```ts
const { data: prefs } = useSuspenseQuery(preferencesQueryOptions());
```

---

## Mutations — The Correct Pattern

**Always use `useMutation` from TanStack Query. Never use manual `useState` + `try/catch` for server actions.**

### Optimistic update with cache rollback

```ts
const queryClient = useQueryClient();

const mutation = useMutation({
  mutationFn: (next: boolean) => serverFn({ data: { value: next } }),
  onMutate: async (next) => {
    await queryClient.cancelQueries({ queryKey: ["preferences"] });
    const previous = queryClient.getQueryData(["preferences"]);
    queryClient.setQueryData(
      ["preferences"],
      (old: Record<string, unknown> | null) =>
        old ? { ...old, [fieldName]: next } : old,
    );
    return { previous };
  },
  onError: (_err, _next, context) => {
    if (context?.previous) {
      queryClient.setQueryData(["preferences"], context.previous);
    }
  },
  onSettled: () => {
    queryClient.invalidateQueries({ queryKey: ["preferences"] });
  },
});
```

### Simple mutation (no optimistic update)

```ts
const markAllRead = useMutation({
  mutationFn: () => markNotificationsReadFn({ data: {} }),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["notifications"] });
    queryClient.invalidateQueries({ queryKey: ["unread-notification-count"] });
  },
});
```

### Key rules

- Read from query cache (`useSuspenseQuery`), not local state
- `isPending` for loading indicators, not `useState(false)`
- `onSettled` always invalidates to ensure eventual consistency
- `onMutate` for instant UI feedback (optimistic)
- `onError` rolls back optimistic changes

---

## Infinite Query Pattern

Used for paginated lists (notifications, feed).

```ts
export const notificationsInfiniteQueryOptions = () =>
  infiniteQueryOptions({
    queryKey: ["notifications"],
    queryFn: ({ pageParam }) =>
      getNotificationsFn({ data: { cursor: pageParam, limit: 20 } }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });
```

Client usage with intersection observer for infinite scroll:

```ts
const { data, fetchNextPage, hasNextPage, isFetchingNextPage } =
  useInfiniteQuery(notificationsInfiniteQueryOptions());

const notifications = data?.pages.flatMap((p) => p.notifications) ?? [];
```

---

## Notification System Architecture

### Channels

| Channel | Status | Preference prefix | Default |
|---|---|---|---|
| In-app | Active | `inAppNotif*` | true (all types) |
| Email | Active | `emailNotif*` | true (except reactions = false) |
| Push | Planned | — | — |

### Types → Preference mapping

```
connection_request  → inAppNotifConnections / emailNotifConnectionRequests
connection_accepted → inAppNotifConnections / emailNotifConnectionRequests (shared)
post_comment        → inAppNotifComments / emailNotifComments
post_reaction       → inAppNotifReactions / emailNotifReactions
job_match           → inAppNotifJobMatches / emailNotifJobMatches
message             → inAppNotifMessages / emailNotifMessages
experience_disputed → inAppNotifExperienceDisputed / emailNotifExperienceDisputed
```

### Flow

1. `createNotification()` inserts row + publishes SSE event
2. `sendEmailIfEnabled()` checks `EMAIL_PREF_MAP` → user pref → sends via Resend
3. `getNotificationsFn()` filters out types where `inAppNotif*` is false
4. `getUnreadNotificationCountFn()` respects same in-app filters (badge count)

---

## Settings Architecture

### Route structure

```
/settings/account        — Password, OAuth connections
/settings/notifications  — Per-type accordion with in-app/push/email toggles
/settings/privacy        — Impression count, location sharing, read receipts
/settings/ai             — Feed personalization, content moderation, job matching consent
/settings/muted          — Muted accounts list
```

### Shared components

- `src/components/settings/SettingsToggle.tsx` — Single toggle row using shadcn Switch + Label + useMutation
- `src/components/settings/NotificationTypeRow.tsx` — Collapsible accordion row with per-channel toggles

### Nav items defined in two places

- `src/routes/_authed/settings.tsx` — Mobile settings index
- `src/components/layout/Sidebar.tsx` — Desktop sidebar

Both must stay in sync.

# Better-In — Implementation Plan

Better-In is a faster, privacy-first social network with career features. Anti-cringe, anti-dark-pattern, chronological feed, salary-required job posts.

---

## Differentiation Principles (enforce in code)

> Research-informed principles addressing [documented LinkedIn pain points](https://en.wikipedia.org/wiki/LinkedIn#Criticism_and_controversies):
> algorithm-driven engagement bait ([analysis](https://www.readtrung.com/p/why-is-linkedin-so-cringe)),
> AI slop / broetry flooding feeds, ghost jobs without salary, InMail spam,
> privacy abuses (AI training without consent, "deleted" data visible to recruiters),
> dark patterns (address-book harvesting, deceptive invitations), and meaningless
> endorsement prompts. Feed ranking informed by [X's open-sourced algorithm](https://github.com/twitter/the-algorithm)
> (multi-stage pipeline, diversity filters, negative signals) and
> [Bluesky's user-choice model](https://bsky.social/about/blog/3-30-2023-algorithmic-choice)
> (chronological always available, transparency about why content is shown).

1. **Transparent relevance ranking with user control** — Default feed scores posts
   by recency (exponential decay, 12h half-life), connection strength
   (interaction-weighted), and content quality. **No** dwell-time, "read more"
   click, or engagement-count optimization — these are the exact signals that
   make X and LinkedIn feeds reward broetry and engagement bait
   ([ref](https://www.readtrung.com/p/why-is-linkedin-so-cringe)). Users can
   switch to pure chronological via a toggle (`feed_mode` user preference).
   Ranking factors are documented on a public page — no black-box algorithm.
   ```
   score = recency_decay(age, half_life=12h)
         × connection_strength(author, viewer)
         × content_quality_bonus
         × (1 - repetition_penalty)
   ```

2. **No vanity metrics** — Reaction counts are private to the post author.
   Others see that reactions exist (icons) but not quantity. No follower counts
   on profiles. No "X people viewed your profile" as a Premium upsell lever.

3. **Anti-slop content quality signals** — Async quality scoring (runs in
   existing moderation tier 2 pipeline) demotes posts matching engagement-bait
   patterns: single-sentence-per-line "broetry", "agree?" CTAs, formulaic
   AI-generated content. No "endorse this skill" or "workversary" prompts.
   Does not block content — affects `quality_score` column on `posts` table,
   which feeds into the ranking formula.

4. **Content diversity & anti-repetition** — Inspired by
   [X's home-mixer diversity filters](https://github.com/twitter/the-algorithm/blob/main/home-mixer/README.md)
   but without the engagement optimization. Max 2 posts from same author per
   page. Topic deduplication: if multiple posts reference the same URL or topic,
   collapse into "N others posted about this". User tools:
   - **Mute words/phrases** — keyword filter (like X, but also supports patterns)
   - **Mute topics** — semantic, not just keyword matching
   - **Temporary mutes** — 24h / 1 week expiry (solves viral-topic flooding
     without permanently blocking a keyword)
   - **"I've seen enough"** — per-topic fatigue signal, distinct from
     "not interested"

5. **Salary required on jobs** — `salaryMin`/`salaryMax` are `NOT NULL`.
   Reject job posts without salary via API validation (HTTP 422).

6. **30-day job auto-expire** — `expiresAt = NOW() + INTERVAL '30 days'`
   on insert. Cron marks expired. No ghost jobs.

7. **Opt-in messaging only** — Conversations require mutual connection.
   No pay-to-message strangers. No cold outreach equivalent to
   [LinkedIn InMail](https://en.wikipedia.org/wiki/LinkedIn#Criticism_and_controversies).

8. **Minimal, honest notifications** — Batch: max 1 per type/entity/user/24h.
   No "X viewed your profile". No engagement prompts ("congratulate Y on
   their workversary").

9. **Hard delete** — When users delete data, it is permanently removed from
   all systems (DB, search indexes, caches) after a 30-day user-visible
   recovery window. No hidden retention visible to recruiters or internal
   tools — unlike [LinkedIn where recruiters can see "deleted" work history](https://www.reddit.com/r/linkedin/comments/1nl62xj/do_you_know_linkedin_recruiters_can_see_your/).

10. **No dark patterns** — No preselected opt-ins, no address-book harvesting,
    no deceptive email invitations, no hard-to-find cancellation flows.
    Settings default to maximum privacy. Ref: [deceptive.design/types](https://www.deceptive.design/types)
    for the taxonomy we explicitly avoid.

11. **User-controlled AI training** — User content is never used to train ML
    models without explicit, granular, per-use-case consent. Default: **opted
    out**. Each use case (feed personalization, content moderation, job matching)
    is a separate toggle in settings — not buried in ToS. Users can opt out at
    any time and request deletion of derived data (embeddings, model
    contributions). Distinction: aggregated anonymous interaction signals
    (click/hide events for ranking models) are standard operational data;
    training on post *content* (text, media) requires explicit consent.
    Ref: [LinkedIn's 2024 AI training controversy](https://en.wikipedia.org/wiki/LinkedIn#Privacy_policy)
    where users were silently opted in with no meaningful opt-out.

---

## Feed Ranking Architecture

> Informed by [Eugene Yan's system design for recommendations](https://eugeneyan.com/writing/system-design-for-discovery/)
> (offline/online split, retrieval→ranking pipeline), YouTube's
> [multitask ranking](https://research.google/pubs/recommending-what-video-to-watch-next-a-multitask-ranking-system/)
> (multi-objective satisfaction optimization), and
> [X's open-source algorithm](https://github.com/twitter/the-algorithm)
> (4-stage pipeline, diversity filters, negative feedback signals).

### 3-Stage Evolution

| Stage | When | Retrieval | Ranking | Infra |
|---|---|---|---|---|
| **0 — Rule-based** | Launch → ~5k users | All posts from connections + followed | Query-time formula (current `score` equation) | PostgreSQL only |
| **1 — ML Ranker** | ~5k → ~50k users | Same candidate set | XGBoost/LightGBM on logged features | Redis feature cache, model in Bun via ONNX |
| **2 — Two-tower + Neural** | ~50k+ users | Embedding retrieval via ANN (HNSW) | Neural ranker (MLP or small transformer) + re-ranking | pgvector or Qdrant, PyTorch/ONNX model server |

Stage 0 is already defined in Differentiation Principle #1. Stages 1–2 build on the same satisfaction objective but with learned weights.

### Satisfaction-Based Objective (NOT Engagement)

The ranking model optimizes for **user satisfaction**, not engagement. This is the core architectural decision that prevents Better-In from devolving into LinkedIn's engagement-bait feed.

**Positive signals** (weighted for label construction):

| Signal | Weight | Rationale |
|---|---|---|
| `save/bookmark` | 3.0 | Strongest intent — user wants to return to this |
| `share` | 2.5 | External validation of value |
| `follow_author_after` | 2.0 | Discovered someone worth following |
| `meaningful_comment` (>50 chars) | 2.0 | Genuine engagement, not emoji drive-by |
| `like` | 1.0 | Baseline positive signal |

**Negative signals** (weighted, critical for anti-slop):

| Signal | Weight | Rationale |
|---|---|---|
| `mute_author` | -5.0 | Strongest negative — never show this person again |
| `report` | -5.0 | Content policy violation signal |
| `hide_post` | -3.0 | Clear rejection of this specific content |
| `unfollow_after_seeing` | -3.0 | Content actively drove user away |
| `not_interested` | -2.0 | Mild negative — topic mismatch |

**Explicitly NOT used as positive training signals:**
- Raw dwell time (rewards long broetry, not quality)
- "Read more" / expand clicks (rewards clickbait formatting with line breaks)
- Impression count / reach (creates popularity feedback loop)
- Reaction counts from other users (social proof bias)

```python
# Label construction for training
satisfaction_label = sigmoid(
    Σ(positive_signal × weight) + Σ(negative_signal × weight)
)
# Continuous [0, 1] target for regression, not binary classification
```

### Feature Taxonomy

Plan feature collection from day 1. Not all features are used in Stage 0, but the schema should support them.

| Category | Features | First used |
|---|---|---|
| **Post** | age, media_type, content_length, quality_score, has_url, comment_count | Stage 0 |
| **Author** | connection_degree, mutual_connections, industry, post_frequency, avg_satisfaction_rate | Stage 0 |
| **User×Author** | connection_strength, interaction_history_count, industry_overlap, time_since_last_interaction | Stage 0 |
| **Context** | time_of_day_bucket, day_of_week, device_type, session_depth, feed_mode | Stage 1 |
| **Cross** | author_industry × user_industry, post_topic × user_interests, post_age × user_activity_recency | Stage 1 |
| **Behavioral** | user's 7d/30d satisfaction rate, author's 7d/30d satisfaction rate, user's hide rate for similar content | Stage 1 |
| **Embedding** | post content embedding (sentence-transformers), user interest embedding (aggregated from interactions) | Stage 2 |

### Anti-Engagement-Bait Safeguards in ML Pipeline

These are hard constraints applied outside the model — the model cannot override them:

1. **Position bias correction** — `feedPosition` logged for every impression. Apply inverse propensity weighting during training so items at position 1 don't dominate.
2. **Popularity bias correction** — Downsample impressions of viral content (>95th percentile impressions) in training data to prevent popular-get-more-popular loops.
3. **Diversity constraints in re-ranking** (post-model hard rules):
   - Max 2 posts from same author per page
   - Topic dedup: collapse posts sharing same URL into "N others posted about this"
   - Industry diversity: no more than 40% of feed from a single industry
4. **Negative feedback amplification** — Weight negative signals 2-3× heavier than positive signals of equal magnitude. One "hide" should outweigh three "likes".
5. **Weekly satisfaction audit** — Automated check: if hide_rate or mute_rate increases week-over-week for >2 consecutive weeks, flag model for review. Circuit-breaker: auto-fallback to Stage 0 rule-based ranking if satisfaction metrics degrade >10%.

### Data Pipeline (Day 1)

```
User action in feed
       │
       ▼
  feed_events table ──────────────────────┐
  (impression, click, like, hide, etc.)   │
       │                                   │
       ▼                                   ▼
  feed_impressions table           Nightly batch job
  (what was shown, in what order)  (Stage 1+: feature
       │                            computation, model
       ▼                            training, eval)
  Counterfactual evaluation              │
  (did ranked beat chronological?        ▼
   A/B test analysis)              Updated model
                                   weights → Redis/ONNX
```

- `feed_events` and `feed_impressions` tables exist from launch (Stage 0)
- Even in Stage 0, logging enables offline analysis and future model training
- Feature computation uses identical TypeScript functions in offline training and online serving (prevents train-serve skew)
- Model retraining cadence: daily in Stage 1, every 6 hours in Stage 2

### Open Questions

- **pgvector vs dedicated vector DB** — At <1M posts, pgvector keeps everything in Postgres (simpler ops). Revisit if query latency exceeds 50ms at p99.
- **ONNX in Bun** — `onnxruntime-node` works in Node.js; needs validation in Bun runtime. Fallback: Python sidecar service behind HTTP.
- **When to transition stages** — Not just user count. Stage 1 requires ~50k feed_events with sufficient negative signal coverage. Stage 2 requires enough content diversity that retrieval becomes a bottleneck (can't score all candidates at query time).

---

## Content Moderation (3-tier)

1. **In-process keyword filter** — runs synchronously before DB write. Maintains context allowlist: `["terminated","hostile work environment","sexual harassment","kill the project","fired","laid off"]` (these are legitimate professional terms).
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

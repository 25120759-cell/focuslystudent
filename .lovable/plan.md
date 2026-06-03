# Focusly — Feature Expansion Plan (finalized)

## 0. Admin bootstrap
Grant `admin` role to `afhaigh76@gmail.com` and `25120759@sunwayeducation.info` once their profiles exist (insert into `user_roles`).

## 1. Auth gating & landing flow
- `/landing` becomes the public entry point. Root `/` redirects: signed-in → `/app`, signed-out → `/landing`.
- Dashboard, assignments, calendar, rewards, task detail all move under `_authenticated/` (integration-managed gate, redirect target switched to `/landing`).
- `signOut()` navigates to `/landing`.
- "Open app" buttons → `/login` (signed-out) or `/app` (signed-in).

## 2. Hidden admin console
- Route `/_authenticated/admin` gated by `has_role('admin')` in `beforeLoad`; non-admins get 404. Not linked from nav.
- Features:
  - Users table with inline plan switcher (Free / Pro / Max).
  - "Generate post with AI" composer (prompt → AI drafts title + summary + body → review → publish).
- Schema: add `plan` text + `monthly_credit_override` to `profiles`.
- `ai.functions.ts` reads plan to compute limits: **Free 10/day · 100/mo, Pro 100/day · 1000/mo, Max 500/day · 10000/mo**.

## 3. Updates / posts
- Add `slug` (unique) and `summary` to `posts`. Server fn `generatePostMeta` (admin-only) fills summary via Gemini.
- New public route `/updates/$slug` rendering full markdown post with back link.
- Updates index cards link to slug pages.
- Admin composer supports manual + AI-draft modes.

## 4. Support page + free chatbot
- New public route `/support` with sectioned Focusly Docs (Getting started, Timer, Toddle sync, AI, Rewards, Shortcuts, FAQ).
- `SupportChat` component using new `aiSupport` server fn:
  - Strict system prompt: **product help only**, refuses off-topic.
  - Bypasses `ai_usage` (no credit cost).
  - Rate-limited via new `support_usage` table (30/day per user) to prevent abuse.
- Floating help button on the page.

## 5. AI chatbot upgrade (in-app)
- Expanded tool catalog (multi-step loop, AI SDK `stepCountIs(8)`):
  - `create_assignment`, `update_assignment`, `delete_assignment`, `complete_assignment`
  - `add_subtask`, `toggle_subtask`
  - `create_action_plan`, `add_timetable_entry`
  - `start_timer`, `stop_timer`
  - `redeem_reward`, `set_setting` (theme, font size, language, personality)
  - `navigate(route)`
- Tools execute client-side via store dispatch / Supabase mutations; results fed back for follow-ups.
- **Out-of-credits animation**: input area swaps for a Framer Motion card with scale-in, pulsing gradient ring, sparkle sweep, and "Upgrade" CTA → `/plans`.
- **Anti-refresh**: credits enforced server-side from immutable `ai_usage` rows (RLS has no delete policy). UI lockout reads from server every chat open.

## 6. Tasks — Supabase-backed + detail pages
- New `assignments` table (user-scoped): title, description, due, status, priority, tags[], notes, subtasks (jsonb), resources (jsonb), created_at, updated_at. RLS + grants.
- Migrate `useStore` assignments to TanStack Query backed by Supabase. Timer / chat / rewards stay local.
- Route `/_authenticated/assignments/$id`:
  - Read mode: title, status badge, due countdown, description (markdown), subtasks checklist (add/toggle/delete), notes, tags, resources.
  - Edit mode toggle flips fields into inputs; Save / Cancel.
  - Delete with confirm dialog → return to list.
- List rows are links; hover reveals delete + quick-complete buttons.

## 7. Animations polish
Sprinkle nice motion across the app (Framer Motion + the existing Tailwind keyframes):
- Page transitions: fade + subtle slide-up on route change.
- Landing hero: staggered fade-in, gradient orb drift, feature cards lift on hover.
- Assignments list: list reorder + delete with `AnimatePresence`.
- Timer: smooth ring tween, glow pulse on last 10s, confetti burst on complete.
- Rewards: redeem coin-flip + voucher slide-in success overlay.
- Chat messages: spring-in from below, typing-dot shimmer.
- Admin console: row highlight on plan change.
- Buttons: subtle scale + sheen on hover via `hover-scale` utility.

## Migrations (single batch)
1. `ALTER TABLE profiles ADD COLUMN plan text NOT NULL DEFAULT 'free', ADD COLUMN monthly_credit_override int`.
2. `ALTER TABLE posts ADD COLUMN slug text UNIQUE, ADD COLUMN summary text` + backfill slugs from titles.
3. `CREATE TABLE assignments (...)` + RLS (user owns own) + grants to authenticated/service_role.
4. `CREATE TABLE support_usage (...)` + RLS + grants.
5. `INSERT INTO user_roles` for the two admin emails (looked up by `auth.users.email`).

## New server fns
- `generatePostMeta(prompt|title+body)` — admin-only.
- `adminGeneratePost(prompt)` — admin-only, returns draft {title, summary, body}.
- `adminListUsers()`, `adminSetPlan(userId, plan)` — admin-only.
- `aiSupport({history, message})` — free, rate-limited, product-scoped.
- `listAssignments`, `createAssignment`, `updateAssignment`, `deleteAssignment`, `toggleSubtask`.

## File moves / new routes
- Move: `index.tsx`, `assignments.tsx`, `calender.tsx`, `rewards.tsx` → under `_authenticated/`.
- New: `_authenticated/app.tsx` (dashboard), `_authenticated/assignments.$id.tsx`, `_authenticated/admin.tsx`, `updates.$slug.tsx`, `support.tsx`.
- Root `index.tsx` becomes a redirect-only route.

## Out of scope (ask later)
- Real geofencing (currently stubbed).
- Realtime collab on shared lists UI.
- Paddle/Stripe checkout for Pro/Max — buttons stay "Coming soon".
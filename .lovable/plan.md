# Focusly — Big Feature Batch Plan

Your request covers ~15 substantial features. Honest take: shipping all of it well in one pass would produce a shallow, buggy result. I'd like to split it into clear phases so each phase is shippable and testable. Please confirm the order (or change it) and I'll execute phase by phase.

## Phase 1 — Public site & legal (no auth required)
- `/landing` — long-form marketing page (hero, AI features, non-AI features, CTA, footer).
- `/plans` — Free (100 AI credits/mo, 10/day), Pro (1000/mo, "Coming soon"), Max (10000/mo, "Coming soon").
- `/updates` — blog list + per-post view, stored in Lovable Cloud. Small "Sign in to post" button at the bottom (admin role only).
- External chatbot widget on these public pages answering questions about plans/features (Lovable AI Gateway).

## Phase 2 — Auth, accounts, legal acceptance
- Enable Lovable Cloud.
- Email/password + Google sign-in.
- Forced acceptance of Lura ToS / Privacy / Content Policy (link to luraapps.base44.app/legal) at signup, stored on profile.
- `profiles` + `user_roles` (admin role for posting updates).
- RLS on everything user-owned. Offline-first store keeps working when signed out; syncs on sign-in.

## Phase 3 — AI credit system (server-side)
- Move all AI calls to a server function backed by Lovable AI Gateway (`google/gemini-3-flash-preview`).
- `ai_usage` table; enforce 100/month + 10/day for Free. Surface remaining credits in the UI.
- Remove the user-supplied Gemini key path (replace Settings field with "Powered by Lovable AI" + credit meter).

## Phase 4 — In-app AI assistant (floating icon)
- Replace the side-panel chat with a floating bottom-right icon → expandable chat.
- Tool-calling: create/edit/complete/delete tasks, query schedule, summarize, prioritize, reschedule, break down — implemented as a single server fn with a tool registry (~15 real tools that cover the "50+ actions" surface area; documented).

## Phase 5 — Core AI features
- Natural-language task input ("remind me next Tuesday at noon" → ISO date).
- Auto-breakdown of large tasks into subtask checklists.
- Smart prioritization (scoring by urgency/importance/deadline).
- Dynamic scheduling: fill free slots from timetable, reshuffle on conflict.

## Phase 6 — Missing app pieces from earlier scope
- Polish Calendar grid to match the mockups exactly (share screenshot if you have one).
- "Analyse from Toddle" sub-view → produce structured tasks from linked subjects.
- Web Audio chimes (focus start/tick-down/finished) — fully offline.
- Verify Settings (theme, font size, language) persist & re-render instantly.

## Phase 7 — Non-AI quality features
- Robust offline mode (already partial via localStorage; add a sync queue once Cloud is on).
- Keyboard shortcuts (N = new task, / = focus search, C = complete, etc.).
- Shared lists + realtime (Supabase Realtime channels).
- Geofencing reminders — **flag:** real geofencing needs a native mobile app; in a browser the best we can do is `geolocation.watchPosition` while the tab is open. I'll implement that and note the limitation, unless you want it skipped.

## Phase 8 — Bug sweep & ship
- Run through every page, fix what's broken, tighten responsive layout, verify dark mode, verify offline.

---

## Questions before I start
1. **Order:** OK to execute Phase 1 → 8 in this order, or do you want AI features (3–5) first?
2. **Cloud:** OK to enable Lovable Cloud now? (Required for auth, blog, credits, sync, realtime.)
3. **Geofencing:** Browser-only approximation, or skip?
4. **Calendar mockup:** Do you have a screenshot/image of the exact grid you want? The current grid is weeks-as-columns × days-as-rows — confirm or share the target.

Reply with "go" + answers and I'll start with Phase 1.
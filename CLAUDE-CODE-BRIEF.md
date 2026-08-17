# Pancito y Más — Build Brief for Claude Code

Recipes + Scoring/Shaping video features, phased. This is the execution spec — see `pancito-app-feature-plan.md` for the research and reasoning behind these decisions if more context is ever needed.

**Workflow for every phase:** implement → push to `main` → CI auto-builds and publishes to Play Console Closed Testing/Alpha → Alison tests on her phone → she confirms → she manually promotes to Production in Play Console → next phase starts. Do not start the next phase's work until told the current phase passed testing.

---

## Fixed constraints (apply to every phase)

- Stack: Capacitor 6, vanilla HTML/CSS/JS, Tailwind via CDN, `i18n.js` with `data-i18n` attributes. Every new user-facing string needs both an EN and ES key. Run `node scripts/check-i18n.js` before considering any phase done.
- New content pages follow the existing template in `scoring-aesthetics.html`: sticky header with back-link, hero image with icon fallback (`onerror` swap pattern), category badge, title, subtitle, byline/read-time/level meta row, `.prose-article` body, "Continue Learning" cross-link cards, bottom nav. Don't introduce a new layout system for new pages.
- **No 5th or 6th bottom-nav tab.** Alison has already seen the 5-tab layout (current: Dash, Bake, Library, Archive, Badges) break on some phones. Recipes and any new sections go inside the existing Library tab.
- CI (`.github/workflows/build-android.yml`) already handles Alpha publish on push to `main`. Don't modify the release pipeline unless a phase explicitly requires it (Phase 4 might, for backend hosting).

---

## Phase 0 — Search, signposting, usage baseline

No video dependency. Can start immediately.

1. **Library search.** Add a search input at the top of the Library view that filters/matches against glossary terms and article titles (and later, recipe titles/ingredients once Phase 3 exists — design the search index so adding recipes later doesn't require rebuilding it). Client-side filtering against existing in-app content is sufficient; no backend needed.
2. **Dashboard signposting.** Add a short section/card row on the Dashboard explaining what each of the 4 tabs contains, with 1-2 direct links into commonly-needed resources (e.g. "New to sourdough? Start in Library → Recipes" once that exists, "Stuck on a bake? Library → Troubleshooting"). Keep it collapsible or dismissible if it gets in the way of the existing Dashboard stats/active-bake content — don't let it push more important info below the fold.
3. **Usage signals.** Add lightweight local event counters (not a third-party analytics SDK) tracking: which Library articles/sections get opened, Bake Log session start vs. completion, which bottom-nav tabs get used. Store locally (matches existing `storage.js` localStorage pattern). Alison will review these herself periodically — no dashboard/reporting UI needed yet, just make sure the data is being captured in a form she (or a future Claude Code session) can query.

**Definition of done:** search works against current Library content, Dashboard signposting is live, usage counters are recording. i18n check passes. No video needed to test this phase.

---

## Phase 1 — Scoring video

**Blocked on:** Alison filming and uploading the scoring video to YouTube (see her tracker doc for status — check with her before starting the on-device testing step, but the component itself can be built against a placeholder).

1. Build a reusable video-card component: thumbnail image, play icon overlay, duration badge (style-match the existing "10 min read" badge — same visual weight, "X min watch" wording). Tapping opens the video — decide between in-app WebView modal vs. handoff to YouTube app/browser; recommend testing both on-device since WebView video playback behavior varies by Android version/manufacturer.
2. Add the component to `scoring-aesthetics.html`, linked to the real scoring video URL once Alison provides it.
3. i18n keys for any new strings (EN/ES), run the check script.
4. Flag to Alison when ready for her on-phone Closed Testing pass. Explicitly confirm: video loads on real hardware, degrades gracefully on a slow/metered connection, back-navigation from video doesn't break app state.

**Definition of done:** video card renders and plays correctly on Alison's test device, confirmed by her, then promoted to Production by her.

---

## Phase 2 — Shaping guide

**Blocked on:** shaping video.

1. New `shaping.html`, structurally identical to `scoring-aesthetics.html` (see Fixed Constraints above). Content: shaping technique for boule and batard, surface tension explanation — Alison to provide/approve final copy, or ask her for a copy draft if she wants help writing it.
2. Add to Library's card grid; make sure it's covered by Phase 0's search index.
3. Add cross-links: `shaping.html` ↔ `scoring-aesthetics.html` ↔ `stretch-and-fold.html` "Continue Learning" sections (bidirectional — add the new page as a link target on the existing two pages, and link back to at least one of them from the new page).
4. Embed the shaping video using the Phase 1 video-card component.
5. i18n + check script.

**Definition of done:** page live, findable via search and cross-links, video plays, confirmed on-device by Alison, promoted to Production.

---

## Phase 3 — Recipes feature

**3a — Recipe data structure + first recipe (architecture decision point).**

Before writing code, propose 2-3 options for how recipe data is stored/rendered and get Alison's sign-off:
- Option shape to consider: a JS data file (e.g. `recipes-data.js`) holding structured recipe objects (ingredients w/ baker's percentages, steps, timing, difficulty/hydration tag, inclusions flag, linked video URL, source-link field for Phase 4 compatibility) rendered through one shared template function, vs. one static HTML page per recipe like the current article pattern.
- Recommend the data-file + template approach if planning for Phase 4 (recipe clipper) and multiple recipe variations (3c) — it avoids hand-writing a new HTML page per recipe indefinitely. Flag the tradeoff (more upfront structure vs. faster to hand-build one-offs) to Alison rather than deciding unilaterally.
- Build Alison's base recipe as the first populated entry, end-to-end, to validate the chosen format.

**3b — Recipe section inside Library.**

- Browse/filter view inside Library (not a new tab). Filter axes: hydration level (beginner→advanced), plain vs. inclusions, format (boule/sandwich/etc).
- Wire into Phase 0's search index.

**3c — Populate variations.**

- Add sandwich loaf + first 1-2 inclusion recipes (see Alison's tracker for which ones are filmed/ready). Each inclusion recipe's copy must explicitly state the technique fix: inclusions at 10-20% of flour weight, added in ~4 portions across the stretch-and-fold stage, not dumped in at shaping. This is a correctness requirement, not just content — the whole point of this recipe category is preventing the collapse problem Alison hit twice before.
- Video-card embed per recipe, same component as Phases 1-2.

**3d — Bake Log integration (stretch goal, not a blocker).**

- Let a recipe pre-fill a Bake Log session's timing/steps. Scope and propose approach once 3a-3c are stable; don't let this delay shipping the core recipes feature.

**Definition of done per sub-phase:** test structural changes (3a, 3b) on-device before proceeding to the next sub-phase. Full Phase 3 promotes to Production once 3c is verified complete.

---

## Phase 4 — Recipe clipper (URL import)

**First feature requiring backend/server infrastructure** — flag this to Alison as an infra decision point before starting, since the app has been 100% client-side until now.

1. Propose a lightweight backend approach (serverless function is the standard pattern) that: accepts a recipe URL from the app, fetches the page server-side (avoids CORS issues a WebView would hit doing this directly), extracts the `schema.org/Recipe` JSON-LD block (libraries like `recipe-scrapers` or `scrape-schema-recipe` do this parsing — evaluate for the chosen backend language/runtime), returns structured ingredients/steps/timing to the app.
2. Map extracted data into the Phase 3a recipe data shape, plus a stored `sourceUrl` field (Alison specifically wants the original link preserved alongside the saved recipe).
3. Not every site has the structured markup — build a graceful failure path ("couldn't import this recipe — here's the link" rather than a silent or confusing error), don't assume 100% success rate.
4. Surface the hosting/cost decision to Alison explicitly (which serverless provider, expected cost at her scale) before committing — this is new recurring infrastructure, unlike everything else in this plan.

**Definition of done:** imported recipes render identically to hand-built ones in the app, source link preserved and visible, fallback path tested, confirmed on-device, promoted to Production.

---

## Phase 5 — Retrospective

Not a code phase by default. Pull Phase 0's usage counters (now covering Search, Scoring, Shaping, Recipes usage) and summarize for Alison: is Recipes being browsed/filtered as designed, is the clipper being used, is search reducing "can't find it" navigation. Output is a prioritized punch list for what comes next — don't build anything in this phase unless Alison asks for a specific follow-up based on the findings.

---

## Open decisions Alison still needs to make (don't assume — ask if not yet answered)

- Video title/description language: English-only or bilingual EN/ES on YouTube.
- Final playlist structure on YouTube (recommended: one channel, "Technique" and "Recipes" playlists).
- Phase 4 hosting/backend provider choice, once reached.

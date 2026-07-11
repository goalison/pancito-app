# Pancito y Más — Codebase Audit

**Date:** 2026-07-11
**Scope:** Read-only audit of `C:\Users\Alison\Desktop\pancito-app`. No code was changed to produce this report.

---

## 1. Tech Stack & iOS Readiness

### Stack

| Layer | Technology |
|---|---|
| Framework | **None** — vanilla HTML / CSS / JavaScript, no build step, no bundler, no npm packages beyond Capacitor itself |
| Mobile packaging | **Capacitor 6.1.2** (native shell wrapping a WebView) |
| UI | Tailwind CSS via CDN `<script>`, Google Fonts (Noto Serif, Plus Jakarta Sans), Material Symbols icon font |
| Language | JavaScript (ES5/ES6, no TypeScript, no JSX) |
| Storage | Browser `localStorage` (no SQLite, no IndexedDB for app data — IndexedDB is used only transiently by the service worker for alarm scheduling) |
| Declared dependencies (`package.json`) | `@capacitor/android@^6.1.2`, `@capacitor/core@^6.1.2`, `@capacitor/local-notifications@^6.0.1` |
| Undeclared but used | `@capacitor/app` (used for `App.addListener('backButton'/'resume', …)` in `archive.html:895`, `library.html:525`, `app.html:1303` — not in `package.json` at all, currently works only because it ships with the Android platform template) |
| Android SDK | `compileSdk`/`targetSdk` patched to **35** at CI build time (`.github/workflows/build-android.yml` step 10); Java 17 |
| iOS platform | **Not present.** No `@capacitor/ios` dependency, no `ios/` folder, no `ios` block in `capacitor.config.json`, no iOS CI workflow |
| Native android/ios folders | Both gitignored and generated fresh by CI (`npx cap add android` in the workflow) — neither is committed to the repo |

`index.html` is a 12-line redirect shim (`window.location.replace('app.html')`); the real app is `app.html`, a ~217KB single-page app with client-side view switching (`showView()`).

### What's needed to ship to the Apple App Store

**Verdict: not a pure config task, but not a rewrite either.** The HTML/CSS/JS layer is largely platform-neutral (safe-area CSS already in place, Capacitor calls gated behind `isNativePlatform()`, no Android filesystem paths or intents in the web code). Adding the iOS platform would produce an app that *launches* with essentially no code changes. The real work is concentrated in one area: **the bake-timer alarm reliability system is Android-specific from the ground up and has no iOS equivalent.**

| # | Item | Why it's needed | Effort |
|---|---|---|---|
| 1 | `npm install @capacitor/ios`, `npx cap add ios` | Generates the iOS Xcode project; currently absent | **S** |
| 2 | Add `@capacitor/app` to `package.json` | Used in code (`App.addListener`) but undeclared; works today only by accident via the Android template | **S** |
| 3 | Xcode project setup — app icons, launch screen, `Info.plist`, `ios` block in `capacitor.config.json` | Standard iOS packaging requirements not yet defined | **M** |
| 4 | Apple Developer Program enrollment + signing certs/provisioning profiles | Required for any App Store submission; no equivalent exists today (Android uses a keystore + GitHub secrets) | **M** |
| 5 | New `build-ios.yml` CI workflow (macOS runner, `xcodebuild`) | `.github/workflows/` only has `build-android.yml` today | **M** |
| 6 | **Redesign the alarm-reliability layer for iOS** | `build-android.yml` steps 6a–6d directly patch the Java source of `@capacitor/local-notifications` to (a) force alarm-stream sound and (b) replace all `AlarmManager.set*()` calls with `setAlarmClock()` so timers survive Doze/App-Standby, plus inject `USE_EXACT_ALARM`/`SCHEDULE_EXACT_ALARM`/`WAKE_LOCK`/`RECEIVE_BOOT_COMPLETED` permissions and a custom `MainActivity` that requests battery-optimization exemption. **None of this transfers to iOS.** iOS has no Doze mode but has its own strict background-execution limits; the equivalent guarantee needs to be rebuilt using iOS's native support for exact-time scheduled local notifications (`LocalNotifications.schedule` with an `at:` timestamp) as the primary mechanism. | **L** |
| 7 | Verify the service worker (`sw.js`) + IndexedDB alarm-replay layer against WKWebView | WKWebView's service-worker support (iOS 14.5+) has known gaps around background execution and is likely not reliable as a fallback the way it is on Android; the iOS build should probably rely solely on native `LocalNotifications.schedule` rather than this replay mechanism | **L** |
| 8 | `PrivacyInfo.xcprivacy` (Apple's privacy manifest, required since 2024) | Needs verification once `@capacitor/ios` + local-notifications iOS binary are added | **S–M** |
| 9 | App Store Connect: screenshots, metadata, App Privacy "nutrition label" | No code required (app stores no analytics/accounts, all data local, so this should be simple to fill out) but not yet done | **M, non-code** |
| 10 | Remove/no-op the Android-only `backButton` listeners (`archive.html:895-896`, `library.html:525-526`) | Not breaking on iOS (harmless no-op) but dead code worth cleaning up | **S** |
| 11 | Fix or relabel the Google Drive backup feature (`GDRIVE_CLIENT_ID` is currently an empty string in `app.html:2562`, so it silently falls back to a share-sheet/download and never actually uploads to Drive) | Independent of iOS, but worth bundling since a real cross-platform backup story matters more once there are two device populations | **M** |

**Bottom line:** the UI/screens/storage/i18n/gamification code should port with little or no change. The one real engineering project is rebuilding reliable background alarms for iOS's execution model — budget for that specifically, not for "porting the app."

---

## 2. Navigation & First-Run Experience

> Note on the build: the Android CI workflow copies **every** root `*.html`/`*.js`/`*.css`/image file into `www/` and ships it in the app package — including files no longer linked from the live UI (see §2C and §3).

### A. `app.html` — the live single-page app (router: `showView()`, `app.html:1236-1252`)

```
app.html (5 top-level views, persistent bottom nav)
│
├── view-dashboard   (default view on load, app.html:246, shown by showView() at app.html:1324)
│     ├── "Start New Bake" hero CTA ────────────► view-bake            (app.html:264)
│     ├── Starter Companion "Feed & Check In" ──► openCheckinSheet() modal (app.html:410)
│     ├── Recent-badges strip ───────────────────► view-achievements    (app.html:1637)
│     └── "Browse the Library" link ─────────────► view-library         (app.html:468)
│
├── view-bake        (app.html:473) — 6-step wizard, goToStep(1..6)
│     1 Mix (app.html:516, hydration % calculator lives here) → 2 Bulk → 3 Shape
│     → 4 Proof → 5 Bake → 6 Result → saveLog() → reloads into view-archive (app.html:2525)
│
├── view-library     (app.html:954)
│     ├── Free eBook block ──────────► external link (leaves app)
│     ├── Glossary search ───────────► in-page, no navigation
│     ├── Featured article ──────────► science-of-steam.html      (full-page nav, leaves SPA)
│     ├── 3 "tutorials" ─────────────► stretch-and-fold.html, scoring-aesthetics.html, starter-revival.html
│     ├── Troubleshooting grid ──────► troubleshoot-{rise,sticky,crust,gummy}.html
│     └── Equipment guides ──────────► banneton.html, lame.html, bench-scraper.html, bread-sling.html
│
├── view-archive     (app.html:870) — "Record a New Bake" → view-bake (app.html:912)
│     └── logModal (app.html:1189) — tap a saved bake card for detail
│
└── view-achievements (app.html:1147) — in-SPA "Trophy Case"/badge grid

Bottom nav (app.html:1209-1230, persistent):
  Dash → view-dashboard | Bake → view-bake | Library → view-library
  Archive → view-archive | Achievements → view-achievements
```

### B. `onboarding.html` — separate 24-screen chapter/game SPA (own router, `onboarding.html:1519-1534`)

```
c0s0 (language picker) → c0s1 ("have a starter?") ─┬─ Yes → c1s1
                                                     └─ No  → c0s2 (10-day starter recipe) → c1s1
c1s1 (meet starter) → c1s2 (name it) → c1s3 → c2s1 (lessons)
  → c1game (quiz) → c5game (Mixing) → c6game (Stretch & Fold)
  → c2quiz → c2game (Bulk Fermentation) → c7game (Bulk Timing) → c8game (Pre-shaping)
  → c9game (Final Shaping) → c10game (Cold Proof) → c11game (Baking)
  → c3s1 (Your Gear) → c3game (quiz) → c4s1 (First Feeding) → c4game
  → c4s2 → c4s3 (finish)
```
Every screen has a persistent **"Skip"** button (`onboarding.html:316`) that jumps straight to `finishOnboarding('app.html')` from anywhere.

### C. Orphaned standalone pages (built into the APK, but unreachable from the live app)

`bake-log.html`, `archive.html`, `library.html`, `achievements.html`, `image-picker.html` are never linked from `app.html`'s SPA — the SPA has its own in-page equivalents for archive/library/achievements. **`bread.html` is referenced nowhere in the entire repo** — fully dead code (734 lines).

### Step-by-step first-launch flow

1. `index.html:9` — instant `window.location.replace('app.html')` (uses `replace`, so it never enters browser history).
2. `app.html:209-217` runs an inline gate script before the header renders: it reads `localStorage['pym_onboarding']`, and if `!ob.complete`, redirects to `onboarding.html`. For a fresh install this key doesn't exist → redirect fires.
3. `onboarding.html`'s own init (`onboarding.html:3464-3491`) re-checks the same flag, finds no `starterName` saved either, and starts a brand-new user at `c0s0` — the language picker.
4. User picks a language (`pickLang()`, `onboarding.html:1736-1742`) → `c0s1` ("Do you already have a starter?").
5. From here: either tap **Skip** at any point (bypasses the entire chapter/game sequence), or work through all 24 screens.
6. `finishOnboarding()` (`onboarding.html:1947-1959`) writes `pym_onboarding.complete = true`, unlocks the `tutorial_completed` achievement, and redirects to `app.html`.
7. `app.html` reloads, the gate now passes, `showView('view-dashboard')` fires on `DOMContentLoaded` (`app.html:1324`).
8. **~800ms later**, `PymCelebration.checkUnseen()` (`app.html:1646-1648`) finds the just-unlocked `tutorial_completed` badge and pops a **full-screen, blocking "Badge Unlocked" modal** with confetti/chime (`celebration.js:150-176,198-205`) that sits above the bottom nav (`z-index:9998` vs. the nav's `z-50`) and must be manually dismissed before anything else is tappable.

**True first-run sequence:** language picker → onboarding chapters (or Skip) → Dashboard → mandatory badge-unlock popup → Dashboard finally usable.

### Where the "Bootcamp" game actually lives

The literal string "Bootcamp" doesn't exist anywhere in the codebase. What the brief is describing is the chain of interactive mini-games (`c1game`, `c2game`, `c5game`–`c11game`, `c2quiz`, `c3game`, `c4game`) embedded **entirely inside `onboarding.html`**, one per baking stage (Mixing, Stretch & Fold, Bulk Fermentation, Pre-shaping, Cold Proof, Baking, etc.), each with an "Interactive · ___" label. They:
- Only exist inside the onboarding flow — nothing in `app.html` ever triggers `onboarding.html` or any individual game after first-run completes.
- Are entirely skippable via the always-visible "Skip" button on the very first screen.

`achievements.html` (which might sound game-like) is actually just an orphaned duplicate of the in-SPA badge/trophy-case display — not a game, and not linked from `app.html` at all.

### Tap counts from a fresh install

Baseline for every path below: **Tap 1** = "Skip" on the language picker screen → lands on Dashboard. **Tap 2** = dismiss the mandatory badge-unlock celebration modal that auto-pops ~800ms later (it blocks the UI underneath it, so this tap is unavoidable even for a user who wants to explore immediately).

| Destination | Path after the 2 mandatory taps | Total taps |
|---|---|---|
| **Beginner recipe** | Tap "Bake" bottom-nav tab → `view-bake` opens directly on Stage 1 ("The Initial Mix"), a full step-by-step recipe | **3** |
| **Hydration calculator** | Same screen as above — the flour/water inputs on Bake Stage 1 (`app.html:530-538`) live-calculate hydration %; there is no separate hydration screen | **3** |
| **Past bakes (Archive)** | Tap "Archive" bottom-nav tab → empty state on a fresh install | **3** |

If the user completes the full onboarding chapter/game sequence instead of skipping, the count balloons to **~20+ taps** before ever reaching the Dashboard.

### Confusion/dead-end points for a new user (see §6 for the full ranked list)

- The mandatory badge-unlock modal on first Dashboard load, appearing before the user has done anything.
- Onboarding progress is silently lost if the user leaves mid-flow after Chapter 1 (detailed in §6).
- Equipment "Learn more" links inside onboarding eject the user out of the flow entirely, with no way back except the OS back button — and returning re-triggers the onboarding gate, which (per the bug above) resets progress.
- "Start My First Bake →" on the final onboarding screen doesn't actually open the Bake wizard — both finish buttons land on the plain Dashboard.
- Two equipment "Learn more" links point to the wrong article (digital scale → Banneton guide; Dutch oven → Bread Sling guide).
- A user who Skips before naming a starter sees a Dashboard card permanently stuck on static placeholder text ("Loading…", "Health: 0%") that never gets overwritten.

---

## 3. Library Content

**Storage mechanism: static, hand-authored HTML.** No CMS, no markdown, no WebView pointing at the marketing site, and no runtime fetch of article text. Every Library page ships as its own `.html` file in the Capacitor bundle, with prose written directly into `<article class="prose-article">` blocks.

Two genuinely networked things exist, both narrow:
- **Live "search pancitoymas.com" box** in `library.html:499` — a real `fetch()` against the WordPress REST API, layered on top of (not replacing) local glossary search. Degrades gracefully offline.
- **Every hero/thumbnail image** across the whole Library is remote (`https://pancitoymas.com/...`) — none reference the local `Images/` folder (see §7 — that folder is unused dead weight).

### Content inventory

| Item | File | Fully local text? | Image source | Offline behavior |
|---|---|---|---|---|
| Glossary — 10 terms (Autolyse, Hooch, Banneton, Open Crumb, Stretch & Fold, Bulk Fermentation, Lame, Oven Spring, Levain, Boule & Bâtard) | `library.html:200-249` | Yes | none (text-only) | **Fully offline** |
| The Secret of Steam (featured article) | `science-of-steam.html` | Yes | remote | Text OK; graceful placeholder fallback on image (`onerror` handler) |
| The Stretch & Fold ("tutorial") | `stretch-and-fold.html` | Yes | remote | Text OK; graceful image fallback |
| Scoring Aesthetics ("tutorial") | `scoring-aesthetics.html` | Yes | remote | Text OK; graceful image fallback |
| The Starter Revival ("tutorial") | `starter-revival.html` | Yes | remote | Text OK; graceful image fallback |
| Why didn't my bread rise? | `troubleshoot-rise.html` | Yes | remote | Text OK; graceful image fallback |
| Dough is too sticky? | `troubleshoot-sticky.html` | Yes | remote | Text OK; graceful image fallback |
| Tough Crust | `troubleshoot-crust.html` | Yes | remote | Text OK; graceful image fallback |
| Gummy Texture | `troubleshoot-gummy.html` | Yes | remote | Text OK; graceful image fallback |
| The Banneton | `banneton.html` | Yes | remote | Text OK; **no fallback — broken image icon offline** |
| The Lame | `lame.html` | Yes | remote | Text OK; **no fallback** |
| Bench Scraper | `bench-scraper.html` | Yes | remote | Text OK; **no fallback** |
| Bread Sling | `bread-sling.html` | Yes | remote | Text OK; **no fallback** |
| Free eBook signup block | `library.html:150-185` | Text yes; signup (Mailchimp, plain `http://` link) requires network | remote | Text renders, cover image broken, signup unusable offline |

**Findings:**
1. The "video tutorials" (Stretch & Fold, Scoring Aesthetics, Starter Revival) show runtime badges (04:12, 08:45, 12:30) and play-button icons but contain **zero `<video>`/`<iframe>` elements** — they're plain text articles, same as the troubleshooting guides. UI/labeling mismatch.
2. Equipment guide pages are the only Library content with no offline image fallback, unlike every other article type.
3. `starter-kit.html` (a "Tools" page reachable only from the onboarding equipment checklist) sends its 4 equipment links straight to the external `pancitoymas.com` site **without `target="_blank"`**, hijacking the in-app WebView — inconsistent with every other equipment link in the app, which stay local.
4. `bread.html` is a standalone 734-line packaging/QR-code "thank you" page, unrelated to the Library, and unreferenced anywhere in the repo.
5. The local `Images/` folder (~28MB, 15 files) is not used by any of this — see §7.

**Answer to the key decision question:** the Library is **not online-only**. All article text is bundled and works offline; only images (and the optional live web-search box) need network. The one real gap is that 4 of the 13 content pages (the equipment guides) lack the offline-image fallback the other 9 have.

---

## 4. Bilingual Coverage

### Implementation

A single flat dictionary in `i18n.js` (2,275 lines):
```js
var TRANSLATIONS = {
  en: { 'nav.dashboard': 'Dashboard', ... },   // i18n.js:146–1201 — 907 keys
  es: { 'nav.dashboard': 'Panel', ... },       // i18n.js:1203–2256 — 907 keys
};
```
- `t(key)` (i18n.js:34-38) looks up the current language, falls back to English, then to the raw key.
- Two consumption styles: declarative `data-i18n`/`data-i18n-html`/`data-i18n-placeholder`/`data-i18n-title` attributes processed by `applyTranslations()` (i18n.js:40-55), and direct `window.PymI18n.t('key')` calls inside JS render functions.
- **Total: 907 keys per language, 1,814 entries, perfectly parallel** (every EN key has a matching ES key and vice versa — no missing keys in either direction).

### Device language detection

**None exists.** Language is set only by `localStorage['pym_lang']` (i18n.js:10, defaults to `'en'` if unset). There is no `navigator.language` read anywhere in the repo, and `@capacitor/device` isn't even a dependency. **A Spanish-speaking user who skips or mis-taps the language picker silently gets English.**

### Manual toggle UI

Two places: the dedicated onboarding language picker (`onboarding.html:326-343`, `pickLang()`), and a small "EN"/"ES" pill pair auto-injected into every page's header by `i18n.js:85-138` (three fallback DOM-matching strategies since there's no shared header partial).

### The real coverage problem: two parallel apps, one localized

`app.html` (the SPA users actually live in) and `onboarding.html` are **comprehensively localized** — hundreds of `data-i18n`/`t()` uses, full key parity, even notification-text re-scheduling on language switch. But a **second set of static multi-page files** — reached via "Learn more"/Library links from inside `app.html` — has little to no i18n wiring, despite loading `i18n.js` and showing a (non-functional) language toggle:

| File | `data-i18n` usages |
|---|---|
| `archive.html` | 0 |
| `achievements.html` | 0 |
| `banneton.html`, `lame.html`, `bench-scraper.html`, `bread-sling.html` | 0 each |
| `science-of-steam.html`, `scoring-aesthetics.html`, `starter-revival.html`, `stretch-and-fold.html` | 0 each |
| `starter-kit.html` | 0 |
| `troubleshoot-{crust,gummy,rise,sticky}.html` | 0 each |
| `bake-log.html` | 10 (partial) |
| `library.html` | 87 (partial) |

Notably, **fully-translated Spanish strings for this exact content already exist in `i18n.js`** and are simply never wired up — e.g. `edu.catEquipment` (i18n.js:667/1723), `banneton.title` (i18n.js:681/1737). The translation work was done; the integration into these specific pages was not.

### Representative hardcoded strings (not exhaustive — full sweep found dozens more)

**Every one of the 14 content/equipment pages** (pattern shown for `banneton.html`): back-link "Library" (`:46`), eyebrow "Essential Equipment" (`:65`), `<h1>The Banneton</h1>` (`:66`), "Get the complete kit on Amazon" (`:74`), section headings "What It Is"/"Why It Matters"/"How to Use It"/"Tips & Tricks"/"Care Instructions" (`:82,86,90,99,108`), the entire article body (`:83-115`), "More Equipment" (`:121`), bottom-nav labels "Dash"/"Bake"/"Library"/"Archive" (`:147,151,155,159`).

**`bake-log.html`:** `<label>Flour Type</label>` (`:209`), "Start Rest" (`:262,396`), "Locked" ×4 (`:291,302,313,324`), `<h3>Dough Temp vs. Target Rise</h3>` (`:352`), "Start Ambient Proof" (`:443`), "Start Timer" ×2 (`:513,527`), "Record Final Result" (`:532`), `<h1>Bake Complete</h1>` (`:538`), placeholders "e.g. Sunday Country Loaf" (`:206`) and notes placeholder (`:561`).

**`archive.html`:** `<h2>Archive</h2>` (`:95`), "Calculating storage..." (`:98`), "Save to Google Drive" (`:107`), "Restore Backup" (`:149`), "Clear Local Data" + its warning copy (`:172-173`), "No bakes match this filter" (`:332`), plus `alert()`/`confirm()` strings for restore success/failure (`:825,828,848,851`).

**`achievements.html`:** "Your Journey" (`:143`), `<h2>Trophy Case</h2>` (`:144`), badge explainer copy (`:145`), "Baker Level" (`:152`), "All Badges" (`:180`).

**`app.html`** (the well-localized SPA — leftovers are mostly in JS-generated modal/alert strings, which bypass `data-i18n`): "Save Name" button (`:1378`), the entire "Restore from Drive" modal (`:2744`), merge-confirmation and error `alert()`/`confirm()` text (`:2750,2751,2788`), and — most notably — the **"delete all data" confirmation dialog is 100% hardcoded English** (`:2794`: "This will permanently delete **ALL bake entries**...", "Yes, delete all", "Are you absolutely sure?...", "Delete everything"), for the single most consequential irreversible action in the app.

**`onboarding.html`** (otherwise the best-localized file, 111 `data-i18n` uses): the Chapter-3 equipment checklist array is entirely hardcoded English (`:1834-1841` — item names/descriptions like "Digital kitchen scale", "Dutch oven or combo cooker") plus "Learn more →" (`:1853`), "✓ Have it" / "Need it" (`:1856-1857`).

### Missing/mismatched translations inside `i18n.js` itself

Key parity is essentially perfect (907/907, zero missing keys either direction). Only two small value-level gaps found:
- `archive.modal.hrs` / `archive.modal.min` — left as English abbreviations ("hrs"/"min") in the Spanish dictionary (i18n.js:479-480 / 1535-1536). Minor, worth a translator pass.
- `onboarding.c2game.pill.temp` = "🌡️ Temp" is untranslated in Spanish (i18n.js:829/1885) while every sibling pill in the same widget (`pill.rest`→"Reposo", `pill.grow`→"Crecer", etc.) was translated — looks like an oversight, not a deliberate loanword.

### Bottom line

**The dictionary is essentially complete; the integration is the weak point.** Roughly half of the app's actual screens — every equipment guide, every troubleshooting article, the entire bake-timer flow in `bake-log.html`, and the standalone archive/achievements pages — are English-only regardless of the user's language choice, even though the Spanish text for most of them already exists in `i18n.js` and just needs wiring. Combined with §2/§3's finding that these are also the exact pages a "Learn more" tap from the SPA lands on, this means Spanish-speaking users hit an English wall precisely when seeking help.

---

## 5. Data & Backup

### Where data lives

Everything is in **`localStorage`** (JSON-encoded), always through small wrapper functions that fall back to an in-memory object if `localStorage` throws. **No IndexedDB, SQLite, or Capacitor Filesystem/Preferences plugin is used for user data** (IndexedDB is used only by `sw.js` for transient alarm scheduling).

| Data | Key(s) | Written from |
|---|---|---|
| Bake logs (recipe, star rating, notes, photo as data URI, hydration, flour type, timings) | `pym_logs` | `app.html:2579`, `archive.html:264`, `bake-log.html:1499/1504` |
| Silent local duplicate of the above | `pym_auto_backup`, `pym_auto_backup_time` | `app.html:2666`, `archive.html:554-559` — written automatically on every save, **same device, same origin** |
| In-progress bake/timer state | `pym_active_bake`, `pym_bulk_start/_end`, `pym_cold_proof_start/_end`, `pym_bake_start/_end`, `pym_rest_*`, `pym_static_timer`, `pym_round_*`, `pym_alarm_pending` | `app.html:1805-1919` |
| Streaks | `pym_streak` | `gamification.js:32,68` |
| Starter name/health/feeding log | `pym_starter`, `pym_starter_log` | `gamification.js:93-136,110-113,401` |
| Baker level | `pym_baker_level` | `gamification.js:218` |
| Badges/achievements | `pym_achievements`, `pym_milestone_queue` | `gamification.js:354-382` |
| Daily tip rotation | `pym_daily_tip_index`, `pym_daily_tip_date` | `gamification.js:607-612` |
| Skill tree | `pym_skill_tree` | `gamification.js:661` |
| Starter reminder prefs | `pym_starter_reminder` | `gamification.js:679`, also `app.html:1458,1555`, `onboarding.html:1750,1769` |
| Language | `pym_lang` | `i18n.js:10,14`, `onboarding.html:1739` |
| Onboarding progress/answers | `pym_onboarding` | `onboarding.html` (many writes) |
| Sound preference | `pym_sound_prefs` | `onboarding.html:2121,2127` |

### Backup / restore / cloud sync

A manual export/import UI exists in `archive.html`/`app.html`, but its cloud half is dead code:

1. **"Save to Google Drive"** (`app.html:2718-2729`) — `GDRIVE_CLIENT_ID` is set to `''` (empty string) at `app.html:2562`. Because the OAuth client ID is empty, the Drive-upload path always rejects immediately and silently falls through to `navigator.share()` or a plain file download. **The button does not actually upload to Google Drive today** — it just offers a share sheet/download, and the user has to manually pick Drive (or anything else) themselves.
2. **"Restore from Drive" / "Choose File"** (`app.html:2731-2794`) — same story: the Drive-API path is unreachable dead code; the only working path is manually selecting a previously downloaded/shared `.json` file.
3. There is genuine, working **export-to-file** and **import-from-file** code — it's just not automatic cloud sync, and the "Google Drive" labeling overstates what actually happens.

### What happens on a new phone today

**Everything is lost** unless the user manually exported a JSON file and manually re-imported it on the new device: every bake log, rating, note, embedded photo, streak, starter name/health, badge, skill-tree progress, onboarding state, and language preference lives only in that one device's `localStorage`. The "auto-backup" key is not a real backup — it's a second copy on the *same* device, so it disappears in the same reinstall/data-clear event as the primary copy. Reinstalling the app is indistinguishable from wiping all progress unless the user proactively exported first.

---

## 6. Beginner-UX Friction List

Ranked roughly by how many first-time users hit it and how much it damages trust/motivation at that exact moment.

| # | Screen | Problem | Why it confuses a beginner | Suggested fix | Effort |
|---|---|---|---|---|---|
| 1 | Dashboard (first load) | A full-screen "Badge Unlocked" confetti modal auto-pops ~800ms after landing on the Dashboard for *every* new user (skip or complete path), blocking the UI underneath until dismissed | User hasn't done anything yet and is immediately interrupted by a celebration for a badge they don't understand | Don't auto-fire this on the very first Dashboard render; queue it for the user's first real action, or show a lightweight toast instead of a blocking modal | S |
| 2 | Onboarding (Ch. 2-4) | If the user backgrounds the app or navigates away any time after naming their starter (`c1s2`), the resume logic only checks whether `starterName` exists — it always resumes at `c1s1`, discarding all progress through the ~18 remaining screens (lessons, quizzes, all 8 interactive games, equipment checklist, first feeding) | "Why do I have to redo all of this?" — a silent, undocumented progress loss | Persist and read the actual `currentScreen` value (already being saved on every `goTo()`, just never read back) | M |
| 3 | Onboarding Ch. 3 (Gear) | Tapping "Learn more →" on an equipment item navigates the whole WebView away to a standalone page with no `target="_blank"` and no back affordance; returning re-triggers the onboarding gate, which (per #2) resets progress | User taps a helpful-looking link and loses their place with no warning | Open equipment guides in a way that preserves onboarding state (modal/sheet, or fix the resume bug in #2) | M |
| 4 | Onboarding finish screen | "Start My First Bake →" and "Go to Dashboard first" both land on the plain Dashboard — neither deep-links into the Bake wizard | The CTA promises to start baking right when motivation peaks, then doesn't | Make the "Start My First Bake" button actually call `showView('view-bake')` after landing on `app.html` | S |
| 5 | Language | No device-locale detection anywhere; defaults to English if the picker is skipped or mistapped | A Spanish-speaking user who doesn't carefully engage with the picker silently gets an English app | Read `navigator.language` (or add `@capacitor/device`) and pre-select accordingly | S–M |
| 6 | Every equipment/troubleshooting/tutorial page, Archive, Achievements, Bake Log | These pages show a language toggle that does nothing — 0 `data-i18n` usages, despite the Spanish text already existing in `i18n.js` | Spanish-speaking users hit an English wall exactly on the content they need most (help articles) and on high-stakes screens (bake logging, archive) | Wire up the existing `data-i18n` translations that are already written but unused | M |
| 7 | Dashboard (fresh install, onboarding skipped before naming a starter) | The Starter Companion card is stuck on static placeholder text — "Loading…" and "Health: 0%" — forever, because the render function early-returns when there's no starter state | Looks broken/frozen rather than empty; no CTA to fix it | Show an explicit "Name your starter to get started" empty state instead of leftover loading text | S |
| 8 | Archive | "Save to Google Drive" looks and behaves like it works (share sheet appears) but never actually authenticates or uploads to Drive — the OAuth client ID is empty | User believes their data is safely backed up in the cloud when it isn't; real risk of permanent data loss on device loss | Either wire up a real Google OAuth client ID, or relabel the button honestly ("Export / Share") until it's real | M |
| 9 | Onboarding Ch. 3 (Gear) | "Digital kitchen scale" links to the Banneton guide, and "Dutch oven or combo cooker" links to the Bread Sling guide — wrong content | Undermines trust in the app's guidance at a moment (buying gear) where accuracy matters | Fix the two `guide` field values in the `EQUIPMENT` array | S |
| 10 | Library — "Artisan Tutorials" | Cards show video-style runtime badges (04:12, 08:45, 12:30) and play icons, but the pages are plain text articles with no video | Sets the wrong expectation, minor but real trust ding | Relabel as "Articles" or add real embedded video | S |
| 11 | Library — equipment guides (Banneton, Lame, Bench Scraper, Bread Sling) | These 4 pages have no offline-image fallback, unlike the other 9 content pages which show a graceful placeholder | Offline users see a broken-image icon specifically on gear-shopping pages | Add the same `onerror` fallback pattern already used elsewhere in the app | S |
| 12 | Whole app | 6 pages (`bake-log.html`, `archive.html`, `library.html`, `achievements.html`, `image-picker.html`, `bread.html`) ship in the APK but are unreachable from the live SPA, aren't localized, and mostly link to each other rather than back into the app | If a user reaches one via a stray bookmark, deep link, or old push-notification target, they land in a maze with no easy way back to the real app | Either delete these files from the build or make them redirect into the SPA | M |
| 13 | Archive → "Delete all data" | The entire irreversible delete-everything confirmation dialog is hardcoded English | A Spanish-speaking user performing the single most destructive action in the app gets no localized warning | Route this confirm dialog's copy through `i18n.js` (translations largely don't exist yet for this specific dialog — needs writing) | S |
| 14 | Bake wizard | The hydration calculator isn't a discoverable, named feature — it's two input fields on Bake Stage 1 with no dedicated entry point or label calling it out | A beginner who wants "just the calculator" doesn't know it's hidden inside starting a full bake session | Add a "Hydration Calculator" shortcut card on the Dashboard or Library pointing at the same fields | S |
| 15 | `starter-kit.html` (Tools page, reached from onboarding gear checklist) | Its 4 "Read Guide" links go straight to the external pancitoymas.com website with no `target="_blank"`, hijacking the in-app WebView — inconsistent with the identical guides on `library.html`, which correctly stay local | User leaves the app without warning, unlike every other equivalent link elsewhere | Point these links at the local `.html` guides like `library.html` does | S |

---

## 7. Assets

### Local image assets actually used in the app

Only **`logo.png`** is referenced in-app (`app.html:223`, the header logo, 137KB). No other bundled illustration or photo asset is displayed by the running app.

### Local image assets that are NOT used (dead weight in every build)

`logo.jpg` (27KB, not referenced anywhere) and the entire `Images/` folder — **~28MB across 15 files, none of which are referenced by any `.html` or `.js` file in the repo:**

| File | Size |
|---|---|
| featured-crust.jpg | 882KB |
| featured-gummy.jpg | 721KB |
| featured-rise.jpg | 264KB |
| featured-science-steam.jpg | 918KB |
| featured-scoring.jpg | 284KB |
| featured-starter.jpg | 261KB |
| featured-sticky.jpg | 247KB |
| featured-stretch-fold.jpg | 215KB |
| Gemini_Generated_Image_2s7syu2s7syu2s7s.png | 1.9MB |
| Gemini_Generated_Image_ofvo27ofvo27ofvo.png | 1.9MB |
| Gemini_Generated_Image_os4zswos4zswos4z.png | 2.1MB |
| Gemini_Generated_Image_rs20z0rs20z0rs20.png | 1.9MB |
| Gemini_Generated_Image_u9vnbqu9vnbqu9vn.png | 7.4MB |
| Gemini_Generated_Image_y2fw6wy2fw6wy2fw.png | 6.6MB |
| Gemini_Generated_Image_zm7rkzm7rkzm7rkz.png | 1.8MB |

The `featured-*.jpg` filenames match the hero images actually shown in the Library, but the app pulls those images live from `https://pancitoymas.com/app/images/...` instead of using these local copies — so this folder appears to be an orphaned earlier version of the same assets, now dead weight that's still copied into `www/` and shipped in every APK build (`.github/workflows/build-android.yml`, "Prepare www directory" step: `cp -r Images www/`).

### Icons

No custom icon set — the app uses Google's **Material Symbols** icon font (loaded via CDN, e.g. `app.html:2938` `class="material-symbols-outlined"`) for UI icons, and emoji for badges/achievements (e.g. onboarding pill labels like "🧺 Banneton"). There are no custom illustrations for badges, starter states, or bake stages — everything is icon-font or emoji.

### Where photo guides could slot in

The app currently has zero real photography of an actual sourdough starter or dough at any stage — every visual is either a remote stock/generated hero image (Library articles) or an icon/emoji (gamification). The clearest opportunities for real photo guides:

1. **Starter stages** (Day 1 → Day 10) — `onboarding.html`'s `c0s2` "10-day starter recipe" screen and the Chapter 4 "First Feeding" flow (`c4s1`/`c4game`) currently rely on text/icons only; a day-by-day photo strip showing what healthy rise/bubbling looks like would directly address the single hardest thing for beginners to self-diagnose.
2. **Discard** — the glossary defines "Hooch" (`library.html:205-209`) with text only; a photo comparing normal hooch vs. a mold/discard warning sign would be high-value and currently has no visual home at all.
3. **Feeding ritual** — `c4game` ("Feeding Ritual") is an interactive game screen with no reference photography; a small photo reference of correct feeding ratios/consistency would pair naturally with it.
4. **The 4 troubleshooting guides** (rise, sticky, crust, gummy) already have a remote hero image each, but no in-article "what this actually looks like" comparison photos — these are exactly the pages a frustrated beginner lands on, so before/after or good/bad photo pairs would have outsized impact.

Whatever is added should be bundled locally (not fetched from pancitoymas.com like the current hero images) if offline reliability matters, given the `Images/` folder is currently unused capacity that already exists in the build pipeline.

---

## Risks & Decisions Needed

Decisions Alison should make before Phase 1 work begins:

1. **iOS: config task or rewrite?** → **Mostly config, with one real engineering project.** The app UI/storage/i18n layer will port with little to no change. The bake-timer alarm reliability system (Android `AlarmManager.setAlarmClock` + battery-optimization-exemption patches, `build-android.yml` steps 6a-6d) has no iOS equivalent and needs to be redesigned around iOS's native scheduled-notification model. Decide whether iOS ships with the same "always rings even hours later" alarm guarantee as Android, or a reduced guarantee, before scoping that work.

2. **Library: online-only or offline-first?** → **Already offline-first for text; images are the gap.** All article/glossary/troubleshooting/equipment text is bundled and works offline today. Only images (all pulled live from pancitoymas.com) and the optional site-search box need network. Decide whether to (a) bundle real local images (there's already an unused 28MB `Images/` folder that could be repurposed/replaced), or (b) formally accept "text works offline, images don't" as the product's offline story and add the missing `onerror` fallbacks to the 4 equipment pages that currently show broken-image icons.

3. **Google Drive backup: fix or relabel?** The button currently promises cloud backup but silently performs a local share/download instead (empty OAuth client ID). This is a data-loss trust risk that should be resolved — either wire up real OAuth credentials, or change the button's label/copy so it stops overstating what it does — independent of and probably before any first-run redesign work.

4. **Orphaned pages: delete or repair?** 6 pages (`bake-log.html`, `archive.html`, `library.html`, `achievements.html`, `image-picker.html`, `bread.html`) ship in every build but are unreachable and unlocalized. Decide whether to delete them from the build (smaller APK, less confusion if ever reached via stray link) or bring them in sync with the SPA.

5. **i18n integration debt.** The Spanish translation dictionary is essentially complete (907/907 keys), but roughly half the app's actual content pages don't consume it. This is a wiring task, not a translation task — worth scoping as its own chunk of work separate from the first-run redesign, since it affects trust-critical screens (delete-all-data confirmation, bake logging) as much as content pages.

6. **Onboarding resume bug.** Independent of the Phase 1 redesign, `onboarding.html`'s resume logic discards all progress past Chapter 1 if the user ever leaves and returns. If any part of the current onboarding/game flow survives into the new "Bootcamp Dashboard card" design, this bug should be fixed as part of that move, since the same interruption (backgrounding the app, following a link) will still be possible from a Dashboard card.

7. **Unused 28MB of image assets.** Confirm whether the `Images/` folder is intentional pre-staged content for a future feature (e.g. the photo guides suggested in §7) or safe to delete. Either way, it's currently inflating every APK build for no runtime benefit.

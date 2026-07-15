# Backup & Restore — Test Log (Phase 4)

This documents the full create → export → clear → restore loop for the storage
migration (AUDIT.md §5 / Phase 4). Two testing tiers are covered:

- **Verified in this session** (browser, web-dev fallback path — no
  `@capacitor/preferences`/`@capacitor/filesystem` native runtime available
  here): the full storage-wrapper logic, export/import flow, Replace/Merge
  choice, dashboard nudge, and welcome-screen restore link. Every item below
  marked ✅ was actually driven end-to-end via the JS console against the
  real app code — not just read/inferred.
- **Needs on-device verification before shipping**: the two things that
  literally cannot run outside a native Capacitor build — actual
  `@capacitor/preferences` durability (surviving a real localStorage clear)
  and actual `@capacitor/filesystem` photo storage. These are marked 📱
  **NEEDS DEVICE TEST** below, with the exact steps to run them.

---

## What changed (context for the test steps)

- Durable `pym_*` data (bake logs, starter, achievements, streaks, skill
  tree, settings, language, onboarding progress) now flows through
  `storage.js`, which mirrors every write to native `Preferences` in the
  background while keeping a synchronous localStorage shadow. See
  `storage.js`'s header comment for the full architecture.
- Bake photos: on native, a saved photo is written to a
  `@capacitor/filesystem` file (`bake-photos/{id}.jpg` in the `DATA`
  directory) instead of being embedded as base64 inside `pym_logs` — keeps
  that value small. On web (no Filesystem), photos still embed as base64,
  same as before.
- Export (`exportBackup()`) always produces one self-contained `.json` —
  any Filesystem-stored photo is read back and re-embedded as base64 for the
  export, so the file works standalone on a different device or fresh
  install. Sets `pym_last_export_time` on success.
- Import (`_pymHandleImportFile`) shows an explicit bilingual
  Replace-everything / Merge choice (no more silent auto-merge), and
  converts any embedded photo back to a Filesystem file on native.
- "Last backup" on the Archive screen now reflects the real last export
  date, not "last time anything was saved."
- Dashboard shows a small, dismissible (never modal) nudge if the user has
  ≥3 logged bakes and hasn't exported in 30+ days.
- The welcome screen has a quiet "Restore a backup" link for fresh installs.
- **Android Auto Backup for Apps** is now also configured (build workflow,
  "Configure Android Auto Backup for Apps" step). This is a second, fully
  automatic layer on top of manual export: Android periodically backs up the
  app's SharedPreferences (all `pym_*` data via `@capacitor/preferences`) and
  the `bake-photos/` files to the user's Google account in the background,
  with no action required, and restores them automatically on reinstall or a
  new device. It does **not** replace manual export — see caveats below.

---

## ✅ Verified this session (web-dev fallback path)

All of the following were driven live against `app.html`/`onboarding.html`
in the browser preview, in both languages, with console errors checked after
every step (none found).

| # | Step | Result |
|---|---|---|
| 1 | Fresh load, `window.PymStorage` initializes, `ready` resolves | ✅ `typeof window.PymStorage === 'object'`, `isNative: false` (correct — no Capacitor runtime in a browser tab) |
| 2 | Create 3 bake logs via `saveLogs()`, one with an embedded base64 photo | ✅ `getLogs()`, raw `localStorage.pym_logs`, and the rendered Archive grid all agree — 3 cards, 1 with a photo |
| 3 | `_pymPhotoSrc(log)` on a web-fallback (non-Filesystem) log | ✅ returns the embedded base64 unchanged (native `photoUri` branch correctly skipped since `IS_NATIVE` is false) |
| 4 | Gamification: rename starter, feed it, check in (streak) | ✅ `getStarterState()`/`getStreak()` results match across `PymGamification`, raw `localStorage`, and `PymStorage.get()` — same values, no drift |
| 5 | Export via `exportBackup()` | ✅ `pym_last_export_time` set; Archive "Last backup" label updates to `Last backup: Jul 14, 2026` (EN) — see also step 10 for ES |
| 6 | Dashboard nudge: 3+ logs, never exported | ✅ nudge visible (`#backup-nudge` not `.hidden`) |
| 6b | Dismiss nudge | ✅ hides immediately, stays hidden across a `renderDashboard()` re-render (14-day suppression working) |
| 7 | Import → Merge choice | ✅ Replace/Merge/Cancel sheet renders with correct entry count; choosing **Merge** on a 3-log archive + 1-log import file → 4 total, both old and new ids present |
| 8 | Import → Replace choice | ✅ choosing **Replace** on the same setup → exactly 1 log left (the imported one), old data gone |
| 9 | Delete-all-data (two-step confirm) | ✅ both confirmation dialogs render fully bilingual (`common.cancel`/`archive.deleteAll.*` keys), confirming through both steps → `getLogs().length === 0` |
| 10 | Full page reload after saving data | ✅ `getLogs()` and starter name both survive a real `location.reload()` (localStorage shadow → cache re-hydration on boot) |
| 11 | `onboarding.html`'s `storage` adapter (pym_onboarding) | ✅ `storage.getItem/setItem`, `window.PymStorage.get()`, and raw `localStorage.getItem` all agree after a `goTo()` call |
| 12 | Cross-page language write consistency | ✅ set language to ES on `onboarding.html` via `pickLang('es')` → navigated to `banneton.html` (a standalone content page) → loaded already in Spanish, no revert. This was the specific race the Preferences-reconciliation-overwrite risk could have caused (see `storage.js` header) — confirmed not happening |
| 13 | Welcome screen "Restore a backup" link | ✅ fresh install (cleared localStorage) → welcome screen shows the link → triggered import → Replace chosen → welcome overlay dismisses, lands on Archive view showing the restored log, `pym_welcome_seen` set |
| 14 | EN/ES i18n key parity after this phase's additions | ✅ 1356 keys each language, zero missing either direction (checked via `Object.keys()` diff against the live `TRANSLATIONS` object) |
| 15 | Console errors across all of the above | ✅ none, at any step |

---

## 📱 NEEDS DEVICE TEST (cannot be verified outside a native build)

These require an actual Android build (or iOS, once that platform exists)
installed on a device or emulator — the browser preview has no
`@capacitor/preferences`/`@capacitor/filesystem` native implementation to
exercise. **Do this before considering the durability migration fully
proven**, since surviving a real localStorage wipe is the entire point of
this phase.

### Test A — Preferences survives a localStorage clear

1. Install the app fresh (or clear app data first). Complete onboarding,
   log at least 2 bakes (one with a photo), earn at least one badge, set a
   daily reminder, switch language to Spanish.
2. Force-close the app. In Android Settings → Apps → Pancito y Más →
   Storage, tap **Clear storage** (this wipes the app's WebView localStorage
   — it's the closest on-device equivalent to the OS-storage-pressure
   scenario this migration protects against). **Do not uninstall** —
   uninstalling would also wipe Preferences/SharedPreferences, which is not
   the scenario being tested.

   If "Clear storage" isn't available/granular enough on your Android
   version, an alternative: `adb shell pm clear com.pancitoymas.sourdough`
   also clears everything including Preferences, so it's not a clean test of
   *this specific* scenario — flag this to Alison if a more surgical
   WebView-only cache clear isn't available on the test device, since it may
   mean this exact recovery case is hard to reproduce on-device at all and
   the value is more in normal upgrade/update durability than a full-wipe
   recovery.
3. Relaunch the app. Expected: the 2 bake logs (with the photo intact),
   the badge, the reminder setting, and the Spanish language should all
   still be there, recovered from Preferences during `storage.js`'s async
   reconciliation on boot.
4. Check `adb logcat` for any errors from the `Preferences` or `Filesystem`
   plugin during this boot.

### Test B — Filesystem photo storage end-to-end

1. Log a bake with a photo (camera or gallery). Confirm `IS_NATIVE` is
   true (native build). Immediately after saving, check on-device (via
   `adb shell run-as com.pancitoymas.sourdough ls files/bake-photos/` or
   similar) that a `.jpg` file was written under the app's `DATA` directory
   and that the corresponding entry in `pym_logs` has `photoUri`/`photoFile`
   set and **no** `photo` (base64) field.
2. View the bake in Archive — the photo should display normally (rendered
   via `Capacitor.convertFileSrc()`).
3. Export a backup. Open the resulting `.json` and confirm the photo comes
   back as an embedded base64 `photo` field (not a bare file path) — this is
   what makes the export self-contained/portable.
4. Delete that bake log from the Archive. Confirm the corresponding
   `bake-photos/*.jpg` file is also removed (not orphaned).
5. Re-import the backup from step 3. Confirm a new Filesystem file gets
   written (photo round-trips back to file storage, not left as base64 in
   live `pym_logs`), and the photo displays correctly.

### Test C — Full loop end-to-end, both languages, on-device

Repeat the create → export → clear-app-data (uninstall + reinstall this
time, the real "new phone" scenario, not just storage-clear) → welcome
screen → restore → verify loop once in English and once in Spanish:

1. Fresh install → welcome screen appears in device language.
2. Log 2-3 bakes (with photos), feed the starter a few times, unlock at
   least one badge, build a short streak.
3. Export from Archive → share/save the `.json` file somewhere retrievable
   (e.g. email it to yourself, or use a Files app to move it off-device).
4. Uninstall the app completely. Reinstall.
5. On the welcome screen, tap "Restaurar una copia / Restore a backup",
   select the exported file, choose **Replace** (nothing to merge with on a
   fresh install).
6. Verify: all bake logs present with photos intact, starter name/health/
   feeding history restored, badges/streak restored, and — importantly —
   confirm the language matches what was exported (the export itself
   doesn't carry `pym_lang`; on a fresh install the welcome screen's own
   device-language auto-detect governs the initial language, and the user
   can switch manually — confirm this handoff feels reasonable rather than
   confusing).
7. Repeat with the device's system language set to Spanish for step 1-6, to
   confirm the whole flow (welcome screen copy, coach marks, Replace/Merge
   dialog, "Last backup" date formatting) reads naturally in Spanish
   end-to-end, not just that individual strings translate correctly in
   isolation.

### Test D — Android Auto Backup for Apps

This cannot be exercised in this browser-only environment at all — it is a
build/manifest configuration that only a real Android OS backup pass can
verify. Reviewed by code inspection only (see "Known limitations" below).

1. Install the app fresh on a device signed into a Google account with
   backup enabled (Settings → System → Backup). Log a few bakes with photos.
2. Force a backup pass immediately instead of waiting for the OS's own
   schedule: `adb shell bmgr backupnow com.pancitoymas.sourdough` (requires
   a debug-enabled device/emulator with `adb`).
3. Check the command output / `adb logcat -s BackupManagerService` for a
   success result for this package.
4. Uninstall the app, then reinstall it from the same source (Play Store
   install is the real-world path; a fresh `adb install` of the same APK/AAB
   signature also triggers restore). On first launch, confirm the bake logs,
   photos, and gamification state came back **without** using the in-app
   "Restore a backup" flow at all.
5. Confirm `adb shell dumpsys backup` lists `com.pancitoymas.sourdough` as
   backed up, and that its size is well under the ~25MB per-app cap Android
   enforces.

---

## Known limitations / honest caveats

- **Auto Backup for Apps is best-effort, not guaranteed.** It only runs if
  the device itself has backup enabled (on by default on most phones, but
  users can turn it off), needs a Wi-Fi connection and the device to be idle
  and charging, and Android decides the schedule — it is not instant or
  on-demand from inside the app. The manual "Export backup file" feature
  remains the reliable, user-controlled path and is not being deprioritized.
- Auto Backup's ~25MB per-app cap is shared across every backed-up file
  (SharedPreferences + all `bake-photos/*.jpg`). A user with many
  high-resolution bake photos could exceed it — Android silently skips
  backing up that app for the cycle rather than erroring, so there's no
  in-app way to detect or surface this today.
- The old WebView `database` domain (localStorage/IndexedDB) is explicitly
  excluded from both backup rule files, since Preferences/Filesystem are now
  the source of truth for durable data — this keeps the backup small and
  avoids restoring stale, superseded copies of the same data.

- `pym_last_export_time` (and the dashboard nudge's dismiss timestamp) are
  themselves durable pym_* keys mirrored to Preferences — if a user's
  language, streak, etc. survive a wipe but this timestamp resets, the
  worst case is the nudge reappears slightly earlier/later than the "true"
  30-day mark. Not a data-loss risk, just a minor UX nit.
- The export format doesn't include `pym_lang`, starter reminder settings,
  or achievement/skill-tree state — only `pym_logs`. A user restoring on a
  brand-new device gets their bake history and photos back, but re-earns
  badges from scratch based on the restored log count (since achievement
  unlocking is recalculated from log data) and needs to re-pick their
  language/reminder preferences manually. This matches the Phase 4 brief's
  literal scope ("export produces ONE .json file... restores with a clear
  Replace/Merge choice") — it names bake data specifically, not the full
  app-state snapshot. Worth confirming with Alison whether achievements/
  starter/settings should also ride along in a future pass.
- Ephemeral in-progress-bake timer state (active bulk/proof/bake timers)
  intentionally does **not** survive an app-data clear or reinstall — see
  `storage.js`'s header comment for the reasoning (high-frequency writes,
  low value if lost, out of scope for this migration).

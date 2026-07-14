# Translations Review — Phase 3 i18n Integration

This file tracks translation choices from the Phase 3 i18n pass (AUDIT.md §4) that are worth a native-speaker glance before considering them final. None of these are bugs — the app functions correctly and every page renders fully in Spanish — but a few word choices were judgment calls made without a human reviewer, and are flagged here as instructed.

Full manual QA pass (§4 of the Phase 3 brief) is complete: every one of the 13 content pages, plus the SPA library view, plus app.html's rename/import/delete-all-data dialogs, plus onboarding.html's equipment checklist, were loaded in Spanish and read end-to-end. No leftover English was found anywhere except intentionally-untranslated proper nouns/brand names (see "Confirmed correct as-is" below).

---

## Worth a native-speaker glance

1. **"Dutch oven" translation is inconsistent across the app.** `science-of-steam.html` and `troubleshoot-crust.html` use **"olla holandesa"**, matching `breadSling.*`/`lame.*` keys elsewhere in `i18n.js`. But `troubleshoot-crust.html`'s own H2 heading uses **"Olla de Hierro (Dutch Oven)"**, and the pre-existing (now-activated) onboarding equipment key `onboarding.equip.dutch.name` uses **"Olla de hierro fundido"**. All three are understandable and commonly used by Spanish-speaking bakers, but picking one term app-wide would read more polished. My inclination would be "olla holandesa" since it's the majority usage, but this is Alison's call.

2. **`steam.body.withoutSteamP1`** (science-of-steam.html) coins **"pan de horneado libre"** for "free-baked loaf." This has no prior precedent elsewhere in `i18n.js` — it's a first-time translation choice, not an established term. Worth confirming it reads naturally rather than awkwardly literal.

3. **`troubleshoot.crust.body.dutchLi1`** translates "screaming hot" as **"ardiendo de caliente"** — a colloquial intensifier. A more literal/formal alternative ("abrasadoramente caliente") exists but reads stiffer. Kept the colloquial version for tone consistency with the rest of the site's warm, casual voice.

4. **`troubleshoot.crust.body.trayP`** translates "flash-steams" as **"se evapora al instante."** This loses the compound-verb terseness of the English but conveys the same meaning. No cleaner single-word Spanish equivalent was obvious.

5. **`troubleshoot.rise.body.checklistItem6`** keeps a bilingual parenthetical: **"impulso en el horno (oven spring)."** "Oven spring" is common jargon even among Spanish-speaking home bakers, so it was kept alongside the Spanish translation rather than dropped. Fine to remove the parenthetical if you'd rather commit fully to Spanish terminology.

6. **`starterKitPage.heroTitleLine1`/`heroTitleLine2`** — the EN hero splits "Sourdough" (plain style) / "Starter Kit" (colored/emphasized style) across two visually distinct lines. There's no natural word-for-word Spanish split at the same point, so I chose **"Kit Iniciador" / "de Masa Madre"** as the two lines (concatenating to "Kit Iniciador de Masa Madre"). This is a stylistic judgment call on where the line break and color emphasis falls — worth a glance to confirm it reads well split across two lines in the actual layout.

7. **`edu.moreArticles`** ("More to Explore" / "Más para Explorar") is reused as the "more content" section heading on `stretch-and-fold.html`, `starter-revival.html`, and `scoring-aesthetics.html`. Their original static English fallback text varied ("Continue Learning" on some pages) before being wired to this shared key — at runtime (JS always applies translations), all three now correctly show "More to Explore" / "Más para Explorar" in both languages, so there's no user-visible bug. But if you'd ever prefer distinct wording per page again, these three would need their own dedicated keys instead of sharing `edu.moreArticles`. `science-of-steam.html` was kept on its own dedicated key (`steam.body.continueLearning` = "Continue Learning" / "Sigue Aprendiendo") rather than reusing the shared one, so that page's heading intentionally differs from the other three.

---

## Bugs found and fixed during this pass (not open items — noted for context)

- **Duplicate/colliding i18n keys.** While wiring `onboarding.html`'s equipment checklist, I initially minted new keys (`onboarding.equip.dutchOven.*`, `onboarding.equip.thermometer.*`, plus generic `onboarding.equip.learnMore/haveIt/needIt`) without realizing **pre-existing, purpose-built, already-translated keys for this exact list already existed** under slightly different names (`onboarding.equip.dutch.*`, `onboarding.equip.therm.*`) — leftover from an earlier version of the app that were never wired up (matching a finding from the original AUDIT.md about orphaned translations). Since JS object literals let the last duplicate key silently win, this caused a mismatch between what I wrote and what actually rendered (caught during the manual QA pass, not before). Fixed by removing my duplicate keys and pointing the equipment array at the pre-existing ones — which has the nice side effect of finally activating translations that had been sitting unused in the dictionary.
- **`archive.modal.hrs`** (ES) changed from the English abbreviation "hrs" to "h". `archive.modal.min` was left as "min" — this is standard Spanish usage too, not an oversight.
- **`onboarding.c2game.pill.temp`** (ES) changed from untranslated "🌡️ Temp" to "🌡️ Temp." to match sibling pills in the same widget, which were already translated.

---

## Confirmed correct as-is (not translation gaps)

Loanwords/proper nouns intentionally left untranslated, matching established convention elsewhere in `i18n.js`: **banneton**, **lame**, **boule**, **bâtard**, **Rubaud** (baker's name). "El Lame" (not "La Cuchilla") is used consistently as the page/section title for the scoring tool, matching `lame.title`.

---

## Guardrail script

`scripts/check-i18n.js` (plain Node, no dependencies) verifies EN/ES key parity and heuristically scans shipped HTML for likely-hardcoded strings. As of this pass: **1341 keys in each language, zero missing in either direction.** Run with `node scripts/check-i18n.js`; see README for details. It's a heuristic, not a linter — expect occasional false positives (icon ligature names, numeral fragments) and treat its output as a worklist, not a verdict.

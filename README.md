# 🥖 Pancito y Más — Sourdough Companion App

> A beautifully designed sourdough baking companion app for Android, built by [Pancito y Más](https://pancitoymas.com).

---

## Overview

Pancito y Más is a mobile-first web app packaged as an Android application using Capacitor. It guides bakers through every stage of the sourdough process — from starter health to final bake — with live timers, a knowledge library, bake logging, and equipment guides.

---

## Features

- **Bake Lab Live** — Active bake tracker with live countdown timers, stage roadmap (Bulk → Shape → Proof → Bake), and session progress
- **Bake Log** — 6-step guided baking session: Mix, Bulk Fermentation, Shape, Proof, Bake, Result with star rating
- **Knowledge Library** — Searchable glossary, artisan tutorials, and troubleshooting guides
- **Essential Equipment** — In-app guides for The Banneton, The Lame, Bench Scraper, and Bread Sling with Amazon kit link
- **Archive** — Historical bake records stored locally with ratings and notes
- **Local Notifications** — Timer alerts for stretch & fold rounds and bake stages

---

## Tech Stack

| Layer | Technology |
|---|---|
| UI Framework | Tailwind CSS (CDN) + Material Symbols |
| Fonts | Noto Serif + Plus Jakarta Sans (Google Fonts) |
| Runtime | Vanilla HTML / CSS / JavaScript |
| Mobile Packaging | Capacitor 6.1.2 |
| Platform | Android |
| Storage | Browser localStorage |
| Notifications | @capacitor/local-notifications |

---

## App Structure

```
pancito-app/
├── index.html              # Dashboard — stats, active bake, equipment section
├── bake-log.html           # 6-step bake session tracker
├── library.html            # Knowledge hub — glossary, tutorials, troubleshooting
├── archive.html            # Past bakes history
│
├── banneton.html           # Equipment guide: The Banneton
├── lame.html               # Equipment guide: The Lame
├── bench-scraper.html      # Equipment guide: Bench Scraper
├── bread-sling.html        # Equipment guide: Bread Sling
│
├── science-of-steam.html   # Article: The Secret of Steam
├── stretch-and-fold.html   # Tutorial: Stretch & Fold
├── scoring-aesthetics.html # Tutorial: Scoring Aesthetics
├── starter-revival.html    # Tutorial: Starter Revival
│
├── troubleshoot-rise.html  # Guide: Why didn't my bread rise?
├── troubleshoot-sticky.html
├── troubleshoot-crust.html
├── troubleshoot-gummy.html
│
├── logo.png
├── capacitor.config.json
└── package.json
```

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18+)
- [Android Studio](https://developer.android.com/studio)
- Java 17+

### Install

```bash
git clone https://github.com/goalison/pancito-app.git
cd pancito-app
npm install
```

### Build & Sync to Android

```bash
npm run build    # Syncs web files to Android project
npm run open     # Opens Android Studio
```

Then in Android Studio: **Run > Run 'app'** to deploy to a device or emulator.

---

## App ID

```
com.pancitoymas.app
```

---

## Versioning

This project uses [Semantic Versioning](https://semver.org/): `MAJOR.MINOR.PATCH`

- **MAJOR** — Complete redesigns or breaking structural changes
- **MINOR** — New screens, features, or sections added
- **PATCH** — Bug fixes, copy changes, UI tweaks

---

## Changelog

### v1.3.0 — 2026-04-12
**Essential Equipment in Dashboard**
- Moved equipment section (Banneton, Lame, Bench Scraper, Bread Sling) from Tools tab into the Dashboard
- Created local in-app pages for all 4 equipment guides (no longer opens external website)
- Added "The Secret of Steam" as a featured card in the Library
- Reduced bottom navigation from 5 to 4 tabs (removed Tools): Dash, Bake, Library, Archive
- Equipment images loaded directly from pancitoymas.com

### v1.2.0 — 2026-04
**Timer & UI Polish**
- Fixed bulk fermentation timer display on Dashboard
- Improved font consistency across bake stages
- Premium UI polish on active bake card
- Stage roadmap indicators (Bulk → Shape → Proof → Cold)

### v1.1.0 — 2026-03
**Knowledge Library & Tools**
- Added full Library screen with searchable glossary (10 terms)
- Added Artisan Tutorials section with 3 video guide cards
- Added Troubleshooting Guide (bento grid layout)
- Added Tools/Equipment screen (starter-kit.html) with bento product grid
- Added Science of Steam article page

### v1.0.0 — 2026-03
**Initial Release**
- Dashboard with live bake tracker, stats, and quality trend chart
- 6-step Bake Log session (Mix → Bulk → Shape → Proof → Bake → Result)
- Archive with bake history and star ratings
- Capacitor Android packaging with local notifications for timers
- Warm earth tone design system (primary: #875305, secondary: #835334)

---

## How to Update the Changelog

When you make changes, add a new entry at the **top** of the Changelog section following this format:

```markdown
### vX.X.X — YYYY-MM-DD
**Short Title**
- Change 1
- Change 2
```

Then update the `version` field in `package.json` to match.

---

## Links

- Website: [pancitoymas.com](https://pancitoymas.com)
- Community: [Facebook Group](https://www.facebook.com/groups/1235548458006543)
- TikTok: [@pancitoymas](https://www.tiktok.com/@pancitoymas)
- Kit: [Amazon — Sourdough Starter Kit](https://www.amazon.com/dp/B0FZWXPXF6)

---

*Made with flour, water, salt, and a little bit of code. 🍞*

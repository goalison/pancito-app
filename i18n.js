// ═══════════════════════════════════════════════════════════════════════════
// Pancito y Más — i18n Module (i18n.js)
// Loaded on every page. Provides EN / Mexican-Spanish translations.
// ═══════════════════════════════════════════════════════════════════════════
(function () {
  'use strict';

  // ── Core helpers ──────────────────────────────────────────────────────────
  function getCurrentLang() {
    try { return localStorage.getItem('pym_lang') || 'en'; } catch (_) { return 'en'; }
  }

  function setLang(lang) {
    try { localStorage.setItem('pym_lang', lang); } catch (_) {}
    applyTranslations();
    updateLangToggles();
    // Re-render any JS-driven views that are currently visible
    if (typeof renderDashboard    === 'function') try { renderDashboard();    } catch (_) {}
    if (typeof renderArchive      === 'function') try { renderArchive();      } catch (_) {}
    if (typeof renderAchievements === 'function') try { renderAchievements(); } catch (_) {}
    if (typeof renderLibrary      === 'function') try { renderLibrary();      } catch (_) {}
    if (typeof renderStarterCompanion === 'function') try { renderStarterCompanion(); } catch (_) {}
  }

  function t(key) {
    var lang = getCurrentLang();
    var dict = TRANSLATIONS[lang] || TRANSLATIONS['en'];
    return dict[key] !== undefined ? dict[key] : (TRANSLATIONS['en'][key] !== undefined ? TRANSLATIONS['en'][key] : key);
  }

  function applyTranslations() {
    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      el.textContent = t(el.dataset.i18n);
    });
    document.querySelectorAll('[data-i18n-html]').forEach(function (el) {
      el.innerHTML = t(el.dataset.i18nHtml);
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(function (el) {
      el.placeholder = t(el.dataset.i18nPlaceholder);
    });
    document.querySelectorAll('[data-i18n-title]').forEach(function (el) {
      el.title = t(el.dataset.i18nTitle);
    });
    document.documentElement.lang = getCurrentLang();
    updateLangToggles();
  }

  function updateLangToggles() {
    var lang = getCurrentLang();
    document.querySelectorAll('.pym-lang-btn').forEach(function (btn) {
      if (btn.dataset.lang === lang) {
        btn.style.background = '#875305';
        btn.style.color = '#fff';
        btn.style.borderColor = '#875305';
      } else {
        btn.style.background = 'transparent';
        btn.style.color = '#875305';
        btn.style.borderColor = '#d6c3b3';
      }
    });
  }

  // ── Toggle HTML injected into each page header ────────────────────────────
  function injectLangToggle(targetEl) {
    if (!targetEl) return;
    var wrap = document.createElement('div');
    wrap.className = 'pym-lang-toggle';
    wrap.style.cssText = 'display:inline-flex;border:1.5px solid #d6c3b3;border-radius:999px;overflow:hidden;';
    wrap.innerHTML =
      '<button class="pym-lang-btn" data-lang="en" style="padding:4px 14px;font-size:11px;font-weight:800;letter-spacing:.08em;border:none;cursor:pointer;font-family:\'Plus Jakarta Sans\',sans-serif;transition:all .15s;" onclick="window.PymI18n.setLang(\'en\')">EN</button>' +
      '<button class="pym-lang-btn" data-lang="es" style="padding:4px 14px;font-size:11px;font-weight:800;letter-spacing:.08em;border:none;cursor:pointer;font-family:\'Plus Jakarta Sans\',sans-serif;transition:all .15s;" onclick="window.PymI18n.setLang(\'es\')">ES</button>';
    targetEl.appendChild(wrap);
    updateLangToggles();
  }

  // ── Auto-inject toggle on DOMContentLoaded ────────────────────────────────
  document.addEventListener('DOMContentLoaded', function () {
    // Prevent any toggle overflow from causing horizontal page scroll
    document.documentElement.style.overflowX = 'hidden';

    var BTN_STYLE = 'padding:3px 9px;font-size:10px;font-weight:800;letter-spacing:.08em;border:none;cursor:pointer;font-family:\'Plus Jakarta Sans\',sans-serif;transition:all .15s;';
    var BTNS =
      '<button class="pym-lang-btn" data-lang="en" style="' + BTN_STYLE + '" onclick="window.PymI18n.setLang(\'en\')">EN</button>' +
      '<button class="pym-lang-btn" data-lang="es" style="' + BTN_STYLE + '" onclick="window.PymI18n.setLang(\'es\')">ES</button>';
    var WRAP_BASE = 'display:inline-flex;border:1.5px solid #d6c3b3;border-radius:999px;overflow:hidden;flex-shrink:0;';

    function makeToggle(extraCss) {
      var wrap = document.createElement('div');
      wrap.className = 'pym-lang-toggle';
      wrap.style.cssText = WRAP_BASE + (extraCss || '');
      wrap.innerHTML = BTNS;
      return wrap;
    }

    // Strategy 1: insert BEFORE the icon group (timer/account) in its parent flex container.
    // This places the toggle as a new sibling item, left of the icons, without disturbing layout.
    var iconGroup = document.querySelector('header .flex.items-center.gap-3.text-\\[\\#875305\\]');
    if (iconGroup && iconGroup.parentElement) {
      iconGroup.parentElement.insertBefore(makeToggle(), iconGroup);
      updateLangToggles();
      applyTranslations();
      return;
    }

    // Strategy 2: pages with a right-side flex group but no icon group (achievements, etc.)
    var rightGroup = document.querySelector('header div.flex.items-center.gap-6, header div.flex.items-center.gap-4');
    if (rightGroup) {
      rightGroup.appendChild(makeToggle());
      updateLangToggles();
      applyTranslations();
      return;
    }

    // Strategy 3: educational pages — absolute position inside header, right of center logo
    var header = document.querySelector('header');
    if (header) {
      header.appendChild(makeToggle('position:absolute;right:16px;top:50%;transform:translateY(-50%);z-index:10;'));
    }

    updateLangToggles();
    applyTranslations();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // TRANSLATIONS
  // ═══════════════════════════════════════════════════════════════════════════
  var TRANSLATIONS = {

    // ─────────────────────────────────────────────────────────────────────────
    en: {
      // ── Navigation ──────────────────────────────────────────────────────
      'nav.dashboard': 'Dashboard',
      'nav.bake':      'Bake',
      'nav.library':   'Library',
      'nav.archive':   'Archive',
      'nav.dash':      'Dash',
      'nav.badges':    'Badges',

      // ── Days / time-of-day ───────────────────────────────────────────────
      'day.sunday':    'Sunday',
      'day.monday':    'Monday',
      'day.tuesday':   'Tuesday',
      'day.wednesday': 'Wednesday',
      'day.thursday':  'Thursday',
      'day.friday':    'Friday',
      'day.saturday':  'Saturday',
      'period.morning':   'Morning',
      'period.afternoon': 'Afternoon',
      'period.evening':   'Evening',
      'period.night':     'Night',

      // ── Dashboard — hero ─────────────────────────────────────────────────
      'hero.headline': 'Your dough is breathing.',
      'hero.sub': 'Welcome back to the workbench. The environment is perfect for a slow cold ferment today.',
      'hero.cta': 'Start New Bake',

      // ── Dashboard — stats ────────────────────────────────────────────────
      'stat.totalBakes':    'Total Bakes',
      'stat.avgRating':     'Avg. Rating',
      'stat.streak':        'Daily Streak',
      'stat.bestStreak':    'Best Streak',
      'stat.days':          'days',
      'stat.streakDefault': 'Start your streak today',
      'stat.personalRecord':'Personal record',
      'stat.qualityTrend':  'Quality Trend',
      'stat.last5':         'Last 5',
      'stat.streakCounting': 'days and counting!',

      // ── Dashboard — Bake Lab section ─────────────────────────────────────
      'bakelab.label':      'Bake Lab Live',
      'bakelab.waiting':    'Waiting for Dough...',
      'bakelab.inProgress': 'In Progress',
      'bakelab.noSession':  'Ready to fire up the oven? Select a recipe from your library or start a fresh session.',
      'bakelab.newSession': 'New Session',
      'bakelab.totalProgress': 'Total Session Progress',
      'bakelab.coldTarget': 'Cold Proof target: 12-18 hours',
      'bakelab.bakeNow':    'Bake soon',

      // ── Dashboard — starter companion ────────────────────────────────────
      'starter.label':       'Starter',
      'starter.loading':     'Loading…',
      'starter.health':      'Health:',
      'starter.feedBtn':     'Feed & Check In',
      'starter.reminder':    'Daily reminder',
      // Stage texts (appended after starter name in JS)
      'starter.dormant':  'is resting… feed soon',
      'starter.hungry':   'is getting hungry!',
      'starter.active':   'is fed and happy 😊',
      'starter.thriving': 'is thriving!',
      'starter.peak':     'is at peak — bake now! 🚀',

      // ── Dashboard — check-in sheet ───────────────────────────────────────
      'checkin.title':       'Feed & Check In',
      'checkin.question':    'How is',
      'checkin.questionEnd': 'doing?',
      'checkin.flat':        '😴 Flat',
      'checkin.bubbly':      '🫧 Bubbly',
      'checkin.doubling':    '🚀 Doubling',
      'checkin.tempLabel':   'Room Temp (°F) — optional',
      'checkin.tempPlaceholder': 'e.g. 72',
      'checkin.feedBtn':     'Feed',
      'checkin.feedIcon':    '🌾',
      'checkin.noActivity':  'Please select how your starter is doing first!',
      'checkin.howMuch':     '💡 How much should I feed?',
      'checkin.ratioNote':   'Ratio = Starter : Flour : Water. All measured by weight (grams).',
      'checkin.ratio.1_1_1_title': 'Twice a day',
      'checkin.ratio.1_1_1_sub':   'Fast, very active starter',
      'checkin.ratio.1_2_2_title': 'Classic daily',
      'checkin.ratio.1_2_2_sub':   'Reliable and predictable',
      'checkin.ratio.1_3_3_title': 'Once-a-day ⭐',
      'checkin.ratio.1_3_3_sub':   'Keeps starter going longer — recommended',
      'checkin.ratio.1_5_5_title': 'Fridge rest',
      'checkin.ratio.1_5_5_sub':   '1–2 weeks without feeding',

      // ── Dashboard — reminder toasts ──────────────────────────────────────
      'reminder.denied':  '⚠️ Reminder permission denied — check app settings',
      'reminder.off':     '🔕 Reminder turned off',
      'reminder.set':     '✓ Reminder set for',
      'reminder.daily':   'daily',

      // ── Dashboard — tip card ─────────────────────────────────────────────
      'tip.todayLabel': "Today's Tip",

      // ── Dashboard — recent badges ─────────────────────────────────────────
      'badges.recent':  'Recent Badges',
      'badges.seeAll':  'See All →',

      // ── Dashboard — kit banner ────────────────────────────────────────────
      'kit.curatedBy':  'Curated by Alison',
      'kit.headline':   'Everything you need, in one kit.',
      'kit.items':      'Banneton · Lame · Bread Sling · Bench Scraper',
      'kit.cta':        'Get the Starter Kit →',
      'kit.equipGuide': 'Equipment guides →',
      'kit.browseLib':  'Browse the Library',
      'kit.getKit':     'Get the Kit',

      // ── Dashboard — equipment guides in library section ───────────────────
      'equip.label':       "Baker's Tools",
      'equip.title':       'Equipment Guides',
      'equip.banneton.name': 'The Banneton',
      'equip.banneton.sub': 'Shape your dough and achieve that beautiful characteristic spiral crust.',
      'equip.lame.name':   'The Lame',
      'equip.lame.sub':    'Master sourdough scoring.',
      'equip.scraper.name':'Bench Scraper',
      'equip.scraper.sub': 'Shape high-hydration dough.',
      'equip.sling.name':  'Bread Sling',
      'equip.sling.sub':   'Transfer your loaf to the blazing Dutch oven with ease and safety.',
      'equip.readGuide':   'Read Guide',

      // ── Bake stepper nav labels ───────────────────────────────────────────
      'step.mix':    'Mix',
      'step.bulk':   'Bulk',
      'step.shape':  'Shape',
      'step.proof':  'Proof',
      'step.bake':   'Bake',
      'step.result': 'Result',

      // ── STEP_LABELS (used in JS) ──────────────────────────────────────────
      'stepLabel.1.stage':       'Initial Mix',
      'stepLabel.1.instruction': 'Mix flour, water, starter and salt until no dry flour remains.',
      'stepLabel.2.stage':       'Bulk Fermentation',
      'stepLabel.2.instruction': 'Fold every 30 minutes. Watch for 50-75% rise.',
      'stepLabel.3.stage':       'Shaping',
      'stepLabel.3.instruction': 'Pre-shape, rest 30 min, then final shape into banneton.',
      'stepLabel.4.stage':       'Cold Proof',
      'stepLabel.4.instruction': 'Place in fridge for 12-16 hours. Bake any time after.',
      'stepLabel.5.stage':       'Baking',
      'stepLabel.5.instruction': 'Preheat Dutch oven to 500°F. Score and bake covered 25 min.',
      'stepLabel.6.stage':       'Result & Log',
      'stepLabel.6.instruction': 'Rate your bake and save it to your archive.',

      // ── Bake — Stage 1 ───────────────────────────────────────────────────
      'stage1.header':    'Stage 1: The Initial Mix',
      'stage1.sub':       "Bring everything together — you're officially baking!",
      'stage1.welcome.title': 'Welcome to your bake! 🎉',
      'stage1.welcome.body':  "In this stage you'll mix flour, water, starter, and salt together. Don't worry about it being perfect — a shaggy, rough dough is exactly what you want right now. The magic happens in the hours ahead. Just fill in your amounts below, mix well, and hit Complete Mix when you're done.",
      'stage1.formula':   'Formula',
      'stage1.hydration': 'Hydration',
      'stage1.flour':     'Strong Bread Flour',
      'stage1.water':     'Filtered Water',
      'stage1.starter':   'Active Starter',
      'stage1.salt':      'Fine Sea Salt',
      'stage1.bakeName':  '✦ Bake Name / Recipe',
      'stage1.nameYourLoaf': '(name your loaf!)',
      'stage1.bakeNamePlaceholder': 'e.g. Sunday Country Loaf',
      'stage1.flourType': 'Flour Type',
      'stage1.flourTypePlaceholder': 'e.g. Bread Flour, Whole Wheat',
      'stage1.completeBtn': 'Complete Mix & Start Bulk',
      'stage1.howTo.title': 'How to Mix — Step by Step',
      'stage1.howTo.1': 'Combine flour and water in a large bowl. Mix with your hands until no dry flour remains. Cover and rest 30 min (autolyse — this kick-starts gluten development).',
      'stage1.howTo.2': 'Add your active starter and squeeze it through the dough until fully absorbed. The dough will feel slippery at first — keep going!',
      'stage1.howTo.3': 'Sprinkle salt over the dough, then add a tiny splash of water to help it dissolve. Squeeze and fold until the salt is worked in.',
      'stage1.howTo.4': 'Do 2–3 minutes of folds in the bowl (grab, stretch, fold over). The dough should feel cohesive and hold together — a little rough is perfectly fine.',
      'stage1.afterMix.label': 'After you hit "Complete Mix"…',
      'stage1.afterMix.body':  'The app will start a 60-minute rest timer automatically. This rest lets the gluten relax before your first stretch & fold. You can leave the dough covered on the counter — no action needed yet!',
      'stage1.quote': '"It doesn\'t need to be smooth yet. Trust the process — the gluten will build itself over the next few hours of bulk fermentation." 🍞',

      // ── Bake — Stage 2 ───────────────────────────────────────────────────
      'stage2.header':      'Stage 2: Bulk',
      'stage2.sub':         '4 Rounds of Stretch & Fold — the app guides you step by step',
      'stage2.totalTime':   'Total Fermentation Time',
      'stage2.initRest.label': 'Initial Rest — 60 Minutes',
      'stage2.initRest.sub':   'Let the gluten relax before your first stretch & fold. Round 1 unlocks when this timer finishes.',
      'stage2.startRest':   'Start Rest',
      'stage2.restDone':    '✔ Rest complete — Round 1 is now unlocked!',
      'stage2.howWorks.title': 'How Stretch & Fold Works',
      'stage2.howWorks.body':  'Each round is 30 minutes long and unlocks automatically when the previous one finishes. When a timer starts, grab the dough from one side, stretch it up as high as it will go without tearing, then fold it over the center. Rotate the bowl and repeat 4 times. That\'s one "set" — it only takes about 30 seconds! Then cover the bowl and let it rest until the next round unlocks.',
      'stage2.round1':   'Round 1',
      'stage2.round2':   'Round 2',
      'stage2.round3':   'Round 3',
      'stage2.round4':   'Round 4',
      'stage2.locked':   'Locked',
      'stage2.start':    'Start',
      'stage2.pause':    'Pause',
      'stage2.resume':   'Resume',
      'stage2.done':     'Done ✓',
      'stage2.doughTemp.label': '📍 Final Dough Temp — After Your Last Stretch & Fold',
      'stage2.doughTemp.sub':   'Take your dough\'s temperature now. This tells you which row of the table below to use for timing.',
      'stage2.bulkDone.title': '✅ How do I know bulk fermentation is done?',
      'stage2.bulkDone.sub':   'After all 4 rounds of stretch & fold, look for these signs before moving to shaping:',
      'stage2.bulkDone.1': 'Dough has risen 50–75% in size',
      'stage2.bulkDone.2': 'Dough jiggles like jello when you shake the bowl',
      'stage2.bulkDone.3': 'Bubbles visible on the surface and along the sides',
      'stage2.bulkDone.4': 'Dough feels airy and light, not dense',
      'stage2.bulkDone.5': 'Smooth, domed surface (not flat or sunken)',
      'stage2.bulkDone.hint': "If you're unsure, wait another 30 minutes and check again.",
      'stage2.tempTable.title': 'Dough Temp vs. Target Rise',
      'stage2.tempTable.col1':  'Dough Temp',
      'stage2.tempTable.col2':  'Approx. Time',
      'stage2.tempTable.col3':  'Target Rise',
      'stage2.nextStep': '🎉 Bulk Done — Let\'s Shape!',

      // ── Bake — Stage 3 ───────────────────────────────────────────────────
      'stage3.header': 'Stage 3: Shaping',
      'stage3.sub':    'Creating tension and surface skin — almost there!',
      'stage3.welcome.title': 'You made it through bulk fermentation! 🙌',
      'stage3.welcome.body':  'Shaping has two parts: a quick preshape (a rough round), then a 30-minute bench rest, then the final shape (a tighter round) before it goes in the fridge. The goal is to create surface tension — the skin on the outside of the dough is what gives your loaf its structure in the oven.',
      'stage3.preshape': 'Preshape Bench Rest',
      'stage3.startRest': 'Start Rest',
      'stage3.finalShape.title': 'Technique: Final Shape',
      'stage3.finalShape.sub':   'After the bench rest timer, do your final shape:',
      'stage3.finalShape.1': 'Lightly flour your work surface with rice flour',
      'stage3.finalShape.2': 'Flip the dough upside-down onto the bench',
      'stage3.finalShape.3': 'Fold top edge to center, bottom to center, then left and right sides over',
      'stage3.finalShape.4': 'Flip seam-side down and cup both hands around the dough',
      'stage3.finalShape.5': 'Pull it gently toward you, dragging it across the bench — this creates tension on the surface skin',
      'stage3.finalShape.6': 'Repeat a few times until the surface feels taut, then place seam-side up into your floured banneton',
      'stage3.checklist.title':  'Shaping Checklist',
      'stage3.checklist.1': 'No bubbles popped on surface',
      'stage3.checklist.2': 'Strong lateral tension felt',
      'stage3.checklist.3': 'Seamless bottom closure',
      'stage3.nextStep': 'Shaped! — Time to Proof 🧊',

      // ── Bake — Stage 4 ───────────────────────────────────────────────────
      'stage4.header': 'Stage 4: Proofing',
      'stage4.sub':    'Into the fridge overnight — the hard part is over!',
      'stage4.welcome.title': "You're in the home stretch! ❄️",
      'stage4.welcome.body':  'The cold fridge slows fermentation way down, letting the dough develop more complex flavor and firm up so it\'s easier to score. After the 10-minute ambient proof and stitching, cover your banneton in a plastic bag and put it in the fridge. You can bake it 12–16 hours later.',
      'stage4.stitchLabel':  'Final Stitching Window',
      'stage4.startAmbient': 'Start Ambient Proof',
      'stage4.stitch.title': 'Stitching Instructions',
      'stage4.stitch.body':  'Wait 10 minutes after basket entry. "Stitch" the dough by pulling sides over each other like a corset. This adds structural support for the oven spring.',
      'stage4.guide.title':  'Cold Proof Guide',
      'stage4.guide.1':      'Place banneton in a plastic bag to prevent skinning.',
      'stage4.guide.2':      'Retard in fridge (38°F / 3°C) for 12-16 hours.',
      'stage4.guide.3':      'Bake directly from cold for best scoring definition.',
      'stage4.proofTemp':    'Fridge/Proof Temp (°F)',
      'stage4.nextStep':     'Into the Fridge — See You Tomorrow! 🔥',

      // ── Bake — Stage 5 ───────────────────────────────────────────────────
      'stage5.header':    'Stage 5: Oven Mechanics',
      'stage5.sub':       'The Maillard reaction and final transformation',
      'stage5.fridgeFor': 'Dough in Fridge For',
      'stage5.ovenTemp':  'Oven Temp',
      'stage5.phase1.label':  'Phase 1: Steam Expansion',
      'stage5.phase1.title':  'Lid On • 25 Mins',
      'stage5.phase1.body':   'Preheat oven & Dutch Oven to 500°F. Lower to 450°F immediately after placing dough inside. The steam trapped inside allows the crust to expand fully.',
      'stage5.phase2.label':  'Phase 2: Color & Cure',
      'stage5.phase2.title':  'Lid Off • 20 Mins',
      'stage5.phase2.body':   'Remove lid to develop deep amber crust. Target internal temperature: 205-210°F.',
      'stage5.startTimer':    'Start Timer',
      'stage5.nextStep':      'Record Final Result',

      // ── Bake — Stage 6 ───────────────────────────────────────────────────
      'stage6.header':      'Bake Complete',
      'stage6.sub':         'Documentation and Reflection',
      'stage6.crumbRating': 'Crumb Rating',
      'stage6.uploadPhoto': 'Upload Final Crumb Shot',
      'stage6.notesPlaceholder': 'Notes on crumb texture, crust depth, or adjustments for next time...',
      'stage6.saveBtn':     'Save to Archive',

      // ── Bake — global timer / active timer ───────────────────────────────
      'timer.activeTimer':     'Active Timer',
      'timer.totalBulk':       'Total Bulk Fermentation',
      'timer.bulkNext':        'Bulk:',
      'timer.ready':           'READY',

      // ── Archive view ─────────────────────────────────────────────────────
      'archive.curation':    'Curation',
      'archive.title':       'Archive',
      'archive.calcStorage': 'Calculating storage...',
      'archive.autoBackup':  'Auto-backup active',
      'archive.saveDrive':   'Save to Google Drive',
      'archive.filterAll':   'Type: All',
      'archive.filterRating':'Rating: 4.0+',
      'archive.sortedDate':  'Sorted by Date',
      'archive.newBake':     'Record a New Bake',
      'archive.dataSection': 'Data Management',
      'archive.restore.title': 'Restore Backup',
      'archive.restore.sub':   'Restore your bake archive from a saved backup file.',
      'archive.restoreDrive':  'Restore from Drive',
      'archive.chooseFile':    'Choose File',
      'archive.clear.title':   'Clear Local Data',
      'archive.clear.sub':     'Permanently wipe all bake records from this device. Export to Google Drive first!',
      'archive.clearBtn':      'Clear',

      // ── Library view ─────────────────────────────────────────────────────
      'library.label':    'Knowledge & Technique',
      'library.title':    'Pancito y Más Library',
      'library.sub':      'A curated collection of wisdom for the modern baker, from foundational techniques to the science of fermentation.',
      'library.glossary.title': 'The Glossary',
      'library.glossary.sub':   'De-coding the language of the sourdough alchemist. Search for techniques, terms, and tools.',
      'library.search.placeholder': 'Search terms (e.g. Autolyse)',
      'library.noResults':     'No matching terms. Try a different word.',
      // Glossary categories
      'glossary.cat.technique': 'TECHNIQUE',
      'glossary.cat.science':   'SCIENCE',
      'glossary.cat.craft':     'CRAFT',
      'glossary.cat.texture':   'TEXTURE',
      'glossary.cat.process':   'PROCESS',
      'glossary.cat.baking':    'BAKING',
      'glossary.cat.starter':   'STARTER',
      'glossary.cat.shaping':   'SHAPING',
      // Glossary terms
      'glossary.autolyse.name': 'Autolyse',
      'glossary.autolyse.desc': 'A rest period where flour and water are mixed before adding salt and starter. Encourages enzymatic activity and gluten development.',
      'glossary.hooch.name': 'Hooch',
      'glossary.hooch.desc': 'The liquid layer that forms on top of an unfed starter. High in alcohol — it means your starter is hungry and needs feeding.',
      'glossary.banneton.name': 'Banneton',
      'glossary.banneton.desc': 'A proofing basket, often rattan or linen-lined, that holds shaped dough and imprints a beautiful spiral pattern on the crust.',
      'glossary.openCrumb.name': 'Open Crumb',
      'glossary.openCrumb.desc': 'The aesthetic goal of many bakers: a light, airy internal structure with large, irregular air pockets throughout the loaf.',
      'glossary.stretchFold.name': 'Stretch & Fold',
      'glossary.stretchFold.desc': 'Gentle dough strengthening during bulk fermentation. Stretch the dough up and fold over itself, rotating the bowl each time — no kneading needed.',
      'glossary.bulkFermentation.name': 'Bulk Fermentation',
      'glossary.bulkFermentation.desc': 'The first rise after mixing. Wild yeast and bacteria ferment the dough at room temperature, building flavor and structure over several hours.',
      'glossary.lame.name': 'Lame',
      'glossary.lame.desc': 'A razor-sharp blade on a handle used to score bread before baking. The score controls where the loaf opens during oven spring.',
      'glossary.ovenSpring.name': 'Oven Spring',
      'glossary.ovenSpring.desc': 'The rapid rise that happens in the first 10–15 minutes of baking as trapped gases expand. A dramatic spring means well-fermented dough.',
      'glossary.levain.name': 'Levain',
      'glossary.levain.desc': 'A pre-ferment built from your starter that is added to the dough. Using a levain gives more control over fermentation rate and flavor profile.',
      'glossary.boule.name': 'Boule & Bâtard',
      'glossary.boule.desc': 'The two classic sourdough shapes. A boule is round; a bâtard is oval. Each requires a different shaping technique and scoring pattern.',
      // Library content
      'library.featured.label':    'Bake Lab · Featured',
      'library.featured.title':    'The Secret of Steam',
      'library.featured.sub':      'Why the first 10 minutes in the oven make or break your loaf — and how to get it right every single time.',
      'library.readArticle':       'Read Article',
      'library.readGuide':         'Read Guide',
      'library.tutorials.title':   'Artisan Tutorials',
      'library.tutorials.tiktok':  'Watch on TikTok',
      'library.stretchFold.cat':   'Foundations',
      'library.stretchFold.title': 'The Stretch & Fold',
      'library.stretchFold.sub':   'Mastering hydration without the heavy kneading. The core of sourdough structure.',
      'library.scoring.cat':       'Finishing',
      'library.scoring.title':     'Scoring Aesthetics',
      'library.scoring.sub':       "A guide to the decorative 'Lame' work that creates beautiful, controlled expansion.",
      'library.revival.cat':       'Maintenance',
      'library.revival.title':     'The Starter Revival',
      'library.revival.sub':       'How to bring a neglected starter back from the brink of dormancy.',
      'library.troubleshoot.title':'The Troubleshooting Guide',
      'library.rise.title':        '"Why didn\'t my bread rise?"',
      'library.rise.sub':          'Investigating the three most common culprits: weak starter, improper proofing temperature, or over-fermentation.',
      'library.sticky.title':      'Dough is too sticky?',
      'library.sticky.sub':        "It's likely a hydration mismatch with your specific brand of flour. Try the 'Rubaud' method.",
      'library.crust.title':       'Tough Crust',
      'library.crust.sub':         'Lack of Steam',
      'library.gummy.title':       'Gummy Texture',
      'library.gummy.sub':         'Internal Temp',
      'library.ebook.label':       'Free eBook',
      'library.ebook.title':       'A Sourdough Starter Journey',
      'library.ebook.tagline':     'Learn how to create your first loaf in 10 days!',
      'library.ebook.sub':         'Sign in with Google, LinkedIn, Microsoft, or Email to get instant access to your free guide.',
      'library.ebook.cta':         'Download Your Copy Now',
      'library.ebook.note':        'Free · Instant access · Sign in with Google, LinkedIn or Email',

      // ── Achievements view ─────────────────────────────────────────────────
      'achievements.journeyLabel': 'Your Journey',
      'achievements.title':        'Trophy Case',
      'achievements.sub':          'Every badge is earned, never purchased. Tap a locked badge to see how to unlock it.',
      'achievements.bakerLevel':   'Baker Level',
      'achievements.allBadges':    'All Badges',
      'achievements.tapHint':      'Tap any badge to see its story',
      'achievements.badgesUnlocked': 'of 17 badges unlocked',
      'achievements.levelHint':    'Start your first bake to level up.',
      'achievements.badgeCount':   'of',
      'achievements.badgesLabel':  'badges unlocked',

      // ── Badge lock hints ──────────────────────────────────────────────────
      'lock.named_starter':  'Name your starter in onboarding',
      'lock.first_checkin':  'Complete your first starter check-in',
      'lock.first_loaf':     'Save your first bake to Archive',
      'lock.photo_baker':    'Save a bake with a photo attached',
      'lock.five_star':      'Give a bake a 5-star rating',
      'lock.three_in_a_row': 'Log 3 bakes within 7 days',
      'lock.streak_7':       'Keep a 7-day check-in streak',
      'lock.streak_30':      'Keep a 30-day check-in streak',
      'lock.bake_10':        'Log 10 bakes',
      'lock.bake_25':        'Log 25 bakes',
      'lock.bake_50':        'Log 50 bakes',
      'lock.cold_proof':     'Save a bake with cold proof time > 0',
      'lock.high_hydration': 'Save a bake with hydration ≥ 75%',
      'lock.diff_flours':    'Use 3 different flour types across bakes',
      'lock.comeback':       'Bake again after a 14+ day gap',
      'lock.consistent':     'Rate 5 consecutive bakes ≥ 4 stars',
      'lock.sage':           'Reach Level 5 (Sourdough Sage)',

      // ── Baker levels (gamification.js) ────────────────────────────────────
      'level.1': 'Flour Dabbler',
      'level.2': 'Crumb Curious',
      'level.3': 'Dough Whisperer',
      'level.4': 'Crumb Architect',
      'level.5': 'Sourdough Sage',
      'level.maxReached': "You've reached the highest level. You are the bread. 🍞",
      'level.almostThere': 'Almost there!',
      'level.moreBakes':   'more bake',
      'level.moreBakesPlural': 'more bakes',
      'level.avgRating':   'avg rating',
      'level.moreFlour':   'try',
      'level.moreFlourType': 'more flour type',
      'level.moreFlourTypes': 'more flour types',
      'level.streak':      'day streak',
      'level.toReach':     'to reach',

      // ── Badge names & stories (gamification.js) ───────────────────────────
      'badge.born_from_scratch.name':  'Born From Scratch',
      'badge.born_from_scratch.story': "You created your starter from just flour and water. That's wild yeast you captured from the air. It's alive because of you.",
      'badge.named_starter.name':  'Named & Claimed',
      'badge.named_starter.story': 'Every great starter deserves a name. Yours has one now.',
      'badge.first_checkin.name':  'Starter Parent',
      'badge.first_checkin.story': 'You fed your starter for the very first time. The journey has begun.',
      'badge.tutorial_completed.name':  'Tutorial Completed',
      'badge.tutorial_completed.story': 'You completed the full Pancito tutorial. You know your starter, your tools, and your process. Now go bake.',
      'badge.first_loaf.name':  'First Crumb',
      'badge.first_loaf.story': 'Your very first loaf. Every legend starts exactly here.',
      'badge.photo_baker.name':  'Visual Proof',
      'badge.photo_baker.story': 'You documented your bake. Progress is visible now.',
      'badge.five_star.name':  'Golden Loaf',
      'badge.five_star.story': 'A perfect score. You baked something extraordinary.',
      'badge.three_in_a_row.name':  'On a Roll',
      'badge.three_in_a_row.story': "Three bakes in one week. You're in your rhythm.",
      'badge.streak_7.name':  'Week of Bread',
      'badge.streak_7.story': 'Seven days of showing up for your starter. Habit formed.',
      'badge.streak_30.name':  'Bread Season',
      'badge.streak_30.story': 'Thirty days. Your starter knows your schedule by now.',
      'badge.bake_10.name':  'Ten Deep',
      'badge.bake_10.story': "Ten bakes in. You're no longer a beginner.",
      'badge.bake_25.name':  'Seasoned Baker',
      'badge.bake_25.story': 'Twenty-five loaves. Your kitchen smells like a bakery.',
      'badge.bake_50.name':  'The Archive',
      'badge.bake_50.story': 'Fifty bakes. Your archive is a library of learning.',
      'badge.cold_proof.name':  'Patience Rewarded',
      'badge.cold_proof.story': 'You trusted the cold. Slow fermentation builds deep flavor.',
      'badge.high_hydration.name':  'Water Walker',
      'badge.high_hydration.story': 'High hydration dough is wild and alive. You tamed it.',
      'badge.diff_flours.name':  'Grain Curious',
      'badge.diff_flours.story': "Three different flours. You're exploring the whole grain world.",
      'badge.comeback.name':  'Back in the Kitchen',
      'badge.comeback.story': "Life got in the way. But you came back. That's what matters.",
      'badge.consistent.name':  'The Standard',
      'badge.consistent.story': 'Five bakes in a row, all rated 4 stars or higher. You have a standard.',
      'badge.sage.name':  'Sourdough Sage',
      'badge.sage.story': "The highest level. You've mastered the ancient art of sourdough.",

      // ── Skill nodes ───────────────────────────────────────────────────────
      'skill.stretchFold':   'Stretch & Fold',
      'skill.coldProof':     'Cold Proof',
      'skill.highHydration': 'High Hydration',
      'skill.wholeGrain':    'Whole Grain',
      'skill.longFerment':   'Long Ferment',
      'skill.photoDoc':      'Photo Doc',
      'skill.fiveStar':      '5-Star Quality',
      'skill.consistent':    'Consistency',
      'skill.inclusions':    'Inclusions',
      'skill.openCrumb':     'Open Crumb',

      // ── Notification messages (starter reminder) ──────────────────────────
      'notif.title':   'Pancito y Más 🍞',
      'notif.hungry1': 'is hungry! 🫙 Time for a quick check-in and feed.',
      'notif.hungry2': "They're counting on you. 💪",
      'notif.hungry3': 'See you in the kitchen?',
      'notif.hungry4': 'Feed now to keep that starter strong. 🍞',

      // ── Educational page — shared header ─────────────────────────────────
      'edu.catEquipment':    'Essential Equipment',
      'edu.catFoundations':  'Foundations',
      'edu.catMaintenance':  'Maintenance',
      'edu.catBakeLab':      'Bake Lab',
      'edu.catFinishing':    'Finishing',
      'edu.catTroubleshoot': 'Troubleshooting',
      'edu.kitCta':          'Get the complete kit on Amazon',
      'edu.getKit':          'Get the Kit',
      'edu.byLine':          'By Pancito y Más',
      'edu.allLevels':       'All Levels',
      'edu.begIntermed':     'Beginner–Intermediate',
      'edu.intermed':        'Intermediate',

      // ── Banneton page ─────────────────────────────────────────────────────
      'banneton.title':    'The Banneton',
      'banneton.readMin':  '7 min read',

      // ── Bench Scraper page ────────────────────────────────────────────────
      'benchScraper.title':   'Bench Scraper',
      'benchScraper.readMin': '5 min read',

      // ── Bread Sling page ──────────────────────────────────────────────────
      'breadSling.title':   'Bread Sling',
      'breadSling.readMin': '5 min read',

      // ── Lame page ─────────────────────────────────────────────────────────
      'lame.title':   'The Lame',
      'lame.readMin': '6 min read',

      // ── Starter Revival page ──────────────────────────────────────────────
      'revival.title':   'The Starter Revival',
      'revival.sub':     'How to bring a neglected starter back from dormancy — and the 7-day protocol that almost never fails.',
      'revival.readMin': '9 min read',

      // ── Stretch & Fold page ───────────────────────────────────────────────
      'stretchFold.title':   'The Stretch & Fold',
      'stretchFold.sub':     'Mastering hydration without heavy kneading. The technique at the core of every great sourdough loaf.',
      'stretchFold.readMin': '8 min read',

      // ── Science of Steam page ─────────────────────────────────────────────
      'steam.title':   'The Science of Steam',
      'steam.sub':     'Why the first 10 minutes in the oven make or break your loaf — and how to get it right every single time.',
      'steam.readMin': '6 min read',

      // ── Scoring Aesthetics page ───────────────────────────────────────────
      'scoring.title':   'Scoring Aesthetics',
      'scoring.sub':     'The decorative lame work that turns a loaf into a canvas — and controls the oven\'s spring.',
      'scoring.readMin': '10 min read',

      // ── Troubleshoot pages ────────────────────────────────────────────────
      'troubleshoot.crust.title': 'Tough Crust',
      'troubleshoot.crust.sub':   'A crust so hard it\'s difficult to slice is almost always a steam problem. Here\'s what\'s happening — and the home baker\'s guide to fixing it.',
      'troubleshoot.crust.readMin': '6 min read',
      'troubleshoot.gummy.title': 'Gummy Texture',
      'troubleshoot.gummy.sub':   'You baked it, it looks beautiful — then you slice it and the crumb is dense and gummy. The answer almost always comes down to one number.',
      'troubleshoot.gummy.readMin': '5 min read',
      'troubleshoot.rise.title': "Why didn't my bread rise?",
      'troubleshoot.rise.sub':   'A flat, dense loaf is one of the most common and most fixable sourdough problems. Here are the three culprits — and how to address each one.',
      'troubleshoot.rise.readMin': '7 min read',
      'troubleshoot.sticky.title': 'Dough Is Too Sticky?',
      'troubleshoot.sticky.sub':   "It's likely a hydration mismatch with your flour. Here's why it happens, how to manage it, and the Rubaud method that changes everything.",
      'troubleshoot.sticky.readMin': '6 min read',

      // ── Onboarding ────────────────────────────────────────────────────────
      'onboarding.pageTitle': 'Pancito y Más — Your Journey Begins',
      'onboarding.skip':      'Skip',
    },

    // ─────────────────────────────────────────────────────────────────────────
    es: {
      // ── Navigation ──────────────────────────────────────────────────────
      'nav.dashboard': 'Inicio',
      'nav.bake':      'Hornear',
      'nav.library':   'Biblioteca',
      'nav.archive':   'Historial',
      'nav.dash':      'Inicio',
      'nav.badges':    'Logros',

      // ── Days / time-of-day ───────────────────────────────────────────────
      'day.sunday':    'Domingo',
      'day.monday':    'Lunes',
      'day.tuesday':   'Martes',
      'day.wednesday': 'Miércoles',
      'day.thursday':  'Jueves',
      'day.friday':    'Viernes',
      'day.saturday':  'Sábado',
      'period.morning':   'Mañana',
      'period.afternoon': 'Tarde',
      'period.evening':   'Noche',
      'period.night':     'Madrugada',

      // ── Dashboard — hero ─────────────────────────────────────────────────
      'hero.headline': 'Tu masa está respirando.',
      'hero.sub':      'Bienvenid@ de regreso. El ambiente está perfecto para una fermentación lenta hoy.',
      'hero.cta':      'Iniciar Horneada',

      // ── Dashboard — stats ────────────────────────────────────────────────
      'stat.totalBakes':    'Horneadas',
      'stat.avgRating':     'Calificación Promedio',
      'stat.streak':        'Racha Diaria',
      'stat.bestStreak':    'Mejor Racha',
      'stat.days':          'días',
      'stat.streakDefault': 'Empieza tu racha hoy',
      'stat.personalRecord':'Récord personal',
      'stat.qualityTrend':  'Tendencia de Calidad',
      'stat.last5':         'Últimas 5',
      'stat.streakCounting': 'días seguidos!',

      // ── Dashboard — Bake Lab section ─────────────────────────────────────
      'bakelab.label':      'Horno en Vivo',
      'bakelab.waiting':    'Esperando la masa...',
      'bakelab.inProgress': 'En Progreso',
      'bakelab.noSession':  '¿Lista para encender el horno? Elige una receta de tu biblioteca o empieza una sesión nueva.',
      'bakelab.newSession': 'Nueva Sesión',
      'bakelab.totalProgress': 'Progreso Total de la Sesión',
      'bakelab.coldTarget': 'Fermentación en frío: 12-18 horas',
      'bakelab.bakeNow':    'Hornear pronto',

      // ── Dashboard — starter companion ────────────────────────────────────
      'starter.label':       'Masa Madre',
      'starter.loading':     'Cargando…',
      'starter.health':      'Salud:',
      'starter.feedBtn':     'Alimentar y Checar',
      'starter.reminder':    'Recordatorio diario',
      'starter.dormant':  'está descansando… aliméntala pronto',
      'starter.hungry':   '¡está hambrienta!',
      'starter.active':   'está alimentada y feliz 😊',
      'starter.thriving': '¡está prosperando!',
      'starter.peak':     '¡está en su punto — hornea ya! 🚀',

      // ── Dashboard — check-in sheet ───────────────────────────────────────
      'checkin.title':       'Alimentar y Checar',
      'checkin.question':    '¿Cómo está',
      'checkin.questionEnd': 'hoy?',
      'checkin.flat':        '😴 Plana',
      'checkin.bubbly':      '🫧 Burbujeante',
      'checkin.doubling':    '🚀 Duplicando',
      'checkin.tempLabel':   'Temperatura del cuarto (°F) — opcional',
      'checkin.tempPlaceholder': 'ej. 72',
      'checkin.feedBtn':     'Alimentar',
      'checkin.feedIcon':    '🌾',
      'checkin.noActivity':  '¡Por favor selecciona cómo está tu masa madre primero!',
      'checkin.howMuch':     '💡 ¿Cuánto le doy de comer?',
      'checkin.ratioNote':   'Proporción = Masa madre : Harina : Agua. Todo en gramos.',
      'checkin.ratio.1_1_1_title': 'Dos veces al día',
      'checkin.ratio.1_1_1_sub':   'Masa madre muy activa',
      'checkin.ratio.1_2_2_title': 'Diario clásico',
      'checkin.ratio.1_2_2_sub':   'Confiable y predecible',
      'checkin.ratio.1_3_3_title': 'Una vez al día ⭐',
      'checkin.ratio.1_3_3_sub':   'Más tiempo entre tomas — recomendado',
      'checkin.ratio.1_5_5_title': 'Descanso en el refri',
      'checkin.ratio.1_5_5_sub':   '1–2 semanas sin alimentar',

      // ── Dashboard — reminder toasts ──────────────────────────────────────
      'reminder.denied':  '⚠️ Permiso de recordatorio denegado — revisa los ajustes de la app',
      'reminder.off':     '🔕 Recordatorio desactivado',
      'reminder.set':     '✓ Recordatorio programado para las',
      'reminder.daily':   'todos los días',

      // ── Dashboard — tip card ─────────────────────────────────────────────
      'tip.todayLabel': 'Tip del Día',

      // ── Dashboard — recent badges ─────────────────────────────────────────
      'badges.recent':  'Logros Recientes',
      'badges.seeAll':  'Ver todos →',

      // ── Dashboard — kit banner ────────────────────────────────────────────
      'kit.curatedBy':  'Seleccionado por Alison',
      'kit.headline':   'Todo lo que necesitas, en un kit.',
      'kit.items':      'Banneton · Lame · Cabestrillo · Raspador',
      'kit.cta':        'Consigue el Kit de Inicio →',
      'kit.equipGuide': 'Guías de equipo →',
      'kit.browseLib':  'Explorar la Biblioteca',
      'kit.getKit':     'Consigue el Kit',

      // ── Dashboard — equipment guides in library section ───────────────────
      'equip.label':       'Herramientas del Panadero',
      'equip.title':       'Guías de Equipo',
      'equip.banneton.name': 'El Banneton',
      'equip.banneton.sub': 'Dale forma a tu masa y logra esa espiral característica en la corteza.',
      'equip.lame.name':   'El Lame',
      'equip.lame.sub':    'Domina el corte del pan de masa madre.',
      'equip.scraper.name':'Raspador de Mesa',
      'equip.scraper.sub': 'Da forma a masas de alta hidratación.',
      'equip.sling.name':  'Cabestrillo para Pan',
      'equip.sling.sub':   'Transfiere tu hogaza a la cazuela caliente con facilidad y seguridad.',
      'equip.readGuide':   'Leer Guía',

      // ── Bake stepper nav labels ───────────────────────────────────────────
      'step.mix':    'Mezcla',
      'step.bulk':   'Granel',
      'step.shape':  'Forma',
      'step.proof':  'Frío',
      'step.bake':   'Horno',
      'step.result': 'Resultado',

      // ── STEP_LABELS (used in JS) ──────────────────────────────────────────
      'stepLabel.1.stage':       'Mezcla Inicial',
      'stepLabel.1.instruction': 'Mezcla harina, agua, masa madre y sal hasta que no quede harina seca.',
      'stepLabel.2.stage':       'Fermentación en Bloque',
      'stepLabel.2.instruction': 'Dobla cada 30 minutos. Observa un aumento del 50-75%.',
      'stepLabel.3.stage':       'Formado',
      'stepLabel.3.instruction': 'Preforma, reposa 30 min, luego forma final en el banneton.',
      'stepLabel.4.stage':       'Fermentación en Frío',
      'stepLabel.4.instruction': 'Mete al refri 12-16 horas. Hornea cuando quieras después.',
      'stepLabel.5.stage':       'Horneado',
      'stepLabel.5.instruction': 'Precalienta la cazuela a 500°F. Corta y hornea tapado 25 min.',
      'stepLabel.6.stage':       'Resultado y Registro',
      'stepLabel.6.instruction': 'Califica tu horneada y guárdala en tu historial.',

      // ── Bake — Stage 1 ───────────────────────────────────────────────────
      'stage1.header':    'Etapa 1: La Mezcla Inicial',
      'stage1.sub':       '¡Junta todos los ingredientes — ya estás horneando!',
      'stage1.welcome.title': '¡Bienvenid@ a tu horneada! 🎉',
      'stage1.welcome.body':  'En esta etapa vas a mezclar harina, agua, masa madre y sal. No te preocupes si queda irregular — una masa rugosa y dispareja es exactamente lo que quieres ahora. La magia pasa en las próximas horas. Solo llena las cantidades, mezcla bien y presiona Mezcla Completa cuando acabes.',
      'stage1.formula':   'Fórmula',
      'stage1.hydration': 'Hidratación',
      'stage1.flour':     'Harina de Fuerza',
      'stage1.water':     'Agua Filtrada',
      'stage1.starter':   'Masa Madre Activa',
      'stage1.salt':      'Sal de Mar Fina',
      'stage1.bakeName':  '✦ Nombre de la Horneada / Receta',
      'stage1.nameYourLoaf': '(¡ponle nombre a tu pan!)',
      'stage1.bakeNamePlaceholder': 'ej. Pan del Domingo',
      'stage1.flourType': 'Tipo de Harina',
      'stage1.flourTypePlaceholder': 'ej. Harina de fuerza, Integral',
      'stage1.completeBtn': 'Mezcla Completa — Iniciar Fermentación',
      'stage1.howTo.title': 'Cómo Mezclar — Paso a Paso',
      'stage1.howTo.1': 'Combina harina y agua en un tazón grande. Mezcla con las manos hasta que no quede harina seca. Tapa y deja reposar 30 min (autólisis — esto activa el desarrollo del gluten).',
      'stage1.howTo.2': 'Agrega tu masa madre activa y apriétala dentro de la masa hasta que quede totalmente integrada. La masa se sentirá resbaladiza al principio — ¡sigue adelante!',
      'stage1.howTo.3': 'Espolvorea la sal sobre la masa y agrega un pequeño chorrito de agua para ayudarla a disolverse. Aprieta y dobla hasta que la sal quede integrada.',
      'stage1.howTo.4': 'Haz 2–3 minutos de dobleces en el tazón (agarra, estira, dobla). La masa debe sentirse cohesiva — un poco tosca está perfectamente bien.',
      'stage1.afterMix.label': 'Después de presionar "Mezcla Completa"…',
      'stage1.afterMix.body':  'La app iniciará automáticamente un temporizador de 60 minutos de reposo. Este reposo deja que el gluten se relaje antes de tu primer estira y dobla. ¡Puedes dejar la masa tapada sobre el mostrador — no necesitas hacer nada todavía!',
      'stage1.quote': '"No necesita estar tersa todavía. Confía en el proceso — el gluten se construirá solo en las próximas horas de fermentación." 🍞',

      // ── Bake — Stage 2 ───────────────────────────────────────────────────
      'stage2.header':      'Etapa 2: Fermentación',
      'stage2.sub':         '4 Rondas de Estira y Dobla — la app te guía paso a paso',
      'stage2.totalTime':   'Tiempo Total de Fermentación',
      'stage2.initRest.label': 'Reposo Inicial — 60 Minutos',
      'stage2.initRest.sub':   'Deja que el gluten se relaje antes de tu primer estira y dobla. La Ronda 1 se activa cuando termine este temporizador.',
      'stage2.startRest':   'Iniciar Reposo',
      'stage2.restDone':    '✔ ¡Reposo completo — la Ronda 1 está activa!',
      'stage2.howWorks.title': 'Cómo Funciona el Estira y Dobla',
      'stage2.howWorks.body':  'Cada ronda dura 30 minutos y se activa automáticamente cuando termina la anterior. Cuando empiece el temporizador, agarra la masa por un lado, estírala hacia arriba sin romperla y dóblala al centro. Rota el tazón y repite 4 veces. ¡Eso es una "vuelta" — solo toma unos 30 segundos! Tapa el tazón y deja reposar hasta la siguiente ronda.',
      'stage2.round1':   'Ronda 1',
      'stage2.round2':   'Ronda 2',
      'stage2.round3':   'Ronda 3',
      'stage2.round4':   'Ronda 4',
      'stage2.locked':   'Bloqueado',
      'stage2.start':    'Iniciar',
      'stage2.pause':    'Pausar',
      'stage2.resume':   'Continuar',
      'stage2.done':     'Listo ✓',
      'stage2.doughTemp.label': '📍 Temperatura Final de la Masa — Después de tu Último Estira y Dobla',
      'stage2.doughTemp.sub':   'Toma la temperatura de tu masa ahora. Esto te dice qué fila de la tabla usar para el tiempo.',
      'stage2.bulkDone.title': '✅ ¿Cómo sé que la fermentación en bloque terminó?',
      'stage2.bulkDone.sub':   'Después de las 4 rondas, busca estas señales antes de formar:',
      'stage2.bulkDone.1': 'La masa creció un 50–75%',
      'stage2.bulkDone.2': 'La masa se tambalea como gelatina cuando sacudes el tazón',
      'stage2.bulkDone.3': 'Burbujas visibles en la superficie y los costados',
      'stage2.bulkDone.4': 'La masa se siente ligera y aireada, no densa',
      'stage2.bulkDone.5': 'Superficie lisa y abovedada (no plana ni hundida)',
      'stage2.bulkDone.hint': 'Si no estás segur@, espera otros 30 minutos y revisa de nuevo.',
      'stage2.tempTable.title': 'Temp. de Masa vs. Aumento Esperado',
      'stage2.tempTable.col1':  'Temp. de Masa',
      'stage2.tempTable.col2':  'Tiempo Aprox.',
      'stage2.tempTable.col3':  'Aumento Esperado',
      'stage2.nextStep': '🎉 ¡Fermentación lista — a darle forma!',

      // ── Bake — Stage 3 ───────────────────────────────────────────────────
      'stage3.header': 'Etapa 3: Formado',
      'stage3.sub':    '¡Creando tensión superficial — casi llegamos!',
      'stage3.welcome.title': '¡Superaste la fermentación en bloque! 🙌',
      'stage3.welcome.body':  'El formado tiene dos partes: un preformado rápido (una bola tosca), 30 minutos de reposo en mesa, y luego el formado final (una bola más tensa) antes de meterla al refrigerador. El objetivo es crear tensión superficial — esa "piel" exterior es lo que le da estructura a tu pan en el horno.',
      'stage3.preshape':    'Reposo de Preformado',
      'stage3.startRest':   'Iniciar Reposo',
      'stage3.finalShape.title': 'Técnica: Formado Final',
      'stage3.finalShape.sub':   'Después del temporizador de reposo, haz tu formado final:',
      'stage3.finalShape.1': 'Enharina ligeramente tu mesa con harina de arroz',
      'stage3.finalShape.2': 'Voltea la masa boca abajo sobre la mesa',
      'stage3.finalShape.3': 'Dobla el borde superior al centro, el inferior al centro, y luego los lados',
      'stage3.finalShape.4': 'Voltea con la costura hacia abajo y pon ambas manos alrededor de la masa',
      'stage3.finalShape.5': 'Jálala suavemente hacia ti, arrastrándola por la mesa — esto crea tensión en la superficie',
      'stage3.finalShape.6': 'Repite varias veces hasta que la superficie se sienta tensa, luego colócala con la costura hacia arriba en tu banneton enharinado',
      'stage3.checklist.title':  'Lista de Verificación de Formado',
      'stage3.checklist.1': 'Sin burbujas reventadas en la superficie',
      'stage3.checklist.2': 'Tensión lateral fuerte',
      'stage3.checklist.3': 'Cierre inferior sin costuras',
      'stage3.nextStep': '¡Formado! — Hora de Fermentar en Frío 🧊',

      // ── Bake — Stage 4 ───────────────────────────────────────────────────
      'stage4.header': 'Etapa 4: Fermentación en Frío',
      'stage4.sub':    '¡Al refrigerador toda la noche — ya pasó lo difícil!',
      'stage4.welcome.title': '¡Ya casi terminamos! ❄️',
      'stage4.welcome.body':  'El frío del refri desacelera la fermentación, dejando que la masa desarrolle más sabor y se firme para que sea más fácil de cortar. Después de los 10 minutos de reposo y el "cosido", mete tu banneton en una bolsa de plástico y al refri. Puedes hornear 12–16 horas después.',
      'stage4.stitchLabel':  'Ventana de Cosido Final',
      'stage4.startAmbient': 'Iniciar Reposo Ambiente',
      'stage4.stitch.title': 'Instrucciones de Cosido',
      'stage4.stitch.body':  'Espera 10 minutos después de meter la masa al banneton. "Cose" la masa jalando los lados uno sobre el otro como un corsé. Esto agrega soporte estructural para el resorte de horno.',
      'stage4.guide.title':  'Guía de Fermentación en Frío',
      'stage4.guide.1':      'Mete el banneton en una bolsa de plástico para evitar que se reseque.',
      'stage4.guide.2':      'Fermenta en el refri (3°C / 38°F) de 12 a 16 horas.',
      'stage4.guide.3':      'Hornea directamente del frío para mejores resultados.',
      'stage4.proofTemp':    'Temperatura del Refri (°F)',
      'stage4.nextStep':     '¡Al Refri — Nos Vemos Mañana! 🔥',

      // ── Bake — Stage 5 ───────────────────────────────────────────────────
      'stage5.header':    'Etapa 5: Mecánica del Horno',
      'stage5.sub':       'La reacción de Maillard y la transformación final',
      'stage5.fridgeFor': 'Masa en el Refri Por',
      'stage5.ovenTemp':  'Temp. del Horno',
      'stage5.phase1.label':  'Fase 1: Expansión con Vapor',
      'stage5.phase1.title':  'Con Tapa • 25 Min',
      'stage5.phase1.body':   'Precalienta el horno y la cazuela a 500°F. Baja a 450°F inmediatamente después de colocar la masa. El vapor atrapado permite que la corteza se expanda completamente.',
      'stage5.phase2.label':  'Fase 2: Color y Corteza',
      'stage5.phase2.title':  'Sin Tapa • 20 Min',
      'stage5.phase2.body':   'Quita la tapa para desarrollar una corteza ámbar profunda. Temperatura interna objetivo: 205-210°F.',
      'stage5.startTimer':    'Iniciar Temporizador',
      'stage5.nextStep':      'Registrar Resultado Final',

      // ── Bake — Stage 6 ───────────────────────────────────────────────────
      'stage6.header':      'Horneada Completa',
      'stage6.sub':         'Documentación y Reflexión',
      'stage6.crumbRating': 'Calificación de Miga',
      'stage6.uploadPhoto': 'Sube la Foto de tu Miga',
      'stage6.notesPlaceholder': 'Notas sobre la textura de la miga, la corteza, o ajustes para la próxima...',
      'stage6.saveBtn':     'Guardar en Historial',

      // ── Bake — global timer / active timer ───────────────────────────────
      'timer.activeTimer':     'Temporizador Activo',
      'timer.totalBulk':       'Fermentación Total en Bloque',
      'timer.bulkNext':        'Fermentación:',
      'timer.ready':           'LISTO',

      // ── Archive view ─────────────────────────────────────────────────────
      'archive.curation':    'Colección',
      'archive.title':       'Historial',
      'archive.calcStorage': 'Calculando almacenamiento...',
      'archive.autoBackup':  'Respaldo automático activo',
      'archive.saveDrive':   'Guardar en Google Drive',
      'archive.filterAll':   'Tipo: Todo',
      'archive.filterRating':'Calificación: 4.0+',
      'archive.sortedDate':  'Ordenado por Fecha',
      'archive.newBake':     'Registrar una Nueva Horneada',
      'archive.dataSection': 'Gestión de Datos',
      'archive.restore.title': 'Restaurar Respaldo',
      'archive.restore.sub':   'Restaura tu historial desde un archivo de respaldo guardado.',
      'archive.restoreDrive':  'Restaurar desde Drive',
      'archive.chooseFile':    'Elegir Archivo',
      'archive.clear.title':   'Borrar Datos Locales',
      'archive.clear.sub':     '¡Borra permanentemente todos los registros de este dispositivo. Exporta a Google Drive primero!',
      'archive.clearBtn':      'Borrar',

      // ── Library view ─────────────────────────────────────────────────────
      'library.label':    'Conocimiento y Técnica',
      'library.title':    'Biblioteca Pancito y Más',
      'library.sub':      'Una colección curada de sabiduría para el panadero moderno, desde técnicas fundamentales hasta la ciencia de la fermentación.',
      'library.glossary.title': 'El Glosario',
      'library.glossary.sub':   'Descifra el lenguaje del alquimista del pan de masa madre. Busca técnicas, términos y herramientas.',
      'library.search.placeholder': 'Busca términos (ej. Autólisis)',
      'library.noResults':     'Sin resultados. Intenta con otra palabra.',
      // Glossary categories
      'glossary.cat.technique': 'TÉCNICA',
      'glossary.cat.science':   'CIENCIA',
      'glossary.cat.craft':     'OFICIO',
      'glossary.cat.texture':   'TEXTURA',
      'glossary.cat.process':   'PROCESO',
      'glossary.cat.baking':    'HORNEADO',
      'glossary.cat.starter':   'MASA MADRE',
      'glossary.cat.shaping':   'FORMADO',
      // Glossary terms
      'glossary.autolyse.name': 'Autólisis',
      'glossary.autolyse.desc': 'Período de reposo donde se mezcla harina y agua antes de agregar sal y masa madre. Estimula la actividad enzimática y el desarrollo del gluten.',
      'glossary.hooch.name': 'Líquido de Alcohol',
      'glossary.hooch.desc': 'La capa líquida que se forma encima de una masa madre sin alimentar. Con alto contenido alcohólico — significa que tu masa madre tiene hambre.',
      'glossary.banneton.name': 'Banneton',
      'glossary.banneton.desc': 'Canasta de fermentación, generalmente de ratán o lino, que sostiene la masa y le imprime ese hermoso patrón espiral en la corteza.',
      'glossary.openCrumb.name': 'Miga Abierta',
      'glossary.openCrumb.desc': 'El objetivo estético de muchos panaderos: una estructura interna ligera y aireada con grandes alvéolos irregulares en toda la hogaza.',
      'glossary.stretchFold.name': 'Estira y Dobla',
      'glossary.stretchFold.desc': 'Fortalecimiento suave de la masa durante la fermentación. Estira la masa hacia arriba y dóblala sobre sí misma, rotando el tazón — sin amasado.',
      'glossary.bulkFermentation.name': 'Fermentación en Bloque',
      'glossary.bulkFermentation.desc': 'El primer levado después de mezclar. La levadura salvaje y las bacterias fermentan la masa a temperatura ambiente, construyendo sabor y estructura.',
      'glossary.lame.name': 'Lame (Cuchilla)',
      'glossary.lame.desc': 'Una hoja de afeitar sobre un mango usada para hacer cortes en el pan antes de hornear. El corte controla dónde se abre la hogaza durante el resorte de horno.',
      'glossary.ovenSpring.name': 'Resorte de Horno',
      'glossary.ovenSpring.desc': 'El levado rápido que ocurre en los primeros 10–15 minutos de horneado cuando los gases atrapados se expanden. Un resorte dramático indica masa bien fermentada.',
      'glossary.levain.name': 'Levain',
      'glossary.levain.desc': 'Un prefermento construido desde tu masa madre que se agrega a la masa. Usar un levain da más control sobre la tasa de fermentación y el perfil de sabor.',
      'glossary.boule.name': 'Boule y Bâtard',
      'glossary.boule.desc': 'Las dos formas clásicas del pan de masa madre. La boule es redonda; el bâtard es ovalado. Cada una requiere una técnica de formado y patrón de corte diferente.',
      // Library content
      'library.featured.label':    'Bake Lab · Destacado',
      'library.featured.title':    'El Secreto del Vapor',
      'library.featured.sub':      'Por qué los primeros 10 minutos en el horno hacen o deshacen tu pan — y cómo lograrlo bien cada vez.',
      'library.readArticle':       'Leer Artículo',
      'library.readGuide':         'Leer Guía',
      'library.tutorials.title':   'Tutoriales de Artesanía',
      'library.tutorials.tiktok':  'Ver en TikTok',
      'library.stretchFold.cat':   'Fundamentos',
      'library.stretchFold.title': 'El Estira y Dobla',
      'library.stretchFold.sub':   'Dominar la hidratación sin amasado pesado. El núcleo de la estructura del pan de masa madre.',
      'library.scoring.cat':       'Acabado',
      'library.scoring.title':     'Estética de los Cortes',
      'library.scoring.sub':       "Una guía del trabajo decorativo con lame que crea una expansión hermosa y controlada.",
      'library.revival.cat':       'Mantenimiento',
      'library.revival.title':     'La Resurrección de la Masa Madre',
      'library.revival.sub':       'Cómo revivir una masa madre descuidada desde el borde de la dormancia.',
      'library.troubleshoot.title':'Guía de Solución de Problemas',
      'library.rise.title':        '"¿Por qué no subió mi pan?"',
      'library.rise.sub':          'Investigando los tres culpables más comunes: masa madre débil, temperatura incorrecta o sobrefermentación.',
      'library.sticky.title':      '¿La masa está muy pegajosa?',
      'library.sticky.sub':        'Probablemente es un desajuste de hidratación con tu harina. Prueba el método Rubaud.',
      'library.crust.title':       'Corteza Muy Dura',
      'library.crust.sub':         'Falta de Vapor',
      'library.gummy.title':       'Textura Chiclosa',
      'library.gummy.sub':         'Temperatura Interna',
      'library.ebook.label':       'eBook Gratis',
      'library.ebook.title':       'Un Viaje con la Masa Madre',
      'library.ebook.tagline':     '¡Aprende a hacer tu primer pan en 10 días!',
      'library.ebook.sub':         'Inicia sesión con Google, LinkedIn, Microsoft o Email para acceso instantáneo a tu guía gratis.',
      'library.ebook.cta':         'Descarga tu Copia Ahora',
      'library.ebook.note':        'Gratis · Acceso instantáneo · Inicia sesión con Google, LinkedIn o Email',

      // ── Achievements view ─────────────────────────────────────────────────
      'achievements.journeyLabel': 'Tu Camino',
      'achievements.title':        'Vitrina de Logros',
      'achievements.sub':          'Cada insignia se gana, nunca se compra. Toca una insignia bloqueada para ver cómo desbloquearla.',
      'achievements.bakerLevel':   'Nivel de Panadero',
      'achievements.allBadges':    'Todas las Insignias',
      'achievements.tapHint':      'Toca cualquier insignia para ver su historia',
      'achievements.badgesUnlocked': 'de 17 insignias desbloqueadas',
      'achievements.levelHint':    'Haz tu primera horneada para subir de nivel.',
      'achievements.badgeCount':   'de',
      'achievements.badgesLabel':  'insignias desbloqueadas',

      // ── Badge lock hints ──────────────────────────────────────────────────
      'lock.named_starter':  'Ponle nombre a tu starter en el tutorial',
      'lock.first_checkin':  'Completa tu primer check-in de starter',
      'lock.first_loaf':     'Guarda tu primera horneada en el Archivo',
      'lock.photo_baker':    'Guarda una horneada con foto',
      'lock.five_star':      'Dale 5 estrellas a una horneada',
      'lock.three_in_a_row': 'Registra 3 horneadas en 7 días',
      'lock.streak_7':       'Mantén una racha de 7 días',
      'lock.streak_30':      'Mantén una racha de 30 días',
      'lock.bake_10':        'Registra 10 horneadas',
      'lock.bake_25':        'Registra 25 horneadas',
      'lock.bake_50':        'Registra 50 horneadas',
      'lock.cold_proof':     'Guarda una horneada con tiempo de fermento en frío',
      'lock.high_hydration': 'Guarda una horneada con hidratación ≥ 75%',
      'lock.diff_flours':    'Usa 3 tipos de harina diferentes',
      'lock.comeback':       'Hornea de nuevo tras una pausa de 14+ días',
      'lock.consistent':     'Califica 5 horneadas seguidas con ≥ 4 estrellas',
      'lock.sage':           'Alcanza el Nivel 5 (Maestro de la Masa Madre)',

      // ── Baker levels ──────────────────────────────────────────────────────
      'level.1': 'Aprendiz Harinero',
      'level.2': 'Curioso de la Miga',
      'level.3': 'Domador de Masa',
      'level.4': 'Arquitecto del Pan',
      'level.5': 'Sabio del Sourdough',
      'level.maxReached': 'Llegaste al nivel más alto. Eres el pan. 🍞',
      'level.almostThere': '¡Casi llegas!',
      'level.moreBakes':   'horneada más',
      'level.moreBakesPlural': 'horneadas más',
      'level.avgRating':   'calificación promedio',
      'level.moreFlour':   'prueba',
      'level.moreFlourType': 'tipo de harina más',
      'level.moreFlourTypes': 'tipos de harina más',
      'level.streak':      'días de racha',
      'level.toReach':     'para llegar a',

      // ── Badge names & stories ─────────────────────────────────────────────
      'badge.born_from_scratch.name':  'Nacida desde Cero',
      'badge.born_from_scratch.story': 'Creaste tu masa madre solo con harina y agua. Es levadura silvestre que capturaste del aire. Está viva gracias a ti.',
      'badge.named_starter.name':  'Bautizada y Reclamada',
      'badge.named_starter.story': 'Toda gran masa madre merece un nombre. La tuya ya tiene uno.',
      'badge.first_checkin.name':  'Madre Primeriza',
      'badge.first_checkin.story': 'Alimentaste tu masa madre por primera vez. El camino ha comenzado.',
      'badge.tutorial_completed.name':  'Tutorial Completado',
      'badge.tutorial_completed.story': 'Completaste el tutorial completo de Pancito. Ya conoces tu masa madre, tus herramientas y tu proceso. Ahora a hornear.',
      'badge.first_loaf.name':  'Primera Miga',
      'badge.first_loaf.story': 'Tu primer pan. Toda leyenda empieza exactamente aquí.',
      'badge.photo_baker.name':  'Prueba Visual',
      'badge.photo_baker.story': 'Documentaste tu horneada. El progreso ya es visible.',
      'badge.five_star.name':  'Hogaza Dorada',
      'badge.five_star.story': 'Puntuación perfecta. Horneaste algo extraordinario.',
      'badge.three_in_a_row.name':  'En Racha',
      'badge.three_in_a_row.story': 'Tres horneadas en una semana. Estás en tu ritmo.',
      'badge.streak_7.name':  'Semana de Pan',
      'badge.streak_7.story': 'Siete días cuidando tu masa madre. Hábito formado.',
      'badge.streak_30.name':  'Temporada de Pan',
      'badge.streak_30.story': 'Treinta días. Tu masa madre ya conoce tu horario.',
      'badge.bake_10.name':  'Diez Adentro',
      'badge.bake_10.story': 'Diez horneadas. Ya no eres principiante.',
      'badge.bake_25.name':  'Panadero Curtido',
      'badge.bake_25.story': 'Veinticinco hogazas. Tu cocina huele a panadería.',
      'badge.bake_50.name':  'El Historial',
      'badge.bake_50.story': 'Cincuenta horneadas. Tu historial es una biblioteca de aprendizaje.',
      'badge.cold_proof.name':  'Paciencia Recompensada',
      'badge.cold_proof.story': 'Confiaste en el frío. La fermentación lenta construye sabor profundo.',
      'badge.high_hydration.name':  'Caminante del Agua',
      'badge.high_hydration.story': 'La masa de alta hidratación es salvaje y viva. Tú la domaste.',
      'badge.diff_flours.name':  'Curioso de los Granos',
      'badge.diff_flours.story': 'Tres harinas distintas. Estás explorando todo el mundo de los granos.',
      'badge.comeback.name':  'De Regreso a la Cocina',
      'badge.comeback.story': 'La vida se interpuso. Pero regresaste. Eso es lo que importa.',
      'badge.consistent.name':  'El Estándar',
      'badge.consistent.story': 'Cinco horneadas seguidas, todas calificadas con 4 estrellas o más. Tienes un estándar.',
      'badge.sage.name':  'Sabio del Sourdough',
      'badge.sage.story': 'El nivel más alto. Has dominado el antiguo arte del pan de masa madre.',

      // ── Skill nodes ───────────────────────────────────────────────────────
      'skill.stretchFold':   'Estira y Dobla',
      'skill.coldProof':     'Frío',
      'skill.highHydration': 'Alta Hidratación',
      'skill.wholeGrain':    'Grano Entero',
      'skill.longFerment':   'Fermentación Larga',
      'skill.photoDoc':      'Documentación Foto',
      'skill.fiveStar':      'Calidad 5 Estrellas',
      'skill.consistent':    'Consistencia',
      'skill.inclusions':    'Ingredientes Extra',
      'skill.openCrumb':     'Miga Abierta',

      // ── Notification messages ─────────────────────────────────────────────
      'notif.title':   'Pancito y Más 🍞',
      'notif.hungry1': '¡tiene hambre! 🫙 Es hora de checar y alimentar.',
      'notif.hungry2': 'Te necesita. 💪',
      'notif.hungry3': '¿Nos vemos en la cocina?',
      'notif.hungry4': 'Aliméntala para mantenerla fuerte. 🍞',

      // ── Educational page — shared header ─────────────────────────────────
      'edu.catEquipment':    'Equipo Esencial',
      'edu.catFoundations':  'Fundamentos',
      'edu.catMaintenance':  'Mantenimiento',
      'edu.catBakeLab':      'Laboratorio de Horneado',
      'edu.catFinishing':    'Acabado',
      'edu.catTroubleshoot': 'Solución de Problemas',
      'edu.kitCta':          'Consigue el kit completo en Amazon',
      'edu.getKit':          'Consigue el Kit',
      'edu.byLine':          'Por Pancito y Más',
      'edu.allLevels':       'Todos los Niveles',
      'edu.begIntermed':     'Principiante–Intermedio',
      'edu.intermed':        'Intermedio',

      // ── Banneton page ─────────────────────────────────────────────────────
      'banneton.title':    'El Banneton',
      'banneton.readMin':  '7 min de lectura',

      // ── Bench Scraper page ────────────────────────────────────────────────
      'benchScraper.title':   'Raspador de Mesa',
      'benchScraper.readMin': '5 min de lectura',

      // ── Bread Sling page ──────────────────────────────────────────────────
      'breadSling.title':   'Cabestrillo para Pan',
      'breadSling.readMin': '5 min de lectura',

      // ── Lame page ─────────────────────────────────────────────────────────
      'lame.title':   'El Lame',
      'lame.readMin': '6 min de lectura',

      // ── Starter Revival page ──────────────────────────────────────────────
      'revival.title':   'La Resurrección de la Masa Madre',
      'revival.sub':     'Cómo revivir una masa madre descuidada — y el protocolo de 7 días que casi nunca falla.',
      'revival.readMin': '9 min de lectura',

      // ── Stretch & Fold page ───────────────────────────────────────────────
      'stretchFold.title':   'El Estira y Dobla',
      'stretchFold.sub':     'Dominar la hidratación sin amasado pesado. La técnica en el corazón de toda gran hogaza de masa madre.',
      'stretchFold.readMin': '8 min de lectura',

      // ── Science of Steam page ─────────────────────────────────────────────
      'steam.title':   'La Ciencia del Vapor',
      'steam.sub':     'Por qué los primeros 10 minutos en el horno hacen o deshacen tu pan — y cómo lograrlo bien cada vez.',
      'steam.readMin': '6 min de lectura',

      // ── Scoring Aesthetics page ───────────────────────────────────────────
      'scoring.title':   'Estética de los Cortes',
      'scoring.sub':     'El trabajo decorativo con lame que convierte una hogaza en un lienzo — y controla el resorte del horno.',
      'scoring.readMin': '10 min de lectura',

      // ── Troubleshoot pages ────────────────────────────────────────────────
      'troubleshoot.crust.title': 'Corteza Muy Dura',
      'troubleshoot.crust.sub':   'Una corteza tan dura que es difícil de rebanar es casi siempre un problema de vapor. Aquí está lo que pasa — y la guía para solucionarlo.',
      'troubleshoot.crust.readMin': '6 min de lectura',
      'troubleshoot.gummy.title': 'Textura Chiclosa',
      'troubleshoot.gummy.sub':   'Lo horneaste, se ve hermoso — luego lo rebanas y la miga está densa y chiclosa. La respuesta casi siempre se reduce a un número.',
      'troubleshoot.gummy.readMin': '5 min de lectura',
      'troubleshoot.rise.title': '¿Por qué no subió mi pan?',
      'troubleshoot.rise.sub':   'Una hogaza plana y densa es uno de los problemas más comunes y más solucionables. Aquí están los tres culpables — y cómo resolverlos.',
      'troubleshoot.rise.readMin': '7 min de lectura',
      'troubleshoot.sticky.title': '¿La Masa Está Muy Pegajosa?',
      'troubleshoot.sticky.sub':   'Probablemente es un desajuste de hidratación con tu harina. Aquí por qué sucede, cómo manejarlo, y el método Rubaud que lo cambia todo.',
      'troubleshoot.sticky.readMin': '6 min de lectura',

      // ── Onboarding ────────────────────────────────────────────────────────
      'onboarding.pageTitle': 'Pancito y Más — Tu Camino Comienza',
      'onboarding.skip':      'Omitir',
    },
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // PUBLIC API
  // ═══════════════════════════════════════════════════════════════════════════
  window.PymI18n = {
    t,
    getCurrentLang,
    setLang,
    applyTranslations,
    updateLangToggles,
    injectLangToggle,
    TRANSLATIONS,
  };

  // Alias so HTML onclick="setLang('es')" works without prefix
  window.setLang = setLang;

})();

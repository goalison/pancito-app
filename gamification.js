// ═══════════════════════════════════════════════════════════════════════════
// Pancito y Más — Gamification Module  (gamification.js)
// Loaded by every page via <script src="gamification.js"></script>
// Exposes: window.PymGamification
// ═══════════════════════════════════════════════════════════════════════════

(function () {
  'use strict';

  // ── Safe localStorage wrapper ──────────────────────────────────────────────
  let _mem = {};
  const _store = (() => {
    try { localStorage.setItem('__pg__', '1'); localStorage.removeItem('__pg__'); return localStorage; }
    catch (_) {
      return { getItem: k => _mem[k] ?? null, setItem: (k, v) => { _mem[k] = v; }, removeItem: k => { delete _mem[k]; } };
    }
  })();

  const _get  = k        => { try { const v = _store.getItem(k); return v ? JSON.parse(v) : null; } catch (_) { return null; } };
  const _set  = (k, v)   => { try { _store.setItem(k, JSON.stringify(v)); } catch (_) {} };

  // ── Today helper ──────────────────────────────────────────────────────────
  const _today = () => new Date().toISOString().split('T')[0];

  // ══════════════════════════════════════════════════════════════════════════
  // STREAK
  // ══════════════════════════════════════════════════════════════════════════
  function getStreak() {
    return _get('pym_streak') || { current: 0, longest: 0, lastCheckIn: null, graceUsed: false, graceWindowStart: _today() };
  }

  function checkIn() {
    const today  = _today();
    let s = getStreak();
    if (s.lastCheckIn === today) return s; // already checked in today

    const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
    const yStr = yesterday.toISOString().split('T')[0];

    if (!s.lastCheckIn) {
      // First ever check-in
      s.current = 1; s.longest = 1;
    } else if (s.lastCheckIn === yStr) {
      // Consecutive day
      s.current += 1;
    } else {
      // Missed at least one day — try grace
      const daysMissed = Math.round((new Date(today) - new Date(s.lastCheckIn)) / 86400000) - 1;
      const graceWindowAge = Math.round((new Date(today) - new Date(s.graceWindowStart || today)) / 86400000);
      if (daysMissed === 1 && !s.graceUsed) {
        // Use grace — continue streak silently
        s.graceUsed = true;
        s.current += 1;
      } else {
        // Reset
        s.current = 1;
        s.graceUsed = false;
        s.graceWindowStart = today;
      }
    }

    // Reset grace window every 7 days
    const graceAge = Math.round((new Date(today) - new Date(s.graceWindowStart || today)) / 86400000);
    if (graceAge >= 7) { s.graceUsed = false; s.graceWindowStart = today; }

    s.longest     = Math.max(s.longest, s.current);
    s.lastCheckIn = today;
    _set('pym_streak', s);
    return s;
  }

  // ══════════════════════════════════════════════════════════════════════════
  // STARTER COMPANION
  // ══════════════════════════════════════════════════════════════════════════
  const STARTER_DECAY_PER_12H = 15;

  function _computeHealth(starter) {
    if (!starter || !starter.lastFed) return 60;
    const hoursSince = (Date.now() - new Date(starter.lastFed).getTime()) / 3600000;
    const decay = Math.floor(hoursSince / 12) * STARTER_DECAY_PER_12H;
    return Math.max(0, Math.min(100, (starter.health || 60) - decay));
  }

  function _healthToStage(h) {
    if (h >= 86) return 'peak';
    if (h >= 66) return 'thriving';
    if (h >= 41) return 'active';
    if (h >= 21) return 'hungry';
    return 'dormant';
  }

  function getStarterState() {
    const s = _get('pym_starter');
    if (!s) return null;
    const health = _computeHealth(s);
    const hoursSince = s.lastFed ? (Date.now() - new Date(s.lastFed).getTime()) / 3600000 : 999;
    return { ...s, health, stage: _healthToStage(health), hoursSince: Math.round(hoursSince) };
  }

  function feedStarter(activity, temp, notes) {
    let s = _get('pym_starter') || { name: 'Bubbles', health: 60, totalFeedings: 0 };
    const currentHealth = _computeHealth(s);
    const boost = activity === 'doubling' ? 30 : activity === 'bubbly' ? 20 : 5;
    s.health = Math.min(100, currentHealth + boost);
    s.lastFed = new Date().toISOString();
    s.totalFeedings = (s.totalFeedings || 0) + 1;
    s.stage = _healthToStage(s.health);
    _set('pym_starter', s);

    // Append to log
    const log = _get('pym_starter_log') || [];
    log.push({ date: _today(), activity, temp: temp || null, fedAt: s.lastFed, notes: notes || '' });
    if (log.length > 365) log.splice(0, log.length - 365); // keep 1 year
    _set('pym_starter_log', log);

    checkIn(); // feeding counts as a check-in for streak
    return s;
  }

  function initStarterIfNew(defaultName) {
    if (_get('pym_starter')) return false; // already exists
    const name = defaultName || 'Bubbles';
    _set('pym_starter', { name, health: 60, stage: 'active', lastFed: null, totalFeedings: 0, namedAt: new Date().toISOString() });
    return true;
  }

  // ══════════════════════════════════════════════════════════════════════════
  // BAKER LEVEL
  // ══════════════════════════════════════════════════════════════════════════
  const LEVELS = [
    { level: 1, title: 'Flour Dabbler',    minBakes: 0,  minRating: 0,   minFlouars: 0, minStreak: 0  },
    { level: 2, title: 'Crumb Curious',    minBakes: 3,  minRating: 0,   minFlouars: 0, minStreak: 0  },
    { level: 3, title: 'Dough Whisperer',  minBakes: 10, minRating: 3.5, minFlouars: 0, minStreak: 0  },
    { level: 4, title: 'Crumb Architect',  minBakes: 20, minRating: 4.0, minFlouars: 3, minStreak: 0  },
    { level: 5, title: 'Sourdough Sage',   minBakes: 35, minRating: 4.2, minFlouars: 0, minStreak: 30 },
  ];

  function _calcXP(logs) {
    let xp = 0;
    const floursSeen = new Set();
    logs.forEach(log => {
      xp += 50;
      const r = parseFloat(log.rating) || 0;
      if (r >= 5) xp += 50; else if (r >= 4) xp += 25;
      if (parseFloat(log.coldProofTime) > 0) xp += 15;
      if (log.photo && log.photo.length > 10) xp += 10;
      if (log.flourType) { if (!floursSeen.has(log.flourType)) { xp += 20; floursSeen.add(log.flourType); } }
      if (parseFloat(log.hydration) >= 75) xp += 15;
    });
    return xp;
  }

  function calculateLevel(logs) {
    logs = logs || [];
    const bakeCount  = logs.length;
    const avgRating  = bakeCount ? logs.reduce((a, l) => a + (parseFloat(l.rating) || 0), 0) / bakeCount : 0;
    const flourTypes = new Set(logs.map(l => l.flourType).filter(Boolean)).size;
    const streak     = getStreak();
    const xp         = _calcXP(logs);

    let current = LEVELS[0];
    for (const lvl of LEVELS) {
      const streakOk = lvl.minStreak === 0 || streak.current >= lvl.minStreak || streak.longest >= lvl.minStreak;
      if (bakeCount >= lvl.minBakes && avgRating >= lvl.minRating && flourTypes >= lvl.minFlouars && streakOk) {
        current = lvl;
      }
    }

    const next = LEVELS.find(l => l.level === current.level + 1) || null;
    let hint = '';
    if (next) {
      const bakeGap    = Math.max(0, next.minBakes - bakeCount);
      const ratingGap  = Math.max(0, next.minRating - avgRating);
      const flourGap   = Math.max(0, next.minFlouars - flourTypes);
      const streakGap  = next.minStreak > 0 ? Math.max(0, next.minStreak - Math.max(streak.current, streak.longest)) : 0;
      const hints = [];
      if (bakeGap > 0)   hints.push(`${bakeGap} more bake${bakeGap > 1 ? 's' : ''}`);
      if (ratingGap > 0) hints.push(`avg rating ${next.minRating.toFixed(1)}+`);
      if (flourGap > 0)  hints.push(`try ${flourGap} more flour type${flourGap > 1 ? 's' : ''}`);
      if (streakGap > 0) hints.push(`${streakGap}-day streak`);
      hint = hints.length ? hints.join(' · ') + ` to reach ${next.title}` : `Almost there!`;
    } else {
      hint = 'You\'ve reached the highest level. You are the bread. 🍞';
    }

    const result = { level: current.level, title: current.title, xp, nextLevelTitle: next?.title || null, hint };
    _set('pym_baker_level', result);
    return result;
  }

  // ══════════════════════════════════════════════════════════════════════════
  // ACHIEVEMENTS
  // ══════════════════════════════════════════════════════════════════════════
  const BADGE_DEFS = [
    { id: 'born_from_scratch', name: 'Born From Scratch', icon: 'spa', story: 'You created your starter from just flour and water. That\'s wild yeast you captured from the air. It\'s alive because of you.' },
    { id: 'named_starter',  name: 'Named & Claimed',     icon: 'pets',                 story: 'Every great starter deserves a name. Yours has one now.' },
    { id: 'first_checkin',  name: 'Starter Parent',      icon: 'favorite',             story: 'You fed your starter for the very first time. The journey has begun.' },
    { id: 'first_loaf',     name: 'First Crumb',         icon: 'bakery_dining',        story: 'Your very first loaf. Every legend starts exactly here.' },
    { id: 'photo_baker',    name: 'Visual Proof',        icon: 'add_a_photo',          story: 'You documented your bake. Progress is visible now.' },
    { id: 'five_star',      name: 'Golden Loaf',         icon: 'grade',               story: 'A perfect score. You baked something extraordinary.' },
    { id: 'three_in_a_row', name: 'On a Roll',           icon: 'trending_up',          story: 'Three bakes in one week. You\'re in your rhythm.' },
    { id: 'streak_7',       name: 'Week of Bread',       icon: 'local_fire_department',story: 'Seven days of showing up for your starter. Habit formed.' },
    { id: 'streak_30',      name: 'Bread Season',        icon: 'whatshot',             story: 'Thirty days. Your starter knows your schedule by now.' },
    { id: 'bake_10',        name: 'Ten Deep',            icon: 'workspace_premium',    story: 'Ten bakes in. You\'re no longer a beginner.' },
    { id: 'bake_25',        name: 'Seasoned Baker',      icon: 'military_tech',        story: 'Twenty-five loaves. Your kitchen smells like a bakery.' },
    { id: 'bake_50',        name: 'The Archive',         icon: 'inventory_2',          story: 'Fifty bakes. Your archive is a library of learning.' },
    { id: 'cold_proof',     name: 'Patience Rewarded',   icon: 'ac_unit',              story: 'You trusted the cold. Slow fermentation builds deep flavor.' },
    { id: 'high_hydration', name: 'Water Walker',        icon: 'water_drop',           story: 'High hydration dough is wild and alive. You tamed it.' },
    { id: 'diff_flours',    name: 'Grain Curious',       icon: 'grass',               story: 'Three different flours. You\'re exploring the whole grain world.' },
    { id: 'comeback',       name: 'Back in the Kitchen', icon: 'replay',              story: 'Life got in the way. But you came back. That\'s what matters.' },
    { id: 'consistent',     name: 'The Standard',        icon: 'bar_chart',           story: 'Five bakes in a row, all rated 4 stars or higher. You have a standard.' },
    { id: 'sage',           name: 'Sourdough Sage',      icon: 'auto_awesome',        story: 'The highest level. You\'ve mastered the ancient art of sourdough.' },
  ];

  function getBadgeDefs() { return BADGE_DEFS; }

  function getBadgeDef(id) { return BADGE_DEFS.find(b => b.id === id) || null; }

  function _getAchievements() { return _get('pym_achievements') || {}; }

  function unlockAchievement(id) {
    const a = _getAchievements();
    if (a[id]) return false; // already unlocked
    a[id] = { unlockedAt: new Date().toISOString(), seen: false };
    _set('pym_achievements', a);
    // Add to queue
    const q = _get('pym_milestone_queue') || [];
    if (!q.includes(id)) { q.push(id); _set('pym_milestone_queue', q); }
    return true;
  }

  function getUnlockedBadges() {
    const a = _getAchievements();
    return BADGE_DEFS.filter(b => a[b.id]).map(b => ({ ...b, ...a[b.id] }));
  }

  function getUnseenAchievements() {
    const a = _getAchievements();
    const q = _get('pym_milestone_queue') || [];
    return q.filter(id => a[id] && !a[id].seen);
  }

  function markAchievementSeen(id) {
    const a = _getAchievements();
    if (a[id]) { a[id].seen = true; _set('pym_achievements', a); }
    const q = (_get('pym_milestone_queue') || []).filter(i => i !== id);
    _set('pym_milestone_queue', q);
  }

  function checkAchievements(logs, streak, starter) {
    logs   = logs   || [];
    streak = streak || getStreak();
    starter = starter || getStarterState();
    const unlocked = [];

    const tryUnlock = id => { if (unlockAchievement(id)) unlocked.push(id); };

    const a = _getAchievements();
    const bakeCount = logs.length;
    const ratings   = logs.map(l => parseFloat(l.rating) || 0);
    const avgRating = bakeCount ? ratings.reduce((s, r) => s + r, 0) / bakeCount : 0;
    const flourTypes = new Set(logs.map(l => l.flourType).filter(Boolean)).size;

    // Starter badges
    if (starter && starter.name)              tryUnlock('named_starter');
    const starterLog = _get('pym_starter_log') || [];
    if (starterLog.length >= 1)               tryUnlock('first_checkin');

    // Bake count
    if (bakeCount >= 1)  tryUnlock('first_loaf');
    if (bakeCount >= 10) tryUnlock('bake_10');
    if (bakeCount >= 25) tryUnlock('bake_25');
    if (bakeCount >= 50) tryUnlock('bake_50');

    // Photo
    if (logs.some(l => l.photo && l.photo.length > 10)) tryUnlock('photo_baker');

    // Rating
    if (logs.some(l => parseFloat(l.rating) >= 5))      tryUnlock('five_star');

    // Cold proof
    if (logs.some(l => parseFloat(l.coldProofTime) > 0)) tryUnlock('cold_proof');

    // High hydration
    if (logs.some(l => parseFloat(l.hydration) >= 75))   tryUnlock('high_hydration');

    // Flour variety
    if (flourTypes >= 3) tryUnlock('diff_flours');

    // Streaks
    const maxStreak = Math.max(streak.current, streak.longest);
    if (maxStreak >= 7)  tryUnlock('streak_7');
    if (maxStreak >= 30) tryUnlock('streak_30');

    // 3 bakes in 7 days
    if (bakeCount >= 3) {
      const now = Date.now();
      const recentBakes = logs.filter(l => (now - new Date(l.date).getTime()) < 7 * 86400000);
      if (recentBakes.length >= 3) tryUnlock('three_in_a_row');
    }

    // Comeback: bake after 14+ day gap
    if (bakeCount >= 2) {
      const sorted = [...logs].sort((a, b) => new Date(a.date) - new Date(b.date));
      for (let i = 1; i < sorted.length; i++) {
        const gap = (new Date(sorted[i].date) - new Date(sorted[i-1].date)) / 86400000;
        if (gap >= 14) { tryUnlock('comeback'); break; }
      }
    }

    // Consistent: 5 consecutive bakes ≥ 4 stars
    if (bakeCount >= 5) {
      const sorted = [...logs].sort((a, b) => new Date(b.date) - new Date(a.date));
      if (sorted.slice(0, 5).every(l => parseFloat(l.rating) >= 4)) tryUnlock('consistent');
    }

    // Sage: level 5
    const lvl = calculateLevel(logs);
    if (lvl.level >= 5) tryUnlock('sage');

    return unlocked;
  }

  // ══════════════════════════════════════════════════════════════════════════
  // DAILY TIP
  // ══════════════════════════════════════════════════════════════════════════
  const TIPS = [
    { id:'t01', cat:'fermentation', icon:'thermostat',       headline:'Temperature is your secret ingredient',         body:'Warmer dough ferments faster. At 78°F your bulk may take 4 hours; at 68°F, closer to 6–8. Note your kitchen temp with each bake and you\'ll start predicting your dough instead of guessing.' },
    { id:'t02', cat:'starter',      icon:'science',          headline:'Hooch is not a bad sign',                      body:'That grey liquid on top of your starter? That\'s hooch — alcohol from hungry yeast. Pour it off, feed your starter, and carry on. It means your starter is hungry, not dead.' },
    { id:'t03', cat:'scoring',      icon:'content_cut',      headline:'Score at an angle, not straight down',          body:'Hold your lame at 30–45 degrees and slash in one confident stroke. An angled cut creates the beautiful "ear" — the crispy ridge that lifts away from the loaf in the oven.' },
    { id:'t04', cat:'flour',        icon:'grass',            headline:'Bread flour gives you more structure',          body:'Bread flour has higher protein (12–14%) than all-purpose (10–12%). More protein means more gluten, which means your dough can hold more gas and rise higher. Great for your first loaves.' },
    { id:'t05', cat:'fermentation', icon:'bubble_chart',     headline:'The poke test is your best friend',             body:'Gently poke your proofed dough with a floured finger. If it springs back slowly and partway — it\'s ready to bake. Springs back instantly = underproofed. Doesn\'t spring back = overproofed.' },
    { id:'t06', cat:'starter',      icon:'schedule',         headline:'Feed your starter at the same time each day',   body:'Starters are creatures of habit. Consistent feeding times create consistent rise times — which means you can predict when your starter is at peak and plan your bake around it.' },
    { id:'t07', cat:'mindset',      icon:'favorite',         headline:'Your ugly loaves are your best teachers',       body:'Every dense crumb or pale crust is data. What was your bulk time? Your kitchen temp? Write it in your bake notes. The bakers with the most beautiful loaves are usually the ones who failed the most.' },
    { id:'t08', cat:'fermentation', icon:'ac_unit',          headline:'Cold proof develops deeper flavor',             body:'Refrigerating your shaped dough overnight slows fermentation dramatically. This builds lactic and acetic acids — the compounds that create complex tang and that characteristic sourdough depth you can\'t rush.' },
    { id:'t09', cat:'flour',        icon:'water_drop',       headline:'Hydration changes everything',                  body:'A 65% hydration dough is easy to handle and forgiving. A 80% dough is slack, sticky, and creates a more open crumb. Start lower, build confidence, then push the water content as your skills grow.' },
    { id:'t10', cat:'scoring',      icon:'draw',             headline:'Wet your lame for cleaner scores',              body:'Dip your lame or razor blade in water before scoring. This prevents the dough from dragging and tearing as you cut — you\'ll get a cleaner line and a more dramatic ear.' },
    { id:'t11', cat:'mindset',      icon:'timer',            headline:'Sourdough can\'t be rushed',                   body:'This is the radical act of sourdough baking: it teaches you to slow down. The dough is ready when it\'s ready — not when your schedule says. That surrender is part of the magic.' },
    { id:'t12', cat:'fermentation', icon:'visibility',       headline:'Look for the jiggle, not the clock',            body:'Bulk fermentation is done when your dough is jiggly like panna cotta, has grown 50–75%, and shows bubbles on the sides of the bowl. The clock is a guide — your dough\'s behavior is the truth.' },
    { id:'t13', cat:'starter',      icon:'opacity',          headline:'1:2:2 is the classic ratio',                   body:'Feeding your starter 1 part starter : 2 parts flour : 2 parts water (by weight) gives the yeast plenty of fresh food and predicts a reliable rise. It\'s a great default until you learn your starter\'s personality.' },
    { id:'t14', cat:'flour',        icon:'eco',              headline:'Whole wheat speeds up fermentation',            body:'Even 10–20% whole wheat flour added to your mix accelerates fermentation because it carries more wild yeast and bacteria from the bran. Great for cold kitchens or sluggish starters.' },
    { id:'t15', cat:'scoring',      icon:'spa',              headline:'Patterns come after confidence',                body:'Master one clean diagonal slash before you attempt wheat sheaves and leaves. The most beautiful scoring in the world starts with one bold, confident cut. Learn the basics — decoration follows naturally.' },
    { id:'t16', cat:'fermentation', icon:'waves',            headline:'Stretch & fold builds structure gently',        body:'Unlike kneading, stretch and folds develop gluten without deflating the gas already built by fermentation. Four sets in the first two hours of bulk is the classic approach — your dough gets stronger with each set.' },
    { id:'t17', cat:'starter',      icon:'check_circle',     headline:'The float test is optional',                   body:'A ripe starter floats in water — but not always. Many bakers with perfectly healthy starters report their starters sinking. Rely more on the doubling time, the bubbles, and the dome. Float test is a bonus, not the rule.' },
    { id:'t18', cat:'mindset',      icon:'diversity_1',      headline:'Every kitchen is different',                   body:'What works in a warm Texan kitchen won\'t work the same in a cool Pacific Northwest home. Your notes are your map. Over time you\'ll know your specific conditions better than any recipe can predict.' },
    { id:'t19', cat:'fermentation', icon:'compress',         headline:'Pre-shape creates surface tension',            body:'After bulk, a gentle pre-shape (rounding the dough on your bench) creates initial surface tension before the final shape. Let it rest 20–30 minutes — this bench rest relaxes the gluten and makes shaping easier.' },
    { id:'t20', cat:'flour',        icon:'bolt',             headline:'Rye flour is a starter supercharger',          body:'A tablespoon of rye flour in your starter feed accelerates activity because rye is packed with wild yeast and enzymes. Great for reviving a sluggish starter or when you want faster, more vigorous fermentation.' },
    { id:'t21', cat:'scoring',      icon:'highlight',        headline:'Score deep, not shallow',                      body:'Too-shallow scoring seals shut in the oven\'s heat. Aim for at least ½ inch (1.3 cm) depth. Deep scores give the bread room to expand and prevent blowouts on the sides where you didn\'t score.' },
    { id:'t22', cat:'starter',      icon:'loop',             headline:'Discard is not waste',                         body:'Sourdough discard is pre-fermented flour — full of flavor. Use it in pancakes, crackers, waffles, and pizza dough. Many bakers love their discard recipes as much as their actual bread.' },
    { id:'t23', cat:'mindset',      icon:'celebration',      headline:'Share your bread',                             body:'Sourdough is meant to be given away. The joy of handing someone a loaf you made with your own hands is a feeling most bakers cite as one of the best parts of the whole process.' },
    { id:'t24', cat:'fermentation', icon:'nightlight',       headline:'Cold retard protects your timeline',           body:'A long cold proof (8–16 hours in the fridge) means you can bake on YOUR schedule. Shape at 9pm, bake at 7am. The cold stops the clock for you — and makes scoring easier on a firm, cold loaf.' },
    { id:'t25', cat:'flour',        icon:'grain',            headline:'Protein content matters',                      body:'The protein percentage on your flour bag predicts gluten strength. For sourdough: aim for 12–14% for most loaves. All-purpose at 10% will work but produces a denser, less airy crumb.' },
    { id:'t26', cat:'scoring',      icon:'gesture',          headline:'One stroke, no hesitation',                   body:'Hesitation in scoring creates drag marks and torn dough. Commit to your score before you touch the dough. One confident motion is always better than a careful, tentative one.' },
    { id:'t27', cat:'starter',      icon:'thermostat',       headline:'Warmer = faster, cooler = slower',            body:'Your starter behaves very differently at different temperatures. At 65°F it might peak in 10–12 hours. At 78°F it might peak in 4–6 hours. Learning this relationship is the key to predictable bakes.' },
    { id:'t28', cat:'mindset',      icon:'auto_stories',     headline:'Keep a bake journal',                         body:'The bakers who improve fastest are the ones who write things down. Temperature, timing, how the dough felt, what the crumb looked like. Every note is a data point that makes your next bake smarter.' },
    { id:'t29', cat:'fermentation', icon:'pending',          headline:'Underproofed is safer than overproofed',      body:'An underproofed loaf is dense and gummy but still edible. An overproofed loaf can collapse and spread flat. When in doubt, bake a little early — you\'ll learn to push further on the next bake.' },
    { id:'t30', cat:'flour',        icon:'hub',              headline:'Inclusions go in at the end of bulk',         body:'Adding olives, cheese, seeds, or dried fruit too early can weaken gluten development. Add inclusions in the last stretch and fold of bulk fermentation — the dough has already built its structure by then.' },
    { id:'t31', cat:'scoring',      icon:'straighten',       headline:'Colder dough scores better',                  body:'Scoring a cold, retarded loaf straight from the fridge is much easier than scoring room-temperature dough. The cold firms the surface, holds its shape, and gives your lame clean resistance.' },
    { id:'t32', cat:'starter',      icon:'water',            headline:'Water quality matters more than you think',   body:'Chlorinated tap water can inhibit yeast and bacteria in your starter. If your starter seems sluggish, try filtered water or leave tap water in an open container overnight to let chlorine off-gas.' },
    { id:'t33', cat:'fermentation', icon:'view_comfy',       headline:'A bigger bowl shows you more',                body:'Ferment your dough in a clear, straight-sided container. Mark the starting height with a rubber band. Watching the rise gives you visual feedback that no timer can match — you\'ll learn to read fermentation by sight.' },
    { id:'t34', cat:'mindset',      icon:'local_florist',    headline:'Sourdough baking is a practice',              body:'You don\'t "master" sourdough and then stop learning. Every season, every new flour, every new kitchen is a new variable. The best bakers stay curious. The learning is the point.' },
    { id:'t35', cat:'flour',        icon:'filter_vintage',   headline:'Ancient grains have more flavor',             body:'Einkorn, spelt, and emmer are older wheat varieties with different gluten structures and richer flavor profiles. They ferment faster and create denser loaves — but the flavor is remarkable. Try a 20% substitution first.' },
  ];

  function getDailyTip() {
    const today = _today();
    let idx  = _get('pym_daily_tip_index') ?? 0;
    const lastDate = _get('pym_daily_tip_date');
    if (lastDate !== today) {
      idx = (idx + 1) % TIPS.length;
      _set('pym_daily_tip_index', idx);
      _set('pym_daily_tip_date', today);
    }
    return TIPS[idx];
  }

  // ══════════════════════════════════════════════════════════════════════════
  // FEATURE UNLOCK GATING
  // ══════════════════════════════════════════════════════════════════════════
  function isFeatureUnlocked(feature, logs) {
    logs = logs || [];
    const ob = _get('pym_onboarding') || {};
    const bakeCount = logs.length;
    switch (feature) {
      case 'bake_log':        return !!ob.complete;
      case 'archive':         return bakeCount >= 1;
      case 'archive_filters': return bakeCount >= 3;
      case 'library_deep':    return bakeCount >= 5;
      case 'skill_tree':      return bakeCount >= 10;
      case 'crumb_journey':   return bakeCount >= 20;
      case 'community_share': return (calculateLevel(logs).level >= 4);
      default:                return true;
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  // SKILL TREE  (Phase 2 — data only; UI built in index.html)
  // ══════════════════════════════════════════════════════════════════════════
  const SKILL_NODES = [
    { id: 'stretchFold',   label: 'Stretch & Fold',      icon: 'gesture',      check: logs => logs.length >= 1 },
    { id: 'coldProof',     label: 'Cold Proof',           icon: 'ac_unit',      check: logs => logs.some(l => parseFloat(l.coldProofTime) > 0) },
    { id: 'highHydration', label: 'High Hydration',       icon: 'water_drop',   check: logs => logs.some(l => parseFloat(l.hydration) >= 75) },
    { id: 'wholeGrain',    label: 'Whole Grain',          icon: 'grass',        check: logs => logs.some(l => /whole|wheat|rye|spelt/i.test(l.flourType || '')) },
    { id: 'longFerment',   label: 'Long Ferment',         icon: 'schedule',     check: logs => logs.some(l => parseFloat(l.coldProofTime) >= 18) },
    { id: 'photoDoc',      label: 'Photo Doc',            icon: 'add_a_photo',  check: logs => logs.some(l => l.photo && l.photo.length > 10) },
    { id: 'fiveStar',      label: '5-Star Quality',       icon: 'grade',        check: logs => logs.some(l => parseFloat(l.rating) >= 5) },
    { id: 'consistent',    label: 'Consistency',          icon: 'bar_chart',    check: logs => logs.length >= 5 && [...logs].sort((a,b)=>new Date(b.date)-new Date(a.date)).slice(0,5).every(l=>parseFloat(l.rating)>=4) },
    { id: 'inclusions',    label: 'Inclusions',           icon: 'eco',          check: logs => logs.some(l => /olive|cheese|seed|jalap|rosemary|nut|fruit|herb/i.test((l.inclusions||'')+(l.comments||''))) },
    { id: 'openCrumb',     label: 'Open Crumb',           icon: 'grid_on',      check: logs => logs.some(l => l.crumbType === 'open') },
  ];

  function calculateSkillTree(logs) {
    logs = logs || [];
    const tree = {};
    SKILL_NODES.forEach(n => {
      tree[n.id] = { ...n, unlocked: n.check(logs) };
    });
    _set('pym_skill_tree', tree);
    return tree;
  }

  function getSkillNodes() { return SKILL_NODES; }

  // ══════════════════════════════════════════════════════════════════════════
  // STARTER FEEDING REMINDER  (Capacitor LocalNotifications)
  // ══════════════════════════════════════════════════════════════════════════
  async function scheduleStarterReminder(enabled, hour, minute) {
    const NOTIF_ID = 9001;
    const settings = { enabled: !!enabled, frequency: '24h', hour: hour ?? 8, minute: minute ?? 0, lastScheduled: _today() };
    _set('pym_starter_reminder', settings);

    const cap = window.Capacitor?.Plugins?.LocalNotifications;
    if (!cap) return;

    await cap.cancel({ notifications: [{ id: NOTIF_ID }] }).catch(() => {});
    if (!enabled) return;

    const starter = getStarterState();
    const name = starter?.name || 'your starter';
    const messages = [
      `${name} might be getting hungry! 🫙 Tap to check in.`,
      `Time to feed ${name} — they're waiting for you.`,
      `A quick check-in keeps ${name} thriving. See you in the kitchen?`,
    ];
    const body = messages[Math.floor(Math.random() * messages.length)];

    const now = new Date();
    const fire = new Date(now);
    fire.setHours(hour ?? 8, minute ?? 0, 0, 0);
    if (fire <= now) fire.setDate(fire.getDate() + 1);

    await cap.schedule({ notifications: [{
      id: NOTIF_ID, title: 'Pancito y Más 🍞', body,
      schedule: { at: fire, repeats: true, every: 'day' },
      channelId: 'bake-timers',
    }]}).catch(() => {});
  }

  // ══════════════════════════════════════════════════════════════════════════
  // PUBLIC API
  // ══════════════════════════════════════════════════════════════════════════
  window.PymGamification = {
    // Streak
    checkIn,
    getStreak,
    // Starter
    getStarterState,
    feedStarter,
    initStarterIfNew,
    // Level
    calculateLevel,
    // Achievements
    checkAchievements,
    unlockAchievement,
    getUnlockedBadges,
    getUnseenAchievements,
    markAchievementSeen,
    getBadgeDefs,
    getBadgeDef,
    // Tips
    getDailyTip,
    // Skill tree
    calculateSkillTree,
    getSkillNodes,
    // Gating
    isFeatureUnlocked,
    // Notifications
    scheduleStarterReminder,
    // Utility
    today: _today,
  };

})();

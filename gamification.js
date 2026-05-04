// ═══════════════════════════════════════════════════════════════════════════
// Pancito y Más — Gamification Module  (gamification.js)
// Loaded by every page via <script src="gamification.js"></script>
// Exposes: window.PymGamification
// ═══════════════════════════════════════════════════════════════════════════

(function () {
  'use strict';

  // ── Language helper ────────────────────────────────────────────────────────
  function _lang() { return (window.PymI18n && window.PymI18n.getCurrentLang()) || 'en'; }

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
      if (daysMissed === 1 && !s.graceUsed) {
        s.graceUsed = true;
        s.current += 1;
      } else {
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
    { level: 1, title: { en: 'Flour Dabbler',    es: 'Explorador de Harinas'  }, minBakes: 0,  minRating: 0,   minFlouars: 0, minStreak: 0  },
    { level: 2, title: { en: 'Crumb Curious',    es: 'Curioso del Migajón'    }, minBakes: 3,  minRating: 0,   minFlouars: 0, minStreak: 0  },
    { level: 3, title: { en: 'Dough Whisperer',  es: 'Domador de Masas'       }, minBakes: 10, minRating: 3.5, minFlouars: 0, minStreak: 0  },
    { level: 4, title: { en: 'Crumb Architect',  es: 'Arquitecto del Migajón' }, minBakes: 20, minRating: 4.0, minFlouars: 3, minStreak: 0  },
    { level: 5, title: { en: 'Sourdough Sage',   es: 'Maestro de la Masa Madre' }, minBakes: 35, minRating: 4.2, minFlouars: 0, minStreak: 30 },
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
    const lang       = _lang();

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
      const nextTitle  = next.title[lang] || next.title.en;
      const hints = [];
      if (lang === 'es') {
        if (bakeGap > 0)   hints.push(`${bakeGap} horneada${bakeGap > 1 ? 's' : ''} más`);
        if (ratingGap > 0) hints.push(`calificación promedio ${next.minRating.toFixed(1)}+`);
        if (flourGap > 0)  hints.push(`prueba ${flourGap} harina${flourGap > 1 ? 's' : ''} más`);
        if (streakGap > 0) hints.push(`racha de ${streakGap} días`);
        hint = hints.length ? hints.join(' · ') + ` para llegar a ${nextTitle}` : '¡Casi llegas!';
      } else {
        if (bakeGap > 0)   hints.push(`${bakeGap} more bake${bakeGap > 1 ? 's' : ''}`);
        if (ratingGap > 0) hints.push(`avg rating ${next.minRating.toFixed(1)}+`);
        if (flourGap > 0)  hints.push(`try ${flourGap} more flour type${flourGap > 1 ? 's' : ''}`);
        if (streakGap > 0) hints.push(`${streakGap}-day streak`);
        hint = hints.length ? hints.join(' · ') + ` to reach ${nextTitle}` : 'Almost there!';
      }
    } else {
      hint = lang === 'es'
        ? 'Has alcanzado el nivel más alto. Tú eres el pan. 🍞'
        : 'You\'ve reached the highest level. You are the bread. 🍞';
    }

    const result = {
      level: current.level,
      title: current.title[lang] || current.title.en,
      xp,
      nextLevelTitle: next ? (next.title[lang] || next.title.en) : null,
      hint
    };
    _set('pym_baker_level', result);
    return result;
  }

  // ══════════════════════════════════════════════════════════════════════════
  // ACHIEVEMENTS
  // ══════════════════════════════════════════════════════════════════════════
  const BADGE_DEFS = [
    {
      id: 'born_from_scratch', icon: 'spa',
      name:  { en: 'Born From Scratch',      es: 'Nacido del Polvo' },
      story: { en: 'You created your starter from just flour and water. That\'s wild yeast you captured from the air. It\'s alive because of you.',
               es: 'Creaste tu masa madre desde cero, solo con harina y agua. Atrapaste levaduras salvajes del aire. Vive gracias a ti.' },
    },
    {
      id: 'named_starter', icon: 'pets',
      name:  { en: 'Named & Claimed',         es: 'Bautizado y Adoptado' },
      story: { en: 'Every great starter deserves a name. Yours has one now.',
               es: 'Todo buen starter merece un nombre. El tuyo ya tiene uno.' },
    },
    {
      id: 'first_checkin', icon: 'favorite',
      name:  { en: 'Starter Parent',          es: 'Madre de Masa' },
      story: { en: 'You fed your starter for the very first time. The journey has begun.',
               es: 'Le diste de comer a tu masa madre por primera vez. El viaje ha comenzado.' },
    },
    {
      id: 'tutorial_completed', icon: 'school',
      name:  { en: 'Tutorial Completed',      es: 'Tutorial Completado' },
      story: { en: 'You completed the full Pancito tutorial. You know your starter, your tools, and your process. Now go bake.',
               es: 'Completaste el tutorial de Pancito. Ya conoces tu starter, tus herramientas y tu proceso. Ahora ve a hornear.' },
    },
    {
      id: 'first_loaf', icon: 'bakery_dining',
      name:  { en: 'First Crumb',             es: 'Primera Hogaza' },
      story: { en: 'Your very first loaf. Every legend starts exactly here.',
               es: 'Tu primera hogaza. Todas las leyendas empiezan exactamente aquí.' },
    },
    {
      id: 'photo_baker', icon: 'add_a_photo',
      name:  { en: 'Visual Proof',            es: 'Evidencia Visual' },
      story: { en: 'You documented your bake. Progress is visible now.',
               es: 'Documentaste tu horneada. El progreso ya es visible.' },
    },
    {
      id: 'five_star', icon: 'grade',
      name:  { en: 'Golden Loaf',             es: 'Hogaza de Oro' },
      story: { en: 'A perfect score. You baked something extraordinary.',
               es: 'Calificación perfecta. Horneaste algo extraordinario.' },
    },
    {
      id: 'three_in_a_row', icon: 'trending_up',
      name:  { en: 'On a Roll',               es: 'En Racha' },
      story: { en: 'Three bakes in one week. You\'re in your rhythm.',
               es: 'Tres horneadas en una semana. Estás en tu ritmo.' },
    },
    {
      id: 'streak_7', icon: 'local_fire_department',
      name:  { en: 'Week of Bread',           es: 'Semana Panadera' },
      story: { en: 'Seven days of showing up for your starter. Habit formed.',
               es: 'Siete días cuidando tu masa madre. El hábito ya está formado.' },
    },
    {
      id: 'streak_30', icon: 'whatshot',
      name:  { en: 'Bread Season',            es: 'Temporada de Pan' },
      story: { en: 'Thirty days. Your starter knows your schedule by now.',
               es: 'Treinta días. Tu starter ya conoce tu horario.' },
    },
    {
      id: 'bake_10', icon: 'workspace_premium',
      name:  { en: 'Ten Deep',                es: 'Diez Horneadas' },
      story: { en: 'Ten bakes in. You\'re no longer a beginner.',
               es: 'Diez horneadas. Ya no eres principiante.' },
    },
    {
      id: 'bake_25', icon: 'military_tech',
      name:  { en: 'Seasoned Baker',          es: 'Panadero Curtido' },
      story: { en: 'Twenty-five loaves. Your kitchen smells like a bakery.',
               es: 'Veinticinco hogazas. Tu cocina huele como panadería.' },
    },
    {
      id: 'bake_50', icon: 'inventory_2',
      name:  { en: 'The Archive',             es: 'El Archivo' },
      story: { en: 'Fifty bakes. Your archive is a library of learning.',
               es: 'Cincuenta horneadas. Tu archivo es una biblioteca de aprendizaje.' },
    },
    {
      id: 'cold_proof', icon: 'ac_unit',
      name:  { en: 'Patience Rewarded',       es: 'La Paciencia Recompensa' },
      story: { en: 'You trusted the cold. Slow fermentation builds deep flavor.',
               es: 'Confiaste en el frío. La fermentación lenta construye sabores profundos.' },
    },
    {
      id: 'high_hydration', icon: 'water_drop',
      name:  { en: 'Water Walker',            es: 'Domador del Agua' },
      story: { en: 'High hydration dough is wild and alive. You tamed it.',
               es: 'La masa de alta hidratación es salvaje y viva. Tú la domaste.' },
    },
    {
      id: 'diff_flours', icon: 'grass',
      name:  { en: 'Grain Curious',           es: 'Curioso de Granos' },
      story: { en: 'Three different flours. You\'re exploring the whole grain world.',
               es: 'Tres harinas diferentes. Estás explorando todo el mundo de los cereales.' },
    },
    {
      id: 'comeback', icon: 'replay',
      name:  { en: 'Back in the Kitchen',     es: 'De Vuelta a la Cocina' },
      story: { en: 'Life got in the way. But you came back. That\'s what matters.',
               es: 'La vida se interpuso. Pero regresaste. Eso es lo que importa.' },
    },
    {
      id: 'consistent', icon: 'bar_chart',
      name:  { en: 'The Standard',            es: 'El Estándar' },
      story: { en: 'Five bakes in a row, all rated 4 stars or higher. You have a standard.',
               es: 'Cinco horneadas seguidas, todas de 4 estrellas o más. Tienes un estándar.' },
    },
    {
      id: 'sage', icon: 'auto_awesome',
      name:  { en: 'Sourdough Sage',          es: 'Maestro de la Masa Madre' },
      story: { en: 'The highest level. You\'ve mastered the ancient art of sourdough.',
               es: 'El nivel más alto. Dominaste el arte ancestral de la masa madre.' },
    },
  ];

  function _resolveBadge(b) {
    const lang = _lang();
    return { ...b, name: b.name[lang] || b.name.en, story: b.story[lang] || b.story.en };
  }

  function getBadgeDefs() { return BADGE_DEFS.map(_resolveBadge); }

  function getBadgeDef(id) {
    const b = BADGE_DEFS.find(b => b.id === id) || null;
    return b ? _resolveBadge(b) : null;
  }

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
    return BADGE_DEFS.filter(b => a[b.id]).map(b => ({ ..._resolveBadge(b), ...a[b.id] }));
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
    { id:'t01', cat:'fermentation', icon:'thermostat',
      headline:{ en:'Temperature is your secret ingredient',       es:'La temperatura es tu ingrediente secreto' },
      body:    { en:'Warmer dough ferments faster. At 78°F your bulk may take 4 hours; at 68°F, closer to 6–8. Note your kitchen temp with each bake and you\'ll start predicting your dough instead of guessing.',
                 es:'La masa más caliente fermenta más rápido. A 78°F tu fermentación puede durar 4 horas; a 68°F, entre 6 y 8. Anota la temperatura de tu cocina en cada horneada y empezarás a predecir tu masa en lugar de adivinar.' } },
    { id:'t02', cat:'starter',      icon:'science',
      headline:{ en:'Hooch is not a bad sign',                     es:'El hooch no es una mala señal' },
      body:    { en:'That grey liquid on top of your starter? That\'s hooch — alcohol from hungry yeast. Pour it off, feed your starter, and carry on. It means your starter is hungry, not dead.',
                 es:'¿Ese líquido grisáceo encima de tu starter? Es hooch — alcohol de levadura hambrienta. Tíralo, aliméntalo y sigue adelante. Significa que tu starter tiene hambre, no que esté muerto.' } },
    { id:'t03', cat:'scoring',      icon:'content_cut',
      headline:{ en:'Score at an angle, not straight down',        es:'Corta en ángulo, no hacia abajo' },
      body:    { en:'Hold your lame at 30–45 degrees and slash in one confident stroke. An angled cut creates the beautiful "ear" — the crispy ridge that lifts away from the loaf in the oven.',
                 es:'Sostén la cuchilla a 30–45 grados y hazlo en un solo trazo seguro. Un corte en ángulo crea la hermosa "oreja" — la cresta crujiente que se separa de la hogaza en el horno.' } },
    { id:'t04', cat:'flour',        icon:'grass',
      headline:{ en:'Bread flour gives you more structure',        es:'La harina de fuerza da más estructura' },
      body:    { en:'Bread flour has higher protein (12–14%) than all-purpose (10–12%). More protein means more gluten, which means your dough can hold more gas and rise higher. Great for your first loaves.',
                 es:'La harina de fuerza tiene más proteína (12–14%) que la harina todo uso (10–12%). Más proteína significa más gluten, lo que permite que tu masa retenga más gas y suba más. Excelente para tus primeras hogazas.' } },
    { id:'t05', cat:'fermentation', icon:'bubble_chart',
      headline:{ en:'The poke test is your best friend',           es:'La prueba del dedo es tu mejor aliada' },
      body:    { en:'Gently poke your proofed dough with a floured finger. If it springs back slowly and partway — it\'s ready to bake. Springs back instantly = underproofed. Doesn\'t spring back = overproofed.',
                 es:'Hunde suavemente tu masa fermentada con un dedo enharinado. Si regresa lento y a medias — está lista para hornear. Regresa rápido = subfermentada. No regresa = sobrefermentada.' } },
    { id:'t06', cat:'starter',      icon:'schedule',
      headline:{ en:'Feed your starter at the same time each day', es:'Alimenta tu starter a la misma hora cada día' },
      body:    { en:'Starters are creatures of habit. Consistent feeding times create consistent rise times — which means you can predict when your starter is at peak and plan your bake around it.',
                 es:'Los starters son criaturas de hábito. Los tiempos de alimentación consistentes crean tiempos de levada consistentes — lo que significa que puedes predecir cuándo tu starter está en su pico y planear tu horneada.' } },
    { id:'t07', cat:'mindset',      icon:'favorite',
      headline:{ en:'Your ugly loaves are your best teachers',     es:'Tus hogazas feas son tus mejores maestras' },
      body:    { en:'Every dense crumb or pale crust is data. What was your bulk time? Your kitchen temp? Write it in your bake notes. The bakers with the most beautiful loaves are usually the ones who failed the most.',
                 es:'Cada miga densa o corteza pálida es información. ¿Cuánto duró tu fermentación? ¿Cuál era la temperatura? Escríbelo en tus notas. Los panaderos con las hogazas más bellas son generalmente los que más fallaron.' } },
    { id:'t08', cat:'fermentation', icon:'ac_unit',
      headline:{ en:'Cold proof develops deeper flavor',            es:'La fermentación en frío desarrolla sabores profundos' },
      body:    { en:'Refrigerating your shaped dough overnight slows fermentation dramatically. This builds lactic and acetic acids — the compounds that create complex tang and that characteristic sourdough depth you can\'t rush.',
                 es:'Refrigerar tu masa formada durante la noche ralentiza la fermentación drásticamente. Esto produce ácidos láctico y acético — los compuestos que crean el acidito complejo y esa profundidad característica de la masa madre que no puedes apresurar.' } },
    { id:'t09', cat:'flour',        icon:'water_drop',
      headline:{ en:'Hydration changes everything',                 es:'La hidratación lo cambia todo' },
      body:    { en:'A 65% hydration dough is easy to handle and forgiving. A 80% dough is slack, sticky, and creates a more open crumb. Start lower, build confidence, then push the water content as your skills grow.',
                 es:'Una masa de 65% de hidratación es fácil de manejar y perdonadora. Una de 80% es suelta, pegajosa, y crea una miga más abierta. Empieza más bajo, gana confianza, luego aumenta el agua conforme mejores tus habilidades.' } },
    { id:'t10', cat:'scoring',      icon:'draw',
      headline:{ en:'Wet your lame for cleaner scores',            es:'Moja la cuchilla para cortes más limpios' },
      body:    { en:'Dip your lame or razor blade in water before scoring. This prevents the dough from dragging and tearing as you cut — you\'ll get a cleaner line and a more dramatic ear.',
                 es:'Moja tu cuchilla o navaja antes de hacer los cortes. Esto evita que la masa se pegue y se rompa — obtendrás una línea más limpia y una oreja más dramática.' } },
    { id:'t11', cat:'mindset',      icon:'timer',
      headline:{ en:'Sourdough can\'t be rushed',                  es:'La masa madre no se puede apresurar' },
      body:    { en:'This is the radical act of sourdough baking: it teaches you to slow down. The dough is ready when it\'s ready — not when your schedule says. That surrender is part of the magic.',
                 es:'Este es el acto radical de la panadería con masa madre: te enseña a ir despacio. La masa está lista cuando está lista — no cuando tu agenda lo dice. Esa entrega es parte de la magia.' } },
    { id:'t12', cat:'fermentation', icon:'visibility',
      headline:{ en:'Look for the jiggle, not the clock',          es:'Busca el temblor, no el reloj' },
      body:    { en:'Bulk fermentation is done when your dough is jiggly like panna cotta, has grown 50–75%, and shows bubbles on the sides of the bowl. The clock is a guide — your dough\'s behavior is the truth.',
                 es:'La fermentación en bloque termina cuando tu masa tiembla como panna cotta, ha crecido entre 50–75%, y muestra burbujas en los lados del tazón. El reloj es una guía — el comportamiento de tu masa es la verdad.' } },
    { id:'t13', cat:'starter',      icon:'opacity',
      headline:{ en:'1:2:2 is the classic ratio',                  es:'1:2:2 es la proporción clásica' },
      body:    { en:'Feeding your starter 1 part starter : 2 parts flour : 2 parts water (by weight) gives the yeast plenty of fresh food and predicts a reliable rise. It\'s a great default until you learn your starter\'s personality.',
                 es:'Alimentar tu starter en proporción 1 parte starter : 2 partes harina : 2 partes agua (en peso) le da a la levadura bastante alimento fresco y predice una levada confiable. Es un buen punto de partida hasta que conozcas la personalidad de tu starter.' } },
    { id:'t14', cat:'flour',        icon:'eco',
      headline:{ en:'Whole wheat speeds up fermentation',          es:'La harina integral acelera la fermentación' },
      body:    { en:'Even 10–20% whole wheat flour added to your mix accelerates fermentation because it carries more wild yeast and bacteria from the bran. Great for cold kitchens or sluggish starters.',
                 es:'Agregar incluso un 10–20% de harina integral a tu mezcla acelera la fermentación porque lleva más levadura salvaje y bacterias del salvado. Ideal para cocinas frías o starters lentos.' } },
    { id:'t15', cat:'scoring',      icon:'spa',
      headline:{ en:'Patterns come after confidence',              es:'Los patrones vienen después de la confianza' },
      body:    { en:'Master one clean diagonal slash before you attempt wheat sheaves and leaves. The most beautiful scoring in the world starts with one bold, confident cut. Learn the basics — decoration follows naturally.',
                 es:'Domina un corte diagonal limpio antes de intentar espigas de trigo y hojas. El corte más bello del mundo empieza con uno solo, seguro y decidido. Aprende lo básico — la decoración llegará naturalmente.' } },
    { id:'t16', cat:'fermentation', icon:'waves',
      headline:{ en:'Stretch & fold builds structure gently',      es:'El estira y dobla construye estructura suavemente' },
      body:    { en:'Unlike kneading, stretch and folds develop gluten without deflating the gas already built by fermentation. Four sets in the first two hours of bulk is the classic approach — your dough gets stronger with each set.',
                 es:'A diferencia del amasado, el estira y dobla desarrolla el gluten sin desinflar el gas ya producido por la fermentación. Cuatro series en las primeras dos horas de fermentación es el enfoque clásico — tu masa se vuelve más fuerte con cada serie.' } },
    { id:'t17', cat:'starter',      icon:'check_circle',
      headline:{ en:'The float test is optional',                  es:'La prueba del flotador es opcional' },
      body:    { en:'A ripe starter floats in water — but not always. Many bakers with perfectly healthy starters report their starters sinking. Rely more on the doubling time, the bubbles, and the dome. Float test is a bonus, not the rule.',
                 es:'Un starter maduro flota en agua — pero no siempre. Muchos panaderos con starters perfectamente saludables reportan que sus starters se hunden. Confía más en el tiempo de doblado, las burbujas y el domo. La prueba del flotador es un extra, no la regla.' } },
    { id:'t18', cat:'mindset',      icon:'diversity_1',
      headline:{ en:'Every kitchen is different',                  es:'Cada cocina es diferente' },
      body:    { en:'What works in a warm Texan kitchen won\'t work the same in a cool Pacific Northwest home. Your notes are your map. Over time you\'ll know your specific conditions better than any recipe can predict.',
                 es:'Lo que funciona en una cocina cálida de Monterrey no funcionará igual en una casa fresca de la Ciudad de México. Tus notas son tu mapa. Con el tiempo conocerás tus condiciones específicas mejor que cualquier receta.' } },
    { id:'t19', cat:'fermentation', icon:'compress',
      headline:{ en:'Pre-shape creates surface tension',           es:'El preformado crea tensión superficial' },
      body:    { en:'After bulk, a gentle pre-shape (rounding the dough on your bench) creates initial surface tension before the final shape. Let it rest 20–30 minutes — this bench rest relaxes the gluten and makes shaping easier.',
                 es:'Después de la fermentación, un preformado suave (redondear la masa en tu mesa) crea tensión superficial inicial antes del formado final. Déjala reposar 20–30 minutos — este reposo de mesa relaja el gluten y hace más fácil el formado.' } },
    { id:'t20', cat:'flour',        icon:'bolt',
      headline:{ en:'Rye flour is a starter supercharger',         es:'La harina de centeno es un supercargador de starter' },
      body:    { en:'A tablespoon of rye flour in your starter feed accelerates activity because rye is packed with wild yeast and enzymes. Great for reviving a sluggish starter or when you want faster, more vigorous fermentation.',
                 es:'Una cucharada de harina de centeno en la alimentación de tu starter acelera la actividad porque el centeno está cargado de levaduras y enzimas. Ideal para revivir un starter lento o cuando quieres una fermentación más vigorosa.' } },
    { id:'t21', cat:'scoring',      icon:'highlight',
      headline:{ en:'Score deep, not shallow',                     es:'Corta profundo, no superficial' },
      body:    { en:'Too-shallow scoring seals shut in the oven\'s heat. Aim for at least ½ inch (1.3 cm) depth. Deep scores give the bread room to expand and prevent blowouts on the sides where you didn\'t score.',
                 es:'Los cortes demasiado superficiales se sellan en el calor del horno. Apunta a al menos ½ pulgada (1.3 cm) de profundidad. Los cortes profundos dan al pan espacio para expandirse y evitan que reviente por los lados donde no marcaste.' } },
    { id:'t22', cat:'starter',      icon:'loop',
      headline:{ en:'Discard is not waste',                        es:'El descarte no es desperdicio' },
      body:    { en:'Sourdough discard is pre-fermented flour — full of flavor. Use it in pancakes, crackers, waffles, and pizza dough. Many bakers love their discard recipes as much as their actual bread.',
                 es:'El descarte de masa madre es harina prefermentada — llena de sabor. Úsalo en hot cakes, galletas saladas, waffles y masa para pizza. Muchos panaderos aman sus recetas de descarte tanto como su pan.' } },
    { id:'t23', cat:'mindset',      icon:'celebration',
      headline:{ en:'Share your bread',                            es:'Comparte tu pan' },
      body:    { en:'Sourdough is meant to be given away. The joy of handing someone a loaf you made with your own hands is a feeling most bakers cite as one of the best parts of the whole process.',
                 es:'El pan de masa madre está hecho para regalarse. La alegría de entregar una hogaza que hiciste con tus propias manos es un sentimiento que la mayoría de los panaderos citan como una de las mejores partes de todo el proceso.' } },
    { id:'t24', cat:'fermentation', icon:'nightlight',
      headline:{ en:'Cold retard protects your timeline',          es:'El frío protege tu horario' },
      body:    { en:'A long cold proof (8–16 hours in the fridge) means you can bake on YOUR schedule. Shape at 9pm, bake at 7am. The cold stops the clock for you — and makes scoring easier on a firm, cold loaf.',
                 es:'Una fermentación larga en frío (8–16 horas en el refri) significa que puedes hornear según TU horario. Forma a las 9pm, hornea a las 7am. El frío detiene el reloj por ti — y hace más fácil el corte en una hogaza fría y firme.' } },
    { id:'t25', cat:'flour',        icon:'grain',
      headline:{ en:'Protein content matters',                     es:'El contenido de proteína importa' },
      body:    { en:'The protein percentage on your flour bag predicts gluten strength. For sourdough: aim for 12–14% for most loaves. All-purpose at 10% will work but produces a denser, less airy crumb.',
                 es:'El porcentaje de proteína en tu bolsa de harina predice la fuerza del gluten. Para masa madre: apunta a 12–14% para la mayoría de las hogazas. La harina todo uso al 10% funciona pero produce una miga más densa y menos aireada.' } },
    { id:'t26', cat:'scoring',      icon:'gesture',
      headline:{ en:'One stroke, no hesitation',                   es:'Un trazo, sin dudas' },
      body:    { en:'Hesitation in scoring creates drag marks and torn dough. Commit to your score before you touch the dough. One confident motion is always better than a careful, tentative one.',
                 es:'La duda al cortar crea marcas de arrastre y masa rasgada. Comprométete con tu corte antes de tocar la masa. Un movimiento seguro siempre es mejor que uno cuidadoso y tentativo.' } },
    { id:'t27', cat:'starter',      icon:'thermostat',
      headline:{ en:'Warmer = faster, cooler = slower',            es:'Más caliente = más rápido, más frío = más lento' },
      body:    { en:'Your starter behaves very differently at different temperatures. At 65°F it might peak in 10–12 hours. At 78°F it might peak in 4–6 hours. Learning this relationship is the key to predictable bakes.',
                 es:'Tu starter se comporta muy diferente a distintas temperaturas. A 65°F puede alcanzar su pico en 10–12 horas. A 78°F puede lograrlo en 4–6 horas. Aprender esta relación es la clave para horneadas predecibles.' } },
    { id:'t28', cat:'mindset',      icon:'auto_stories',
      headline:{ en:'Keep a bake journal',                         es:'Lleva un diario de horneadas' },
      body:    { en:'The bakers who improve fastest are the ones who write things down. Temperature, timing, how the dough felt, what the crumb looked like. Every note is a data point that makes your next bake smarter.',
                 es:'Los panaderos que mejoran más rápido son los que escriben las cosas. Temperatura, tiempos, cómo se sintió la masa, cómo quedó la miga. Cada nota es un dato que hace más inteligente tu próxima horneada.' } },
    { id:'t29', cat:'fermentation', icon:'pending',
      headline:{ en:'Underproofed is safer than overproofed',      es:'Subfermentada es más segura que sobrefermentada' },
      body:    { en:'An underproofed loaf is dense and gummy but still edible. An overproofed loaf can collapse and spread flat. When in doubt, bake a little early — you\'ll learn to push further on the next bake.',
                 es:'Una hogaza subfermentada es densa y chiclosa pero sigue siendo comestible. Una sobrefermentada puede colapsar y quedar plana. En caso de duda, hornea un poco antes — aprenderás a aguantar más en la siguiente horneada.' } },
    { id:'t30', cat:'flour',        icon:'hub',
      headline:{ en:'Inclusions go in at the end of bulk',         es:'Las inclusiones van al final de la fermentación' },
      body:    { en:'Adding olives, cheese, seeds, or dried fruit too early can weaken gluten development. Add inclusions in the last stretch and fold of bulk fermentation — the dough has already built its structure by then.',
                 es:'Agregar aceitunas, queso, semillas o frutos secos muy pronto puede debilitar el desarrollo del gluten. Agrega las inclusiones en el último estira y dobla de la fermentación en bloque — para entonces la masa ya habrá construido su estructura.' } },
    { id:'t31', cat:'scoring',      icon:'straighten',
      headline:{ en:'Colder dough scores better',                  es:'La masa fría se corta mejor' },
      body:    { en:'Scoring a cold, retarded loaf straight from the fridge is much easier than scoring room-temperature dough. The cold firms the surface, holds its shape, and gives your lame clean resistance.',
                 es:'Cortar una hogaza fría, directo del refri, es mucho más fácil que cortar masa a temperatura ambiente. El frío firma la superficie, mantiene la forma y le da a tu cuchilla una resistencia limpia.' } },
    { id:'t32', cat:'starter',      icon:'water',
      headline:{ en:'Water quality matters more than you think',   es:'La calidad del agua importa más de lo que crees' },
      body:    { en:'Chlorinated tap water can inhibit yeast and bacteria in your starter. If your starter seems sluggish, try filtered water or leave tap water in an open container overnight to let chlorine off-gas.',
                 es:'El agua con cloro puede inhibir la levadura y las bacterias de tu starter. Si tu starter parece lento, prueba con agua filtrada o deja el agua de la llave reposar en un recipiente abierto toda la noche para que el cloro se evapore.' } },
    { id:'t33', cat:'fermentation', icon:'view_comfy',
      headline:{ en:'A bigger bowl shows you more',                es:'Un tazón más grande te muestra más' },
      body:    { en:'Ferment your dough in a clear, straight-sided container. Mark the starting height with a rubber band. Watching the rise gives you visual feedback that no timer can match — you\'ll learn to read fermentation by sight.',
                 es:'Fermenta tu masa en un recipiente claro de lados rectos. Marca la altura inicial con una liga. Ver el crecimiento te da retroalimentación visual que ningún temporizador puede igualar — aprenderás a leer la fermentación con la vista.' } },
    { id:'t34', cat:'mindset',      icon:'local_florist',
      headline:{ en:'Sourdough baking is a practice',              es:'Hornear con masa madre es una práctica' },
      body:    { en:'You don\'t "master" sourdough and then stop learning. Every season, every new flour, every new kitchen is a new variable. The best bakers stay curious. The learning is the point.',
                 es:'No "dominas" la masa madre y luego paras de aprender. Cada temporada, cada harina nueva, cada cocina nueva es una variable nueva. Los mejores panaderos se mantienen curiosos. El aprendizaje es el punto.' } },
    { id:'t35', cat:'flour',        icon:'filter_vintage',
      headline:{ en:'Ancient grains have more flavor',             es:'Los granos ancestrales tienen más sabor' },
      body:    { en:'Einkorn, spelt, and emmer are older wheat varieties with different gluten structures and richer flavor profiles. They ferment faster and create denser loaves — but the flavor is remarkable. Try a 20% substitution first.',
                 es:'El einkorn, la espelta y el emmer son variedades de trigo más antiguas con diferentes estructuras de gluten y perfiles de sabor más ricos. Fermentan más rápido y crean hogazas más densas — pero el sabor es notable. Prueba primero con un 20% de sustitución.' } },
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
    const tip  = TIPS[idx];
    const lang = _lang();
    return { ...tip, headline: tip.headline[lang] || tip.headline.en, body: tip.body[lang] || tip.body.en };
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
    { id: 'stretchFold',   label: { en: 'Stretch & Fold',    es: 'Estira y Dobla'         }, icon: 'gesture',      check: logs => logs.length >= 1 },
    { id: 'coldProof',     label: { en: 'Cold Proof',        es: 'Fermentación en Frío'   }, icon: 'ac_unit',      check: logs => logs.some(l => parseFloat(l.coldProofTime) > 0) },
    { id: 'highHydration', label: { en: 'High Hydration',    es: 'Alta Hidratación'       }, icon: 'water_drop',   check: logs => logs.some(l => parseFloat(l.hydration) >= 75) },
    { id: 'wholeGrain',    label: { en: 'Whole Grain',       es: 'Grano Entero'           }, icon: 'grass',        check: logs => logs.some(l => /whole|wheat|rye|spelt/i.test(l.flourType || '')) },
    { id: 'longFerment',   label: { en: 'Long Ferment',      es: 'Fermentación Larga'     }, icon: 'schedule',     check: logs => logs.some(l => parseFloat(l.coldProofTime) >= 18) },
    { id: 'photoDoc',      label: { en: 'Photo Doc',         es: 'Foto Documentada'       }, icon: 'add_a_photo',  check: logs => logs.some(l => l.photo && l.photo.length > 10) },
    { id: 'fiveStar',      label: { en: '5-Star Quality',    es: 'Calidad 5 Estrellas'    }, icon: 'grade',        check: logs => logs.some(l => parseFloat(l.rating) >= 5) },
    { id: 'consistent',    label: { en: 'Consistency',       es: 'Consistencia'           }, icon: 'bar_chart',    check: logs => logs.length >= 5 && [...logs].sort((a,b)=>new Date(b.date)-new Date(a.date)).slice(0,5).every(l=>parseFloat(l.rating)>=4) },
    { id: 'inclusions',    label: { en: 'Inclusions',        es: 'Inclusiones'            }, icon: 'eco',          check: logs => logs.some(l => /olive|cheese|seed|jalap|rosemary|nut|fruit|herb/i.test((l.inclusions||'')+(l.comments||''))) },
    { id: 'openCrumb',     label: { en: 'Open Crumb',        es: 'Miga Abierta'           }, icon: 'grid_on',      check: logs => logs.some(l => l.crumbType === 'open') },
  ];

  function calculateSkillTree(logs) {
    logs = logs || [];
    const lang = _lang();
    const tree = {};
    SKILL_NODES.forEach(n => {
      tree[n.id] = { ...n, label: n.label[lang] || n.label.en, unlocked: n.check(logs) };
    });
    _set('pym_skill_tree', tree);
    return tree;
  }

  function getSkillNodes() {
    const lang = _lang();
    return SKILL_NODES.map(n => ({ ...n, label: n.label[lang] || n.label.en }));
  }

  // ══════════════════════════════════════════════════════════════════════════
  // STARTER FEEDING REMINDER  (Capacitor LocalNotifications)
  // ══════════════════════════════════════════════════════════════════════════
  async function scheduleStarterReminder(enabled, hour, minute) {
    const NOTIF_ID   = 9001;
    const CHANNEL_ID = 'starter-reminders';
    const h = hour   ?? 8;
    const m = minute ?? 0;
    const settings = { enabled: !!enabled, hour: h, minute: m, lastScheduled: _today() };
    _set('pym_starter_reminder', settings);

    const cap = window.Capacitor?.Plugins?.LocalNotifications;
    if (!cap) return;

    await cap.cancel({ notifications: [{ id: NOTIF_ID }] }).catch(() => {});
    if (!enabled) return;

    // Request permission first — required on Android 13+
    try {
      const perm = await cap.requestPermissions();
      if (perm.display !== 'granted') return;
    } catch (_) { return; }

    // Create a dedicated channel so bake-log.html deleting 'bake-timers' won't kill these
    await cap.createChannel({
      id:          CHANNEL_ID,
      name:        'Starter Feeding Reminders',
      description: 'Daily reminders to feed and check in on your sourdough starter',
      importance:  4,
      vibration:   true,
      sound:       'default',
    }).catch(() => {});

    const starter = getStarterState();
    const name    = starter?.name || (_lang() === 'es' ? 'tu masa madre' : 'your starter');
    const lang    = _lang();
    const messages = lang === 'es' ? [
      `¡${name} tiene hambre! 🫙 Hora de un check-in rápido y darle de comer.`,
      `Es hora de alimentar a ${name} — están contando contigo. 💪`,
      `Un check-in rápido mantiene a ${name} activo. ¿Nos vemos en la cocina?`,
      `¡No olvides a ${name}! Aliméntalo ahora para mantener ese starter fuerte. 🍞`,
    ] : [
      `${name} is hungry! 🫙 Time for a quick check-in and feed.`,
      `Time to feed ${name} — they're counting on you. 💪`,
      `A quick check-in keeps ${name} thriving. See you in the kitchen?`,
      `Don't forget ${name}! Feed now to keep that starter strong. 🍞`,
    ];
    const body = messages[Math.floor(Math.random() * messages.length)];

    const fire = new Date();
    fire.setHours(h, m, 0, 0);
    if (fire <= new Date()) fire.setDate(fire.getDate() + 1);

    await cap.schedule({ notifications: [{
      id:        NOTIF_ID,
      title:     'Pancito y Más 🍞',
      body,
      channelId: CHANNEL_ID,
      sound:     'default',
      schedule:  {
        at:      fire,
        repeats: true,
        every:   'day',
      },
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

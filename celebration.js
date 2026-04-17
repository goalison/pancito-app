// ═══════════════════════════════════════════════════════════════════════════
// Pancito y Más — Celebration Engine  (celebration.js)
// Requires: gamification.js to be loaded first
// Usage: PymCelebration.trigger('badge_id') or PymCelebration.checkUnseen()
// ═══════════════════════════════════════════════════════════════════════════

(function () {
  'use strict';

  const PARTICLE_COLORS = ['#ffb967', '#C4863A', '#875305', '#fef9ef', '#d6c3b3', '#ffdd99'];

  // ── Inject required styles once ───────────────────────────────────────────
  function _injectStyles() {
    if (document.getElementById('pym-celebration-css')) return;
    const s = document.createElement('style');
    s.id = 'pym-celebration-css';
    s.textContent = `
      .pym-particle {
        position: fixed;
        border-radius: 50%;
        pointer-events: none;
        z-index: 9999;
        will-change: transform, opacity;
        animation: pym-float-up var(--dur, 2.5s) var(--delay, 0s) ease-out forwards;
      }
      @keyframes pym-float-up {
        0%   { opacity: 1;   transform: translateY(0)     rotate(0deg)   scale(1);   }
        100% { opacity: 0;   transform: translateY(-340px) rotate(720deg) scale(0.2); }
      }
      .pym-achievement-overlay {
        position: fixed; inset: 0; z-index: 9998;
        background: rgba(44,24,16,0.55); backdrop-filter: blur(3px);
        display: flex; align-items: center; justify-content: center; padding: 24px;
        animation: pym-fade-in 0.3s ease;
      }
      @keyframes pym-fade-in { from { opacity: 0; } to { opacity: 1; } }
      .pym-achievement-card {
        background: #fef9ef;
        border-radius: 2rem;
        max-width: 320px;
        width: 100%;
        padding: 2.5rem 2rem 2rem;
        text-align: center;
        box-shadow: 0 24px 64px rgba(135,83,5,0.25);
        animation: pym-card-in 0.4s cubic-bezier(0.34,1.56,0.64,1);
        font-family: 'Plus Jakarta Sans', sans-serif;
      }
      @keyframes pym-card-in { from { transform: scale(0.7); opacity: 0; } to { transform: scale(1); opacity: 1; } }
      .pym-badge-icon-wrap {
        width: 88px; height: 88px;
        background: linear-gradient(135deg, #875305, #C4863A);
        border-radius: 50%;
        display: flex; align-items: center; justify-content: center;
        margin: 0 auto 1.25rem;
        box-shadow: 0 8px 24px rgba(135,83,5,0.35);
      }
      .pym-achievement-card .material-symbols-outlined {
        font-size: 42px; color: #fef9ef;
        font-variation-settings: 'FILL' 1, 'wght' 400;
      }
      .pym-unlock-label {
        font-size: 10px; font-weight: 700; letter-spacing: 0.2em;
        text-transform: uppercase; color: #C4863A; margin-bottom: 0.5rem;
      }
      .pym-badge-name {
        font-family: 'Noto Serif', serif; font-weight: 700; font-size: 1.5rem;
        color: #1d1c16; margin-bottom: 0.5rem; line-height: 1.2;
      }
      .pym-badge-story {
        font-size: 0.8125rem; color: #514538; line-height: 1.65;
        margin-bottom: 1.5rem;
      }
      .pym-dismiss-btn {
        width: 100%; padding: 0.875rem;
        background: #875305; color: #fff;
        border-radius: 1rem; font-weight: 700; font-size: 0.875rem;
        border: none; cursor: pointer; transition: transform 0.15s;
        font-family: 'Plus Jakarta Sans', sans-serif;
      }
      .pym-dismiss-btn:active { transform: scale(0.96); }
    `;
    document.head.appendChild(s);
  }

  // ── Particle burst ────────────────────────────────────────────────────────
  function _spawnParticles(count) {
    count = count || 40;
    for (let i = 0; i < count; i++) {
      setTimeout(() => {
        const el = document.createElement('div');
        el.className = 'pym-particle';
        const size  = 5 + Math.random() * 12;
        const color = PARTICLE_COLORS[Math.floor(Math.random() * PARTICLE_COLORS.length)];
        const dur   = 1.8 + Math.random() * 1.2;
        const delay = Math.random() * 0.6;
        el.style.cssText = `
          width:${size}px; height:${size}px;
          left:${10 + Math.random() * 80}%;
          top:${40 + Math.random() * 30}%;
          background:${color};
          border-radius:${Math.random() > 0.4 ? '50%' : '3px'};
          --dur:${dur}s; --delay:${delay}s;
        `;
        document.body.appendChild(el);
        setTimeout(() => el.remove(), (dur + delay + 0.5) * 1000);
      }, i * 25);
    }
  }

  // ── Achievement modal ─────────────────────────────────────────────────────
  function _showModal(badgeId, onDismiss) {
    const def = window.PymGamification?.getBadgeDef(badgeId);
    if (!def) { if (onDismiss) onDismiss(); return; }

    const overlay = document.createElement('div');
    overlay.className = 'pym-achievement-overlay';
    overlay.innerHTML = `
      <div class="pym-achievement-card">
        <p class="pym-unlock-label">🎉 Badge Unlocked</p>
        <div class="pym-badge-icon-wrap">
          <span class="material-symbols-outlined">${def.icon}</span>
        </div>
        <div class="pym-badge-name">${def.name}</div>
        <div class="pym-badge-story">${def.story}</div>
        <button class="pym-dismiss-btn" id="pymDismissBtn">Keep baking →</button>
      </div>`;
    document.body.appendChild(overlay);

    const dismiss = () => {
      if (window.PymGamification) PymGamification.markAchievementSeen(badgeId);
      overlay.style.animation = 'pym-fade-in 0.2s ease reverse forwards';
      setTimeout(() => { overlay.remove(); if (onDismiss) onDismiss(); }, 200);
    };

    document.getElementById('pymDismissBtn').addEventListener('click', dismiss);
    overlay.addEventListener('click', e => { if (e.target === overlay) dismiss(); });
  }

  // ── Sequential trigger ────────────────────────────────────────────────────
  function _triggerSequence(ids, idx) {
    if (idx >= ids.length) return;
    _spawnParticles(35);
    setTimeout(() => {
      _showModal(ids[idx], () => {
        setTimeout(() => _triggerSequence(ids, idx + 1), 300);
      });
    }, 400);
  }

  // ── Public API ────────────────────────────────────────────────────────────
  function trigger(badgeIdOrArray) {
    _injectStyles();
    const ids = Array.isArray(badgeIdOrArray) ? badgeIdOrArray : [badgeIdOrArray];
    if (ids.length === 0) return;
    _triggerSequence(ids, 0);
  }

  function checkUnseen() {
    if (!window.PymGamification) return;
    _injectStyles();
    const unseen = PymGamification.getUnseenAchievements();
    if (unseen.length > 0) {
      setTimeout(() => _triggerSequence(unseen, 0), 600);
    }
  }

  window.PymCelebration = { trigger, checkUnseen };

})();

// ═══════════════════════════════════════════════════════════════════════════
// Pancito y Más — Local Usage Events Module  (events.js)
// Lightweight local-only event counters — NOT a third-party analytics SDK.
// Stored via PymStorage (storage.js) under a single pym_event_counts key so
// it survives OS-level localStorage wipes the same way other pym_* data does.
// No reporting UI yet — Alison (or a future Claude Code session) queries this
// directly, e.g. via window.PymEvents.getCounts() in a WebView devtools console.
// ═══════════════════════════════════════════════════════════════════════════

(function () {
  'use strict';

  var KEY = 'pym_event_counts';

  function _read() {
    if (window.PymStorage) return window.PymStorage.get(KEY, {}) || {};
    try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (_) { return {}; }
  }

  function _write(data) {
    if (window.PymStorage) { window.PymStorage.set(KEY, data); return; }
    try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (_) {}
  }

  // track('tabs', 'view-library') -> counts[category][name]++
  function track(category, name) {
    if (!category || !name) return;
    try {
      var data = _read();
      if (!data[category]) data[category] = {};
      data[category][name] = (data[category][name] || 0) + 1;
      _write(data);
    } catch (_) {}
  }

  function trackTab(viewId) { track('tabs', viewId); }
  function trackLibraryOpen(pageKey) { track('library', pageKey); }
  function trackBake(name) { track('bake', name); } // 'started' | 'completed'

  function getCounts() { return _read(); }

  window.PymEvents = {
    track: track,
    trackTab: trackTab,
    trackLibraryOpen: trackLibraryOpen,
    trackBake: trackBake,
    getCounts: getCounts
  };
})();

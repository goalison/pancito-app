// ═══════════════════════════════════════════════════════════════════════════
// Pancito y Más — Storage Module  (storage.js)
// Loaded before i18n.js/gamification.js on every page that reads or writes
// durable pym_* user data (app.html, onboarding.html).
//
// WHY THIS EXISTS: localStorage on Android WebViews can be cleared by the OS
// under storage pressure, app-data-clear, or certain WebView upgrades —
// unlike native SharedPreferences (what @capacitor/preferences is backed
// by), which Android treats as durable app data. This module keeps every
// call site's synchronous get/set API unchanged (see gamification.js's
// _get/_set, which now just delegate here) while transparently mirroring
// durable data into Preferences in the background.
//
// ARCHITECTURE:
//   - An in-memory cache backs every get()/set() call — always synchronous,
//     so no call site anywhere needs to change from sync to async.
//   - localStorage is the synchronous seed/shadow: set() writes there
//     immediately (instant, used to hydrate the cache on next page load —
//     a fresh page load has no in-memory cache yet); get() falls back to it
//     on a cache miss.
//   - On native platforms, set() ALSO fires an async, best-effort
//     Preferences.set() to persist durably. This never blocks the caller.
//   - On boot, `ready` (a Promise) resolves once the module has reconciled
//     with Preferences: on a device's very first run of this version, it
//     seeds Preferences from whatever's already in localStorage (existing
//     installs upgrading from a pre-Preferences build); on every run after
//     that, it pulls Preferences' values back into the cache/localStorage
//     shadow — this is what actually recovers data if localStorage was
//     wiped by the OS but Preferences survived. Callers that render UI from
//     managed keys at boot (the app.html gate, dashboard render) should
//     `await window.PymStorage.ready` first so they never render from
//     stale/missing data in that recovery scenario.
//   - Ephemeral in-progress-bake timer/session state (pym_active_bake,
//     pym_bulk_start/_end, pym_round_active, pym_alarm_pending, etc.) is
//     deliberately EXCLUDED from Preferences — it's high-frequency-write,
//     single-session scratch state; round-tripping it through the native
//     bridge on every timer tick would be wasteful, and losing an
//     in-progress timer is mildly annoying, not the data-loss this module
//     exists to prevent. Those keys keep using plain localStorage directly,
//     unchanged, exactly as before.
// ═══════════════════════════════════════════════════════════════════════════

(function () {
  'use strict';

  var MANAGED_PREFIX = 'pym_';
  // Ephemeral keys are intentionally NOT mirrored to Preferences (see header).
  var EXCLUDED_KEYS = {
    'pym_active_bake': 1,
    'pym_bulk_start': 1, 'pym_bulk_end': 1,
    'pym_cold_proof_start': 1, 'pym_cold_proof_end': 1,
    'pym_bake_start': 1, 'pym_bake_end': 1,
    'pym_rest_start': 1, 'pym_rest_paused': 1, 'pym_rest_done': 1,
    'pym_round_active': 1, 'pym_rounds_done': 1,
    'pym_static_timer': 1,
    'pym_alarm_pending': 1, 'pym_pending_alarm': 1,
    'pym_feedcheckin_cleanup_done': 1,
    'pym_prefs_migrated': 1 // the migration flag itself — no need to mirror it
  };

  function isManagedKey(key) {
    return typeof key === 'string' && key.indexOf(MANAGED_PREFIX) === 0 && !EXCLUDED_KEYS[key];
  }

  // ── Safe localStorage handle (Safari private mode etc. fall back to memory) ─
  var _memFallback = {};
  var _ls = (function () {
    try { localStorage.setItem('__pymstore_probe__', '1'); localStorage.removeItem('__pymstore_probe__'); return localStorage; }
    catch (_) {
      return {
        getItem: function (k) { return _memFallback.hasOwnProperty(k) ? _memFallback[k] : null; },
        setItem: function (k, v) { _memFallback[k] = v; },
        removeItem: function (k) { delete _memFallback[k]; },
        key: function (i) { return Object.keys(_memFallback)[i] || null; },
        get length() { return Object.keys(_memFallback).length; }
      };
    }
  })();

  var _isNative = !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
  var _prefs = (_isNative && window.Capacitor.Plugins && window.Capacitor.Plugins.Preferences) || null;

  var _cache = {};

  function _tryParse(raw) {
    if (raw == null) return null;
    try { return JSON.parse(raw); } catch (_) { return raw; }
  }

  function get(key, fallback) {
    if (Object.prototype.hasOwnProperty.call(_cache, key)) return _cache[key];
    var raw = null;
    try { raw = _ls.getItem(key); } catch (_) {}
    var val = raw != null ? _tryParse(raw) : (fallback !== undefined ? fallback : null);
    _cache[key] = val;
    return val;
  }

  function set(key, value) {
    _cache[key] = value;
    try { _ls.setItem(key, JSON.stringify(value)); } catch (_) {}
    if (_prefs && isManagedKey(key)) {
      try { _prefs.set({ key: key, value: JSON.stringify(value) }).catch(function () {}); } catch (_) {}
    }
  }

  function remove(key) {
    delete _cache[key];
    try { _ls.removeItem(key); } catch (_) {}
    if (_prefs && isManagedKey(key)) {
      try { _prefs.remove({ key: key }).catch(function () {}); } catch (_) {}
    }
  }

  function _collectManagedLocalStorageKeys() {
    var out = [];
    try {
      for (var i = 0; i < _ls.length; i++) {
        var k = _ls.key(i);
        if (isManagedKey(k)) out.push(k);
      }
    } catch (_) {}
    return out;
  }

  // ── One-time migration + native reconciliation (async, best-effort) ────────
  // localStorage remains authoritative if any of this fails — this is a
  // durability *upgrade*, never a regression path.
  var ready = (function () {
    if (!_prefs) return Promise.resolve(); // web dev fallback — localStorage is already the whole story
    return (async function () {
      try {
        var migrated = _ls.getItem('pym_prefs_migrated') === 'true';
        if (!migrated) {
          // First run of this version: seed Preferences from whatever's
          // already in localStorage (existing installs upgrading).
          var keys = _collectManagedLocalStorageKeys();
          for (var i = 0; i < keys.length; i++) {
            var k = keys[i];
            var raw = _ls.getItem(k);
            if (raw != null) { await _prefs.set({ key: k, value: raw }); }
          }
          _ls.setItem('pym_prefs_migrated', 'true');
        } else {
          // Every subsequent run: pull Preferences back into the cache and
          // the localStorage shadow. This is the actual recovery path if
          // localStorage was cleared by the OS but Preferences survived.
          var listed = await _prefs.keys();
          var pKeys = (listed && listed.keys) || [];
          for (var j = 0; j < pKeys.length; j++) {
            var pk = pKeys[j];
            if (!isManagedKey(pk)) continue;
            var res = await _prefs.get({ key: pk });
            if (res && res.value != null) {
              _cache[pk] = _tryParse(res.value);
              try { _ls.setItem(pk, res.value); } catch (_) {}
            }
          }
        }
      } catch (_) {
        // Best-effort. localStorage (already hydrated synchronously via get())
        // remains authoritative if Preferences is unavailable or errors.
      }
    })();
  })();

  window.PymStorage = { get: get, set: set, remove: remove, ready: ready, isManagedKey: isManagedKey };
})();

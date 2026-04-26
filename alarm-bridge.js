// alarm-bridge.js
// Included in every HTML page. When a bake alarm notification is tapped,
// this script sets a localStorage flag and navigates to bake-log.html so
// the alarm can play — regardless of which page was active at the time.
(function () {
  'use strict';
  const IS_NATIVE = !!(window.Capacitor?.isNativePlatform?.());
  if (!IS_NATIVE) return;

  function _handleAlarmTap() {
    try { localStorage.setItem('pym_pending_alarm', '1'); } catch (e) {}
    // Already on bake-log — nothing to redirect; bake-log's own listener handles it
    if (window.location.pathname.replace(/\\/g, '/').endsWith('bake-log.html')) return;
    window.location.href = 'bake-log.html';
  }

  // Register as early as possible — Capacitor bridge is available before DOMContentLoaded
  function _register() {
    try {
      window.Capacitor.Plugins.LocalNotifications.addListener(
        'localNotificationActionPerformed',
        function (ev) {
          const ch = ev && ev.notification && ev.notification.channelId;
          if (!ch) return;
          if (ch === 'bake-alarms-v3' || ch.startsWith('bake-alarm') || ch.startsWith('starter')) {
            _handleAlarmTap();
          }
        }
      );
    } catch (e) {}
  }

  // Capacitor bridge is synchronous in the WebView — call immediately
  _register();
})();

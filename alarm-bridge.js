// alarm-bridge.js
// Included in app.html. When a bake alarm notification is tapped,
// this script sets a localStorage flag and calls showView('view-bake')
// so the bake view appears without a page reload.
(function () {
  'use strict';
  const IS_NATIVE = !!(window.Capacitor?.isNativePlatform?.());
  if (!IS_NATIVE) return;

  function _handleAlarmTap() {
    try { localStorage.setItem('pym_pending_alarm', '1'); } catch (e) {}
    if (typeof showView === 'function') {
      showView('view-bake');
    } else {
      window.location.href = 'app.html';
    }
  }

  // Register as early as possible — Capacitor bridge is available before DOMContentLoaded
  function _register() {
    try {
      window.Capacitor.Plugins.LocalNotifications.addListener(
        'localNotificationActionPerformed',
        function (ev) {
          const ch = ev && ev.notification && ev.notification.channelId;
          if (!ch) return;
          if (ch === 'bake-alarms-v3' || ch.startsWith('bake-alarm')) {
            _handleAlarmTap();
          }
        }
      );
    } catch (e) {}
  }

  // Capacitor bridge is synchronous in the WebView — call immediately
  _register();
})();

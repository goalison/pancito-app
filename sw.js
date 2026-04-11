// Pancito y Más — Service Worker
// Handles background alarm notifications so timers fire even when the phone is locked.

'use strict';

const alarms = {}; // { id: timeoutId }

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

// ── Receive messages from the main page ──────────────────────────────────────
self.addEventListener('message', (event) => {
    const data = event.data;
    if (!data || !data.type) return;

    if (data.type === 'SET_ALARM') {
        const { id, label, endTime } = data;
        // Cancel any previous alarm with this id
        if (alarms[id]) { clearTimeout(alarms[id]); delete alarms[id]; }

        const delay = endTime - Date.now();
        if (delay <= 0) {
            // Already expired — fire immediately
            fireNotification(id, label);
        } else {
            alarms[id] = setTimeout(() => {
                fireNotification(id, label);
                delete alarms[id];
            }, delay);
        }
    }

    if (data.type === 'CANCEL_ALARM') {
        const { id } = data;
        if (alarms[id]) { clearTimeout(alarms[id]); delete alarms[id]; }
    }
});

function fireNotification(id, label) {
    self.registration.showNotification('🍞 Pancito y Más', {
        body: `${label} — timer finished!`,
        icon: './logo.png',
        badge: './logo.png',
        vibrate: [200, 100, 200, 100, 400],
        tag: id,
        requireInteraction: true,
        actions: [{ action: 'open', title: 'Open Bake Log' }]
    }).catch(() => {});
}

// ── Tap notification → open the app ─────────────────────────────────────────
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    event.waitUntil(
        self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            for (const client of clientList) {
                if (client.url.includes('bake-log') && 'focus' in client) {
                    return client.focus();
                }
            }
            return self.clients.openWindow('./bake-log.html');
        })
    );
});

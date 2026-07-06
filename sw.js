// Pancito y Más — Service Worker
// Alarms are persisted in IndexedDB so they survive the SW being killed by the browser.
// On every SW startup (install, activate, or fetch wake-up), we check for missed/pending alarms.

'use strict';

const DB_NAME    = 'pym-alarms';
const DB_VERSION = 1;
const STORE      = 'alarms';

// ── IndexedDB helpers ────────────────────────────────────────────────────────

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      e.target.result.createObjectStore(STORE, { keyPath: 'id' });
    };
    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror   = (e) => reject(e.target.error);
  });
}

async function saveAlarm(id, label, endTime) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put({ id, label, endTime });
    tx.oncomplete = resolve;
    tx.onerror    = (e) => reject(e.target.error);
  });
}

async function deleteAlarm(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).delete(id);
    tx.oncomplete = resolve;
    tx.onerror    = (e) => reject(e.target.error);
  });
}

async function getAllAlarms() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = (e) => resolve(e.target.result || []);
    req.onerror   = (e) => reject(e.target.error);
  });
}

// ── In-memory timeout handles (supplemental — IndexedDB is authoritative) ────

const activeTimeouts = {};

function scheduleTimeout(id, label, endTime) {
  if (activeTimeouts[id]) clearTimeout(activeTimeouts[id]);
  const delay = Math.max(0, endTime - Date.now());
  activeTimeouts[id] = setTimeout(async () => {
    delete activeTimeouts[id];
    await fireNotification(id, label);
    await deleteAlarm(id).catch(() => {});
  }, delay);
}

// ── On SW startup, replay any alarms stored in IndexedDB ─────────────────────

// Guard against concurrent runs: this is called from every fetch event, so a page
// load triggers many overlapping calls — without the guard an expired alarm can be
// fired several times before its delete commits.
let _checkingAlarms = false;
async function checkStoredAlarms() {
  if (_checkingAlarms) return;
  _checkingAlarms = true;
  try {
    let alarms;
    try { alarms = await getAllAlarms(); } catch (e) { return; }
    const now = Date.now();
    for (const alarm of alarms) {
      if (alarm.endTime <= now) {
        // Alarm already passed while SW was dead — delete first so a failure
        // can't replay it, then fire it once
        await deleteAlarm(alarm.id).catch(() => {});
        await fireNotification(alarm.id, alarm.label).catch(() => {});
      } else {
        // Still in the future — reschedule the timeout
        scheduleTimeout(alarm.id, alarm.label, alarm.endTime);
      }
    }
  } finally {
    _checkingAlarms = false;
  }
}

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => {
  e.waitUntil(
    self.clients.claim().then(() => checkStoredAlarms())
  );
});

// Also check on fetch so the SW stays alive and catches alarms even on quiet pages
self.addEventListener('fetch', (e) => {
  // Let the browser handle the request; we just use the event to stay alive
  // and replay any alarms that might have been missed.
  checkStoredAlarms().catch(() => {});
});

// ── Receive messages from the main page ──────────────────────────────────────

self.addEventListener('message', async (event) => {
  const data = event.data;
  if (!data || !data.type) return;

  if (data.type === 'SET_ALARM') {
    const { id, label, endTime } = data;
    // Persist first so the alarm survives if SW is killed before it fires
    await saveAlarm(id, label, endTime).catch(() => {});
    scheduleTimeout(id, label, endTime);
  }

  if (data.type === 'CANCEL_ALARM') {
    const { id } = data;
    if (activeTimeouts[id]) { clearTimeout(activeTimeouts[id]); delete activeTimeouts[id]; }
    await deleteAlarm(id).catch(() => {});
  }
});

// ── Fire a browser notification ───────────────────────────────────────────────

function fireNotification(id, label) {
  return self.registration.showNotification('🍞 Pancito y Más', {
    body: `${label} — timer finished!`,
    icon: './logo.png',
    badge: './logo.png',
    vibrate: [200, 100, 200, 100, 400],
    tag: id,
    requireInteraction: true,
    actions: [{ action: 'open', title: 'Open Bake Log' }]
  }).catch(() => {});
}

// ── Tap notification → open/focus the app ────────────────────────────────────

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) return client.focus();
      }
      return self.clients.openWindow('./app.html');
    })
  );
});

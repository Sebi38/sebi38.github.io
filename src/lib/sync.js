import { db, ROOT } from './firebase.js';
import { ld, arrayToFbObj, NODE_MAP } from './storage.js';
import { runSeedsIfNeeded } from './seeds.js';

// Pull the whole database into localStorage, which is what the UI renders from.
// On a first run against an empty database, push whatever is already in
// localStorage up first so nothing is lost.
export async function loadFirebaseToLocal() {
  const existing = await db.ref(`${ROOT}/data`).once('value');

  if (!existing.val()) {
    const migration = {};
    Object.entries(NODE_MAP).forEach(([node, storageKey]) => {
      const local = ld(storageKey);
      if (Array.isArray(local) && local.length > 0) {
        migration[node] = arrayToFbObj(local);
      }
    });
    if (Object.keys(migration).length > 0) {
      await db.ref(`${ROOT}/data`).set(migration);
    }
  }

  await runSeedsIfNeeded();

  const data = (await db.ref(`${ROOT}/data`).once('value')).val() || {};
  Object.entries(NODE_MAP).forEach(([node, storageKey]) => {
    const rows = data[node];
    if (!rows) return;
    const arr = Object.entries(rows).map(([id, val]) => ({ ...val, id }));
    localStorage.setItem(storageKey, JSON.stringify(arr));
  });
}

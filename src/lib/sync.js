import { db, ROOT } from './firebase.js';
import { ld, sv, arrayToFbObj, mergeRows, pendingFor, NODE_MAP } from './storage.js';
import { runSeedsIfNeeded } from './seeds.js';
import { readOnce } from './net.js';

// Pull the database into localStorage, which is what the UI renders from.
// On a first run against an empty database, push whatever is already in
// localStorage up first so nothing is lost.
//
// This used to overwrite localStorage outright. That quietly destroyed anything
// entered while offline: a write attempted with no signal never reaches the
// database, and the next load replaced the local copy with the older remote
// one. Match-day logging happens at pitches with poor signal, so the numbers
// most likely to be lost were the ones taken live.
//
// Now each collection is merged row by row — see mergeRows — and anything this
// device still owes the database is pushed straight back up.
export async function loadFirebaseToLocal() {
  const existing = await readOnce(db.ref(`${ROOT}/data`));

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

  const data = (await readOnce(db.ref(`${ROOT}/data`))).val() || {};
  Object.entries(NODE_MAP).forEach(([node, storageKey]) => {
    const pending = pendingFor(node);
    const rows = data[node];
    if (!rows && !pending) return;

    const remote = rows ? Object.entries(rows).map(([id, val]) => ({ ...val, id })) : [];
    const local = ld(storageKey) || [];
    const merged = mergeRows(local, remote, pending);

    if (pending) {
      // Writing it back both stores the merge locally and re-sends what the
      // database is missing; the outbox clears once that lands.
      sv(storageKey, merged, { stamp: false });
    } else {
      localStorage.setItem(storageKey, JSON.stringify(merged));
    }
  });
}

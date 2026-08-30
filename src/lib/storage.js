import { db, ROOT } from './firebase.js';
import { SK, SK_TO_FB } from '../config.js';
import { stampChanged, removedIds, mergeRows, clean } from './merge.js';

export { mergeRows };

export const gid = () =>
  Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

// Read from localStorage (the synchronous cache the UI renders from).
export function ld(key) {
  try {
    const v = localStorage.getItem(key);
    return v ? JSON.parse(v) : null;
  } catch {
    return null;
  }
}

// ── The outbox ───────────────────────────────────────────────────────────────
// Writes used to be fire-and-forget: `set(...).catch(console.error)`. At a pitch
// with no signal that promise never settles, and the next visit overwrote
// localStorage from the database — so goals and shots tapped in during a match
// were simply gone, while the app said "anything you enter is kept and syncs
// when you're back online".
//
// Now every write marks its node as unsynced until the database confirms it,
// and a node with unsynced work wins over the database on the next load.
const OUTBOX_KEY = 'seb38-outbox';

const readOutbox = () => {
  try { return JSON.parse(localStorage.getItem(OUTBOX_KEY)) || {}; } catch { return {}; }
};
const writeOutbox = o => {
  try { localStorage.setItem(OUTBOX_KEY, JSON.stringify(o)); } catch (e) { console.error(e); }
};

// Which nodes are still waiting on the database.
export const pendingFor = node => readOutbox()[node] || null;
export const pendingNodes = () => Object.keys(readOutbox());

// `seq` guards against an older write clearing a newer one's flag: only the
// most recent write for a node may mark it clean.
function markPending(node, deleted = []) {
  const o = readOutbox();
  const prev = o[node] || { seq: 0, deleted: [] };
  const seq = prev.seq + 1;
  const ids = [...new Set([...(prev.deleted || []), ...deleted])].slice(-500);
  o[node] = { seq, deleted: ids };
  writeOutbox(o);
  return seq;
}

function clearPending(node, seq) {
  const o = readOutbox();
  if (o[node] && o[node].seq === seq) {
    delete o[node];
    writeOutbox(o);
  }
}

// Write to localStorage AND mirror up to Firebase.
// `stamp: false` for a write that is only reconciling what the database already
// has, so merged-in rows don't look freshly edited.
export function sv(key, value, { stamp = true } = {}) {
  const node = SK_TO_FB[key];
  let rows = value;
  let deleted = [];

  if (node && Array.isArray(value)) {
    const prev = ld(key);
    if (stamp) rows = stampChanged(prev, value);
    deleted = removedIds(prev, rows);
  }

  try {
    localStorage.setItem(key, JSON.stringify(rows));
  } catch (e) {
    console.error(e);
  }
  if (!node) return;

  const payload = clean(Array.isArray(rows) ? arrayToFbObj(rows) : rows);
  const seq = markPending(node, deleted);
  try {
    db.ref(`${ROOT}/data/${node}`).set(payload)
      .then(() => clearPending(node, seq))
      .catch(e => console.warn(`Saved on this device, waiting to sync: ${node}`, e?.message || e));
  } catch (e) {
    console.warn(`Saved on this device, waiting to sync: ${node}`, e?.message || e);
  }
}

// Re-send every node that is still waiting. Called when the connection returns.
export function flushOutbox() {
  return Promise.all(pendingNodes().map(node => {
    const key = NODE_MAP[node];
    const rows = key && ld(key);
    if (!Array.isArray(rows)) return Promise.resolve();
    const seq = markPending(node);
    return db.ref(`${ROOT}/data/${node}`).set(clean(arrayToFbObj(rows)))
      .then(() => clearPending(node, seq))
      .catch(() => {});
  }));
}

// Firebase stores collections as {id: row}; the UI wants [{...row, id}].
export function fbSnapToArray(snap) {
  const v = snap.val();
  if (!v) return [];
  return Object.entries(v).map(([id, item]) => ({ ...item, id }));
}

export function arrayToFbObj(arr) {
  return arr.reduce((acc, item) => {
    acc[item.id] = item;
    return acc;
  }, {});
}

// localStorage key <-> Firebase node, for bulk sync.
const NODE_MAP = {
  games: SK.games,
  highlights: SK.highlights,
  training: SK.training,
  trainRes: SK.trainRes,
  coaching: SK.coaching,
  journal: SK.journal,
  stats: SK.stats,
};

export { NODE_MAP };

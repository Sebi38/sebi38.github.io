import { db, ROOT } from './firebase.js';
import { SK, SK_TO_FB } from '../config.js';

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

// Write to localStorage AND mirror up to Firebase.
export function sv(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error(e);
  }
  const node = SK_TO_FB[key];
  if (!node) return;
  const payload = Array.isArray(value) ? arrayToFbObj(value) : value;
  db.ref(`${ROOT}/data/${node}`).set(payload).catch(console.error);
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

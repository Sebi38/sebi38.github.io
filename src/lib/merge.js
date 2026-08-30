// Reconciling two copies of a collection: the one in this browser and the one
// in the database. Pure functions, no Firebase — see storage.js for the I/O.
//
// This exists because writes used to be fire-and-forget and loads overwrote
// localStorage outright. At a pitch with no signal that combination silently
// destroyed whatever had just been logged.

// Two rows are the same if everything but the stamp matches.
const sameRow = (a, b) => {
  if (!a || !b) return false;
  const { updatedAt: _x, ...ra } = a;
  const { updatedAt: _y, ...rb } = b;
  return JSON.stringify(ra) === JSON.stringify(rb);
};

// Stamp the rows that actually changed, so a merge can tell which copy is
// newer without comparing whole objects.
export function stampChanged(prev, next, now = Date.now()) {
  const before = new Map((prev || []).map(r => [r.id, r]));
  return next.map(r => {
    const was = before.get(r.id);
    return sameRow(was, r) ? { ...r, updatedAt: was.updatedAt ?? now } : { ...r, updatedAt: now };
  });
}

// Ids present before and gone now.
export function removedIds(prev, next) {
  const live = new Set(next.map(r => r.id));
  return (prev || []).map(r => r.id).filter(id => id && !live.has(id));
}

// Merge one collection, row by row.
//
// `pending` is this device's outbox entry for the collection — present only
// when there are local writes the database has not confirmed. It changes two
// things: rows that exist only here are kept (they are the unsent ones rather
// than rows deleted elsewhere), and ids deleted here stay deleted.
//
// Where a row exists on both sides the newer stamp wins, so two devices editing
// different matches in the same season both survive.
export function mergeRows(local = [], remote = [], pending = null) {
  const out = new Map(remote.filter(r => r?.id).map(r => [r.id, r]));
  const gone = new Set(pending?.deleted || []);
  gone.forEach(id => out.delete(id));

  for (const l of local) {
    if (!l?.id || gone.has(l.id)) continue;
    const r = out.get(l.id);
    if (!r) { if (pending) out.set(l.id, l); continue; }
    if ((l.updatedAt || 0) > (r.updatedAt || 0)) out.set(l.id, l);
  }
  return [...out.values()];
}

// Firebase rejects `undefined`, and it throws synchronously — which would take
// the whole save down with it. Drop those keys instead.
export function clean(value) {
  if (Array.isArray(value)) return value.map(clean);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).filter(([, v]) => v !== undefined).map(([k, v]) => [k, clean(v)])
    );
  }
  return value;
}

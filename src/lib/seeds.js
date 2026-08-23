import { db, ROOT } from './firebase.js';
import { SEED_BATCHES } from '../data/seasons.js';
import { fbSnapToArray, arrayToFbObj } from './storage.js';
import { readOnce } from './net.js';
import { surfaceForVenue } from '../data/venues.js';
import { toMoments } from './moments.js';

const seedRef = key => db.ref(`${ROOT}/seeds/${key}`);
const dataRef = node => db.ref(`${ROOT}/data/${node}`);

// Prepend `rows` to a collection, once, guarded by a seed flag.
async function seedOnce(seedKey, node, rows, alreadyRun) {
  if (alreadyRun[seedKey] || !rows?.length) return;
  const existing = fbSnapToArray(await readOnce(dataRef(node)));
  await dataRef(node).set(arrayToFbObj([...rows, ...existing]));
  await seedRef(seedKey).set(true);
}

// One-off migration from the original single-file app: link the seeded Spring
// 2026 journal entries to their matching stat rows. Kept verbatim so the flag
// stays meaningful for databases that have already run it.
async function linkSpring26Journal(alreadyRun) {
  if (alreadyRun['spring26-link']) return;
  const entries = fbSnapToArray(await readOnce(dataRef('journal')));
  const linkMap = Object.fromEntries(
    Array.from({ length: 9 }, (_, i) => [`spj26-${i + 1}`, `sp26-${i + 1}`])
  );
  await dataRef('journal').set(
    arrayToFbObj(entries.map(e => (linkMap[e.id] ? { ...e, statId: linkMap[e.id] } : e)))
  );
  await seedRef('spring26-link').set(true);
}

// The Spring 2026 rows were seeded with position "CM", which was a placeholder
// in the original single-file app rather than something anyone observed — he
// played centre back. Corrects only rows still holding that untouched default,
// so anything since edited by hand is left alone.
async function fixSpring26Positions(alreadyRun) {
  if (alreadyRun['sp26-position-cb']) return;
  for (const node of ['stats', 'journal']) {
    const rows = fbSnapToArray(await readOnce(dataRef(node)));
    let changed = 0;
    const next = rows.map(r => {
      const isSpring26 = (r.id || '').startsWith('sp26-') || (r.id || '').startsWith('spj26-');
      if (!isSpring26 || r.position !== 'CM' || r.positions?.length) return r;
      changed += 1;
      return { ...r, position: 'CB' };
    });
    if (changed > 0) await dataRef(node).set(arrayToFbObj(next));
  }
  await seedRef('sp26-position-cb').set(true);
}

// Every journal entry was seeded with surface "grass", which was a default
// rather than an observation — most of these grounds are turf. Applies the
// confirmed venue surfaces from src/data/venues.js. Grounds not yet confirmed
// are left untouched rather than guessed at.
async function applyVenueSurfaces(alreadyRun) {
  if (alreadyRun['venue-surface-1']) return;
  const rows = fbSnapToArray(await readOnce(dataRef('journal')));
  let changed = 0;
  const next = rows.map(r => {
    const surface = surfaceForVenue(r.location || '');
    if (!surface || r.surface === surface) return r;
    changed += 1;
    return { ...r, surface };
  });
  if (changed > 0) await dataRef('journal').set(arrayToFbObj(next));
  await seedRef('venue-surface-1').set(true);
}

// Match moments used to be one blob of text in `freeform`, one moment per
// line. They are now structured so each can be ticked off after being seen on
// film. Converts in place; `freeform` is left as it was so nothing is
// destroyed if this ever needs revisiting.
async function migrateMoments(alreadyRun) {
  if (alreadyRun['moments-structured-1']) return;
  const rows = fbSnapToArray(await readOnce(dataRef('journal')));
  let changed = 0;
  const next = rows.map(r => {
    if (Array.isArray(r.moments) && r.moments.length) return r;
    const moments = toMoments(r.freeform);
    if (!moments.length) return r;
    changed += 1;
    return { ...r, moments };
  });
  if (changed > 0) await dataRef('journal').set(arrayToFbObj(next));
  await seedRef('moments-structured-1').set(true);
}

// Seed anything the database has not seen. Every batch carries its own flag,
// so this is safe on every load and safe to re-run after adding a season.
//
// NOTE: the training resources, coaching recaps and Veo film links imported
// from Gmail were seeded here once (flags: gmail-resources-1, gika-recaps-1,
// veo-links-1). That data lives in the database behind authentication and is
// deliberately not kept in this public repository — see private/README.md.
export async function runSeedsIfNeeded() {
  const alreadyRun = (await readOnce(db.ref(`${ROOT}/seeds`))).val() || {};
  for (const b of SEED_BATCHES) {
    await seedOnce(b.key, b.node, b.rows, alreadyRun);
  }
  await linkSpring26Journal(alreadyRun);
  await fixSpring26Positions(alreadyRun);
  await applyVenueSurfaces(alreadyRun);
  await migrateMoments(alreadyRun);
}

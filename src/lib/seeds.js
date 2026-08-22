import { db, ROOT } from './firebase.js';
import { SEED_BATCHES } from '../data/seasons.js';
import { fbSnapToArray, arrayToFbObj } from './storage.js';
import { readOnce } from './net.js';

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
}

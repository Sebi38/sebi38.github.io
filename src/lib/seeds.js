import { db, ROOT } from './firebase.js';
import { SEASONS } from '../data/seasons.js';
import { fbSnapToArray, arrayToFbObj } from './storage.js';

const seedRef = key => db.ref(`${ROOT}/seeds/${key}`);
const dataRef = node => db.ref(`${ROOT}/data/${node}`);

// Prepend `rows` to a collection, once, guarded by a seed flag.
async function seedOnce(seedKey, node, rows, alreadyRun) {
  if (alreadyRun[seedKey]) return;
  const existing = fbSnapToArray(await dataRef(node).once('value'));
  await dataRef(node).set(arrayToFbObj([...rows, ...existing]));
  await seedRef(seedKey).set(true);
}

// One-off migration from the original single-file app: link the seeded Spring
// 2026 journal entries to their matching stat rows. Kept verbatim so the flag
// stays meaningful for databases that have already run it.
async function linkSpring26Journal(alreadyRun) {
  if (alreadyRun['spring26-link']) return;
  const entries = fbSnapToArray(await dataRef('journal').once('value'));
  const linkMap = Object.fromEntries(
    Array.from({ length: 9 }, (_, i) => [`spj26-${i + 1}`, `sp26-${i + 1}`])
  );
  await dataRef('journal').set(
    arrayToFbObj(entries.map(e => (linkMap[e.id] ? { ...e, statId: linkMap[e.id] } : e)))
  );
  await seedRef('spring26-link').set(true);
}

// Seed any season the database has not seen yet.
// Every season is guarded by its own flag under seb38/seeds, so this is safe to
// run on every load — and safe to re-run after adding a new season.
//
// NOTE: the training resources, coaching recaps, and Veo film links imported
// from Gmail were seeded here once (flags: gmail-resources-1, gika-recaps-1,
// veo-links-1). That data now lives in the database behind authentication and
// is deliberately not kept in this repository, which is public. See
// private/README.md — untracked — if it ever needs re-seeding.
export async function runSeedsIfNeeded() {
  const alreadyRun = (await db.ref(`${ROOT}/seeds`).once('value')).val() || {};

  for (const season of SEASONS) {
    if (season.stats?.length) {
      await seedOnce(season.seedKey, 'stats', season.stats, alreadyRun);
    }
  }

  for (const season of SEASONS) {
    if (season.journal?.length && season.journalSeedKey) {
      await seedOnce(season.journalSeedKey, 'journal', season.journal, alreadyRun);
    }
  }

  await linkSpring26Journal(alreadyRun);
}

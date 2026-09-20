// ─────────────────────────────────────────────────────────────────────────────
// The academy dataset: one document at seb38/academies.
//
// Deliberately not in NODE_MAP. Everything under seb38/data is a row collection
// that goes through the outbox and row-merge path; this is a single document
// that is imported whole from a file and then edited in one place (a club's
// pipeline). Different shape, different rules, its own node.
//
// The file it is imported from is written by `npm run academies -- --export`
// on a machine that has private/academies/. It never touches the repo or the
// bundle: the only copies online are Firebase, behind sign-in, and this
// browser's cache.
// ─────────────────────────────────────────────────────────────────────────────

import { db, ROOT } from './firebase.js';
import { readOnce } from './net.js';
import { clean } from './merge.js';
import { SK } from '../config.js';
import { ACADEMIES_NODE } from '../data/academies/meta.js';
import { check } from './academies-check.js';

const ref = () => db.ref(`${ROOT}/${ACADEMIES_NODE}`);

// Firebase keys clubs by id; the engine wants an array. Firebase also drops
// null-valued keys and empty arrays on the way in, which the engine already
// reads as "not there" — nothing here needs to put them back.
const fromFb = v => (v ? { ...v, clubs: Object.values(v.clubs || {}) } : null);
const toFb = d => ({ ...d, clubs: Object.fromEntries(d.clubs.map(c => [c.id, c])) });

export const cachedAcademies = () => {
  try { return JSON.parse(localStorage.getItem(SK.academies)); } catch { return null; }
};
const cache = d => { try { localStorage.setItem(SK.academies, JSON.stringify(d)); } catch (e) { console.error(e); } };

// Database first, cache if the database cannot be reached.
export async function loadAcademies() {
  try {
    const snap = await readOnce(ref());
    const d = fromFb(snap.val());
    if (d) cache(d);
    return { data: d || cachedAcademies(), offline: false };
  } catch (e) {
    console.warn("Academies: working from cached data:", e?.message || e);
    return { data: cachedAcademies(), offline: true };
  }
}

// Import a bundle. Edits made in the tab survive: a club's pipeline is kept
// from the existing copy when it carries a newer `editedAt` than the incoming
// one. A hand-edited file has no `editedAt`, so what the tab wrote wins; to
// override from the file on purpose, give its pipeline a later stamp.
export async function importBundle(bundle, existing) {
  if (!bundle || bundle.version !== 1 || !Array.isArray(bundle.clubs))
    throw new Error("That is not an academy bundle. Run `npm run academies -- --export` and pick private/academies/bundle.json.");
  const v = check(bundle);
  if (!v.ok) throw new Error(`The bundle has ${v.errors.length} problem${v.errors.length > 1 ? "s" : ""}: ${v.errors[0]}`);

  const prev = new Map((existing?.clubs || []).map(c => [c.id, c]));
  const clubs = bundle.clubs.map(c => {
    const was = prev.get(c.id)?.pipeline;
    const keep = was?.editedAt && (!c.pipeline?.editedAt || was.editedAt > c.pipeline.editedAt);
    return keep ? { ...c, pipeline: was } : c;
  });
  const data = { ...bundle, clubs, imported: new Date().toISOString() };
  await ref().set(clean(toFb(data)));
  cache(data);
  return data;
}

// One club's pipeline, written straight to its own path so a second device
// editing a different club is never clobbered.
export async function savePipeline(data, clubId, pipeline) {
  const p = { ...pipeline, editedAt: new Date().toISOString() };
  await ref().child(`clubs/${clubId}/pipeline`).set(clean(p));
  const next = { ...data, clubs: data.clubs.map(c => (c.id === clubId ? { ...c, pipeline: p } : c)) };
  cache(next);
  return next;
}

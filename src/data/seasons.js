import { FALL25_STATS } from './fall2025.js';
import { SPRING26_STATS, SPRING26_JOURNAL } from './spring2026.js';
import { FALL26_STATS, FALL26_JOURNAL } from './fall2026.js';
import { SPRING27_STATS, SPRING27_JOURNAL } from './spring2027.js';

// ─────────────────────────────────────────────────────────────────────────────
// Two separate concerns, deliberately kept apart:
//
//   SEED_BATCHES — how rows get into Firebase. One batch per half-season,
//                  each guarded by its own flag. These mirror history and
//                  must never be renamed.
//
//   SEASONS      — how seasons are shown. A season is a full campaign
//                  (autumn + spring), which is how the club runs them.
//
// A season spans several id prefixes, so the two lists are not one-to-one.
// ─────────────────────────────────────────────────────────────────────────────

// ⚠️ NEVER change or reuse a `key`. The flag at seb38/seeds/<key> is the only
// thing stopping a batch being written to the database twice. Reusing a key
// that has run means the rows silently never appear; inventing a new key for
// data that already ran means duplicates.
export const SEED_BATCHES = [
  { key: "fall25",     node: "stats",   rows: FALL25_STATS },
  { key: "spring26",   node: "stats",   rows: SPRING26_STATS },
  { key: "spring26-j", node: "journal", rows: SPRING26_JOURNAL },
  { key: "fall26",     node: "stats",   rows: FALL26_STATS },
  { key: "fall26-j",   node: "journal", rows: FALL26_JOURNAL },
  { key: "spring27",   node: "stats",   rows: SPRING27_STATS },
  { key: "spring27-j", node: "journal", rows: SPRING27_JOURNAL },
];

// Display seasons, oldest first. `prefixes` lists the row-id prefixes that
// belong to the campaign — "fa25-1" and "sp26-4" are both 2025/26.
export const SEASONS = [
  {
    id: "2025-26",
    label: "2025/26",
    team: "ASA MLSNext U13",
    prefixes: ["fa25", "sp26"],
    from: "2025-08-01", to: "2026-07-31",
  },
  {
    id: "2026-27",
    label: "2026/27",
    team: "ASA MLSNext U14",
    prefixes: ["fa26", "sp27"],
    from: "2026-08-01", to: "2027-07-31",
  },
];

// Does this row belong to the season?
//
// Seeded rows are identified by their id prefix. A match added by hand gets a
// generated id ("mt626j8c6mmoy") that matches no prefix, so it also has to be
// placed by date — otherwise adding a match while a season is selected made it
// vanish from the list, the record and the form guide, and it looked as though
// the save had failed. A campaign runs August to July.
export const inSeason = (season, row = {}) => {
  const id = (typeof row === "string" ? row : row.id) || "";
  if (season.prefixes.some(p => id.startsWith(p + "-"))) return true;
  const date = typeof row === "string" ? "" : row.date || "";
  return Boolean(date) && date >= season.from && date <= season.to;
};

export const seasonFor = (row = {}) => SEASONS.find(s => inSeason(s, row)) || null;

// Rows belonging to a season id, or everything for "all".
export const filterBySeason = (rows, seasonId) => {
  if (seasonId === "all") return rows;
  const s = SEASONS.find(x => x.id === seasonId);
  return s ? rows.filter(r => inSeason(s, r)) : rows;
};

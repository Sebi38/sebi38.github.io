import { FALL25_STATS } from './fall2025.js';
import { SPRING26_STATS, SPRING26_JOURNAL } from './spring2026.js';
import { FALL26_STATS, FALL26_JOURNAL } from './fall2026.js';

// ─────────────────────────────────────────────────────────────────────────────
// The season registry.
//
// TO ADD A NEW SEASON:
//   1. Create src/data/<season>.js exporting an array of game rows. Give every
//      row an id prefixed with the season's `idPrefix` (e.g. "fa26-1").
//   2. Add one entry to SEASONS below.
// That's it — the Stats filter pills and the Firebase seeding both read from
// this list.
//
// FIELDS:
//   idPrefix  Row-id prefix. Also how Stats groups games into seasons.
//   label     Text on the Stats filter pill.
//   seedKey   Firebase flag at seb38/seeds/<seedKey> marking "already seeded".
//             NEVER change or reuse an existing seedKey — that is the only
//             thing stopping a season from being seeded into the database twice.
//   stats     Game rows seeded into seb38/data/stats.
//   journal   Optional journal rows seeded into seb38/data/journal.
// ─────────────────────────────────────────────────────────────────────────────
export const SEASONS = [
  {
    idPrefix: "fa25",
    label: "Fall '25",
    seedKey: "fall25",
    stats: FALL25_STATS,
  },
  {
    idPrefix: "sp26",
    label: "Spring '26",
    seedKey: "spring26",
    stats: SPRING26_STATS,
    journal: SPRING26_JOURNAL,
    journalSeedKey: "spring26-j",
  },
  {
    idPrefix: "fa26",
    label: "Fall '26",
    seedKey: "fall26",
    stats: FALL26_STATS,
    journal: FALL26_JOURNAL,
    journalSeedKey: "fall26-j",
  },
];

// Seeds run oldest-first so the newest season ends up at the top of the table.
// The original single-file app seeded spring26 before fall25; order only
// affects display sequence for rows added in the same batch, and every season
// is guarded by its own seedKey, so re-ordering here cannot duplicate data.
export const seasonFor = (id = "") =>
  SEASONS.find(s => id.startsWith(s.idPrefix + "-")) || null;

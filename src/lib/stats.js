// The one place that says what a match's numbers are.
//
// Before this existed every surface did its own arithmetic on the raw row, and
// they disagreed: Match Day recorded shots on goal as timed *events*, while the
// Matches tab read a hand-typed `sot` field, so three shots tapped at the pitch
// showed as "SOT 0" everywhere else. Home summed `goals` straight off the row,
// which silently concatenates if a form ever stored "1" instead of 1.
//
// Everything that shows a number now goes through here.

import { EVENT_TYPES, eventsOf, countsOf } from './events.js';
import { hasValue } from './numbers.js';
import { isPlayed, todayISO } from './season.js';

// Form inputs and old rows hold strings; a stray one used to turn a sum into
// "01203". Anything that isn't a finite number counts as zero.
export const num = v => {
  const n = typeof v === "number" ? v : parseFloat(v);
  return Number.isFinite(n) ? n : 0;
};

// The counting stats, in the order they are shown.
export const STAT_FIELDS = [
  { key: "minutes",   short: "MIN",  label: "Minutes"      },
  { key: "goals",     short: "GOALS",label: "Goals"        },
  { key: "assists",   short: "AST",  label: "Assists"      },
  { key: "shots",     short: "SHOTS",label: "Shots"        },
  { key: "sot",       short: "SOT",  label: "Shots on goal"},
  { key: "passes",    short: "PASS", label: "Passes"       },
  { key: "tackles",   short: "TKL",  label: "Tackles"      },
  { key: "corners",   short: "COR",  label: "Corners"      },
  { key: "freeKicks", short: "FK",   label: "Free kicks"   },
];

// One match's numbers, with the live-tapped events folded in.
//
// A shot on goal can arrive two ways: tapped during the game (an event) or
// typed in afterwards from the match analytics (the `sot` field). They are the
// same fact recorded twice, so the larger of the two wins rather than the two
// being added — tapping three and later typing three is three shots, not six.
// A shot on goal is also a shot, so `shots` can never sit below `sot`.
export function matchStats(row = {}) {
  const ev = countsOf(eventsOf(row));
  const sot = Math.max(num(row.sot), ev.shotOnGoal);
  return {
    minutes:   num(row.minutes),
    goals:     num(row.goals),
    assists:   num(row.assists),
    sot,
    shots:     Math.max(num(row.shots), sot),
    passes:    num(row.passes),
    tackles:   num(row.tackles),
    corners:   ev.corner,
    freeKicks: ev.freeKick,
  };
}

// Did this match actually happen? A result is the clearest signal, but plenty
// of games are logged without anyone entering a score — the MLSN Fest final and
// both New Jersey games are like that. A past date, or a date of today with
// something already recorded, counts too.
//
// This is what the stats grid keys off. Gating it on the result alone meant a
// match logged in full but never given a score showed no statistics at all.
export function hasHappened(row = {}, from = todayISO()) {
  if (isPlayed(row)) return true;
  if (!row.date) return false;
  if (row.date < from) return true;
  return row.date === from && hasStats(row);
}

// Is there anything recorded worth showing?
export function hasStats(row = {}) {
  const s = matchStats(row);
  return STAT_FIELDS.some(f => s[f.key] > 0) ||
         hasValue(row.takaPos) || hasValue(row.takaNeg);
}

// Career or season aggregate. Only matches that happened are counted, so a
// fixture list stretching into next May never dilutes the totals.
export function totals(rows = [], from = todayISO()) {
  const counted = rows.filter(r => hasHappened(r, from));
  const withResult = rows.filter(isPlayed);
  const sum = key => counted.reduce((s, r) => s + matchStats(r)[key], 0);

  const out = { matches: counted.length, results: withResult.length };
  STAT_FIELDS.forEach(f => { out[f.key] = sum(f.key); });
  out.w = withResult.filter(r => r.result === "W").length;
  out.d = withResult.filter(r => r.result === "D").length;
  out.l = withResult.filter(r => r.result === "L").length;
  out.gf = withResult.reduce((s, r) => s + num(r.scoreFor), 0);
  out.ga = withResult.reduce((s, r) => s + num(r.scoreAgainst), 0);
  return out;
}

// Average self-rating, over matches that were actually played.
//
// Every seeded fixture carries a placeholder rating of 5, so averaging the
// whole journal returned 5.0 no matter how he played — the number moved only
// once the season was over. `entryFor` maps a stat row to its journal entry.
export function averageRating(rows = [], entryFor = () => null, from = todayISO()) {
  const ratings = rows
    .filter(r => hasHappened(r, from))
    .map(r => entryFor(r)?.rating)
    .filter(v => typeof v === "number" && v > 0);
  return ratings.length
    ? (ratings.reduce((s, v) => s + v, 0) / ratings.length).toFixed(1)
    : "—";
}

// The event types that actually occurred, for the small live-tapped chips.
export const loggedEvents = row =>
  EVENT_TYPES.map(t => ({ ...t, count: countsOf(eventsOf(row))[t.key] }))
             .filter(t => t.count > 0);

// ─────────────────────────────────────────────────────────────────────────────
// Scoring the academy matrix.
//
// Pure functions over a dataset that is passed in. Nothing here imports the
// data: the CLI reads it from private/academies/ and the site reads it from
// Firebase after sign-in, and neither copy may reach the public bundle.
//
// Three ideas do all the work.
//
//   1. Confidence is arithmetic, not a label. An unresearched dimension scores
//      the neutral prior rather than whatever someone guessed, so a club cannot
//      climb the table by being unexamined.
//
//   2. Fit and odds are separate axes. "How good would this be for him" and
//      "will it happen" are different questions, and averaging them hides the
//      only trade-off worth seeing.
//
//   3. A question is worth the uncertainty it removes — or, if it decides
//      whether the club stays on the list, the club's whole candidacy.
// ─────────────────────────────────────────────────────────────────────────────

import {
  CONFIDENCE, PRIOR, DIMENSIONS, DIM, DEFAULT_WEIGHTS,
  stageIsLive, stageIndex, STAGES, TRAVEL_TIERS, TIERS, RANK_SOURCE,
} from '../data/academies/meta.js';
import { MASTER_QUESTIONS } from '../data/academies/questions.js';

const cw = conf => (CONFIDENCE[conf] || CONFIDENCE.unknown).weight;
const round = (n, p = 2) => (n == null ? null : Math.round(n * 10 ** p) / 10 ** p);
const totalWeight = w => DIMENSIONS.reduce((n, d) => n + (w[d.id] ?? 0), 0);

// ── Two tiers, one list ──────────────────────────────────────────────────────
// A screening row has name, travel, rank and four scores. A research record
// has everything a full report adds. Merged, a club is "deep-dive" if it has a
// research record and "screening" if not.
export function mergeTiers(screening, research = {}) {
  const clubs = screening.map(row => {
    const { school, housing, pathway, reach, summary, rank, ...base } = row;
    const r = research[row.id] || null;
    return {
      ...base,
      tier: r ? "deep-dive" : "screening",
      rank: { value: rank ?? null, of: RANK_SOURCE.ranked, source: RANK_SOURCE.name, note: r?.rankNote || null },
      screening: { school, housing, pathway, reach, summary },
      ...(r || {}),
    };
  });
  const ids = new Set(clubs.map(c => c.id));
  for (const id of Object.keys(research))
    if (!ids.has(id)) throw new Error(`research has "${id}" but screening has no such club`);
  return clubs;
}

// ── Two tiers, one set of dimensions ─────────────────────────────────────────
// A deep-dive club scores every dimension directly. A screening club has four
// scores and a rank, and those are mapped onto the dimensions they inform.
// Anything the screening data does not speak to is unknown and scores the
// prior — a screening club is never quietly credited with a coaching staff or
// a college programme nobody has looked at.

// The public rank as a 1–5. First is a 5; last is a 1. Unranked is unknown,
// not a 3: a club can be unranked for being new or for being outside the
// ranking's scope, and neither says anything about the soccer.
function rankScore(club) {
  const r = club.rank?.value;
  if (!r) return { score: null, conf: "unknown", note: "Not ranked." };
  const n = RANK_SOURCE.ranked;
  return { score: 5 - (r - 1) * (4 / (n - 1)), conf: "reported",
           note: `#${r} of ${n}, ${RANK_SOURCE.name}, ${RANK_SOURCE.date}.` };
}

function screeningEntry(club, dimId) {
  const sc = club.screening || {};
  switch (dimId) {
    case "soccer":  return rankScore(club);
    case "pathway": return sc.pathway;
    case "school":  return sc.school;
    case "housing":
      // The original matrix's rule: a commutable club means he lives at home,
      // and the housing question does not arise. It is the default, and a
      // research record can say otherwise.
      if (club.travelTier === 1)
        return { score: 5, conf: "confirmed", note: "Within commuting distance — he lives at home." };
      return sc.housing;
    case "access":
      return { score: 6 - club.travelTier, conf: "confirmed",
               note: `${TRAVEL_TIERS[club.travelTier]?.label}: ${club.travelNote}.` };
    default:
      return { score: null, conf: "unknown", note: "Not covered at screening depth." };
  }
}

// The entry actually used for a dimension: researched where it exists,
// screening-derived where it does not.
export function entry(club, dimId) {
  return club.scores?.[dimId] || screeningEntry(club, dimId);
}

// Same for the gates. At screening depth, odds is the reach score with the
// original matrix's rule that a drivable club is fully open — he would be a
// regional player there — which measures whether he is seen and says nothing
// about selectivity. A research record refines that where it exists.
export function gate(club, id) {
  if (club.blocked) {
    return id === "odds"
      ? { score: 0, conf: "confirmed", note: club.blocked }
      : { score: null, conf: "unknown", note: "Moot." };
  }
  if (club.gates?.[id]) return club.gates[id];
  if (id === "odds") {
    if (club.travelTier <= 2)
      return { score: 5, conf: "reported", note: "Drivable, so effectively a regional player. Measures whether he is seen, not how selective the club is." };
    return club.screening?.reach || { score: null, conf: "unknown", note: "" };
  }
  return { score: null, conf: "unknown", note: "Not covered at screening depth." };
}

// A cost model for a club without one: soccer assumed free (the rule across
// MLS, and the exceptions are exactly what research is for), tuition and
// housing open, travel from the tier.
function defaultCostModel(club) {
  const tier = TRAVEL_TIERS[club.travelTier] || TRAVEL_TIERS[3];
  const [low, high] = tier.travelCost;
  return {
    currency: "USD",
    soccer:  { low: 0, high: 0, basis: "estimated", note: "MLS academies are free to play as a rule. Assumed, not confirmed." },
    tuition: { low: null, high: null, basis: "estimated", note: "Schooling model not researched." },
    housing: { low: null, high: null, basis: "estimated", note: "Housing model not researched." },
    travel:  { low, high, basis: "estimated", note: `Family travel implied by ${tier.label.toLowerCase()}.` },
  };
}
export const costModelOf = club => club.costModel || defaultCostModel(club);

// Live means still worth spending effort on. A blocked club is not; a
// deep-dive club follows its pipeline stage; a screening club is live by
// default — nobody has ruled it out because nobody has looked.
export const isLive = club =>
  !club.blocked && (club.pipeline ? stageIsLive(club.pipeline.stage) : true);

// ── Scoring one dimension ────────────────────────────────────────────────────
// The blend is the whole model: `score * c + PRIOR * (1 - c)`. At confidence 1
// you get the score. At 0 you get the prior — not zero, because not knowing
// whether a club's schooling is any good is not evidence that it is bad. A
// reported 5 lands at 4.6, and a confirmed 4 beats it. That is the intended
// behaviour: verified beats impressive.
export function adjust(e, confOverride = null) {
  if (!e) return PRIOR;
  const c = confOverride == null ? cw(e.conf) : confOverride;
  const s = e.score == null ? PRIOR : e.score;
  return s * c + PRIOR * (1 - c);
}

// How much of the cost picture is actually pinned down. A line the club has
// stated and bounded counts fully; one we estimated ourselves counts half; one
// with an open end counts nothing.
//
// Derived rather than declared because the alternative kept lying: a club can
// be "confirmed" expensive on the strength of a list price while the number
// that decides it — the figure after aid — has never been asked. Confirmed-
// and-unknown at the same time is exactly the state this catches.
export function costConfidence(club) {
  const m = costModelOf(club);
  let got = 0;
  for (const k of ["soccer", "tuition", "housing", "travel"]) {
    const l = m[k];
    if (!l || l.low == null || l.high == null) continue;
    got += l.basis === "club-stated" ? 1 : 0.5;
  }
  return got / 4;
}

// The confidence actually used for a dimension. Cost is computed; everything
// else is what the record says.
export function confOf(club, dimId) {
  if (dimId === "cost") return costConfidence(club);
  return cw(entry(club, dimId)?.conf);
}

// ── The composite ────────────────────────────────────────────────────────────
// `weights` is the family's priorities, keyed by dimension id. The site lets
// them be dragged; the CLI uses the defaults.

// What a club looks like if you believe everything on the page, including the
// parts nobody checked. Computed only so the gap to `adjusted` can be shown —
// that gap is the amount of the score currently resting on faith.
export function faceValue(club, weights = DEFAULT_WEIGHTS) {
  let sum = 0;
  for (const dim of DIMENSIONS) {
    const e = entry(club, dim.id);
    sum += (weights[dim.id] ?? 0) * (e && e.score != null ? e.score : PRIOR);
  }
  return sum / (totalWeight(weights) || 1);
}

export function adjusted(club, weights = DEFAULT_WEIGHTS) {
  let sum = 0;
  for (const dim of DIMENSIONS)
    sum += (weights[dim.id] ?? 0) * adjust(entry(club, dim.id), confOf(club, dim.id));
  return sum / (totalWeight(weights) || 1);
}

// Share of the weighted decision that rests on something somebody checked.
// The single most useful number in the matrix: how much homework is left, in
// the units that matter.
export function coverage(club, weights = DEFAULT_WEIGHTS) {
  let sum = 0;
  for (const dim of DIMENSIONS) sum += (weights[dim.id] ?? 0) * confOf(club, dim.id);
  return sum / (totalWeight(weights) || 1);
}

// Dimensions carrying real weight with nothing behind them.
export function blanks(club) {
  return DIMENSIONS.filter(d => confOf(club, d.id) === 0).sort((a, b) => b.weight - a.weight);
}

// What a year costs: a band rather than a number, plus the lines still open.
// A club whose band is [0, unknown] is not cheap, it is uncosted — and those
// two get confused constantly when the only summary is "fully funded".
export function annualCost(club) {
  const m = costModelOf(club);
  let low = 0, high = 0;
  const open = [];
  for (const k of ["soccer", "tuition", "housing", "travel"]) {
    const l = m[k];
    if (!l) { open.push(k); continue; }
    low += l.low || 0;
    if (l.high == null) open.push(k); else high += l.high;
  }
  return { low, high, open, complete: open.length === 0 };
}

// ── Odds and position ────────────────────────────────────────────────────────
// A blocked club has odds of exactly zero, not the prior — a legal bar is not
// an unknown.
export const oddsOf = club => club.blocked ? 0 : adjust(gate(club, "odds"));
export const positionFitOf = club => adjust(gate(club, "positionFit"));

// Fit and odds combined, for the one-number sort. Multiplicative rather than
// additive: a club he cannot get into is not a good option with a drawback, it
// is not an option. Normalised so a perfect-odds club scores its fit unchanged.
export const expectedValue = (club, weights) => adjusted(club, weights) * (oddsOf(club) / 5);

// ── The call sheet ───────────────────────────────────────────────────────────
// Two different things make a question worth asking, with separate arithmetic.
//
// Most questions *clarify*: they move a dimension from guess to fact, and what
// they are worth is the weighted uncertainty they remove. A question aimed at
// something already confirmed is worth nothing, which is correct.
//
// A few questions *decide*: the answer either keeps the club on the list or
// takes it off. Those are worth what is at stake — the club's own fit — not
// what they clarify. Scored on uncertainty removed, a well-researched club's
// one remaining decisive question would rank near the bottom, because there
// is barely any uncertainty left to remove. Scored on what it settles, it is
// one of the most valuable calls in the search.
//
// Effort divides, because a decisive answer available from a school's
// admissions office is not the same asset as one that needs a relationship
// with an academy director.

const LEVERAGE = 6;   // weight-units a club's whole candidacy is worth
const EFFORT = { low: 0.6, medium: 1, high: 1.6 };
const effortOf = q => EFFORT[q.effort] || EFFORT.medium;

function clarifies(club, resolves = []) {
  let v = 0;
  for (const id of resolves) {
    const dim = DIM[id];
    // Gates have no dimension weight of their own. `odds` is priced at the
    // heaviest dimension weight because it gates every other answer: knowing a
    // club will not look at him makes the rest of the research moot.
    const weight = dim ? dim.weight : (id === "odds" ? 3 : 1.5);
    const c = dim ? confOf(club, id) : cw(gate(club, id)?.conf);
    v += weight * (1 - c);
  }
  return v;
}

// Every question still worth asking at a club, best first. Club-specific
// questions are merged with the master bank, and a master question is dropped
// when the club's own list already covers the same ground.
export function callSheet(club, { limit = null } = {}) {
  // Screening clubs are not being worked. The master bank applies the day one
  // is promoted to a research record, not before.
  if (club.tier !== "deep-dive" || club.blocked) return [];
  const fit = adjusted(club);
  const own = (club.openQuestions || []).map(q => ({
    q: q.q,
    ask: q.ask || club.name,
    resolves: q.resolves || [],
    source: "club",
    blocking: q.priority === "blocking",
    effort: q.effort || "medium",
    value: clarifies(club, q.resolves) / effortOf(q),
  }));

  // A club's candidacy is at stake once, not once per blocking question — four
  // of them do not put four clubs on the table. So the leverage goes to a
  // single question: the cheapest decisive one, because that is the one that
  // actually gets asked first. The rest are worth what they clarify.
  const decisive = own.filter(q => q.blocking)
    .sort((a, z) => effortOf(a) - effortOf(z) || z.value - a.value)[0];
  if (decisive) {
    decisive.value = Math.max(decisive.value, (fit / 5) * LEVERAGE / effortOf(decisive));
    decisive.decisive = true;
  }

  // A gated club gets only its own questions. The gate is one thing that
  // decides whether the club is worth researching at all, and padding that
  // conversation with twenty-six due-diligence questions inverts the point:
  // the least-researched club would otherwise rank as the most urgent call.
  if (club.research?.posture === "gated") {
    return own.sort((a, b) => (b.blocking - a.blocking) || (b.value - a.value));
  }

  const covered = new Set(own.flatMap(q => q.resolves));
  const master = MASTER_QUESTIONS
    .filter(q => q.resolves.some(r => !covered.has(r)))
    .map(q => ({ q: q.q, ask: club.name, resolves: q.resolves, source: "master",
                 blocking: false, effort: "medium", value: clarifies(club, q.resolves) }))
    .filter(q => q.value > 0);

  const all = [...own, ...master].sort((a, b) => (b.blocking - a.blocking) || (b.value - a.value));
  return limit ? all.slice(0, limit) : all;
}

// The same idea across the matrix — ranked by club, not by question, because
// that is how the work actually happens. You do not make one call to ask one
// question; you get a club on the phone and ask it six things. So the unit
// here is a club, scored by what a single conversation would settle.
//
// Long odds discount clarifying questions, not decisive ones: settling whether
// to spend effort at a long-odds club is exactly what a decisive question is
// for.
export function globalCallSheet(clubs, { limit = 6, perClub = 4 } = {}) {
  return clubs
    .filter(club => club.tier === "deep-dive" && isLive(club))
    .map(club => {
      const qs = callSheet(club, { limit: perClub });
      return {
        club: club.name, clubId: club.id,
        odds: round(oddsOf(club)),
        posture: club.research?.posture || "full",
        gatedOn: club.research?.gatedOn || null,
        blocking: qs.some(q => q.blocking),
        settles: round(qs.reduce((n, q) => n + q.value, 0)),
        weighted: round(qs.reduce((n, q) => n + (q.blocking ? q.value : q.value * (oddsOf(club) / 5)), 0)),
        questions: qs,
      };
    })
    .sort((a, b) => b.weighted - a.weighted)
    .slice(0, limit);
}

// ── The calendar ─────────────────────────────────────────────────────────────
const DAY = 86400000;
const daysBetween = (a, b) => Math.round((new Date(b) - new Date(a)) / DAY);
export const todayISO = () => new Date().toISOString().slice(0, 10);

export function calendar(keyDates = [], today = todayISO()) {
  return keyDates.map(d => ({ ...d, daysAway: daysBetween(today, d.date) })).filter(d => d.daysAway >= 0);
}

// Outreach that has not started, against a deadline that does not move.
export function urgency(club, today = todayISO()) {
  const due = club.pipeline?.dueBy;
  if (!due) return { days: null, state: "none" };
  const days = daysBetween(today, due);
  const started = stageIndex(club.pipeline.stage) > 0;
  if (!isLive(club)) return { days, state: "closed" };
  if (days < 0 && !started) return { days, state: "overdue" };
  if (days <= 14 && !started) return { days, state: "due" };
  return { days, state: started ? "moving" : "scheduled" };
}

// ── Assembly ─────────────────────────────────────────────────────────────────

// Where a research score and the screening score for the same dimension
// disagree by a point or more. Those are the numbers to argue about: one is
// the family's own prior and the other is what a closer look found.
export function divergences(club) {
  if (club.tier !== "deep-dive") return [];
  const out = [];
  for (const dim of DIMENSIONS) {
    const r = club.scores?.[dim.id];
    const sc = screeningEntry(club, dim.id);
    if (!r || r.score == null || !sc || sc.score == null) continue;
    const gap = r.score - sc.score;
    if (Math.abs(gap) >= 1) out.push({ dim: dim.id, screening: round(sc.score, 1), research: r.score, gap: round(gap, 1) });
  }
  return out;
}

export function scoreClub(club, weights = DEFAULT_WEIGHTS, today = todayISO()) {
  const face = faceValue(club, weights);
  const adj = adjusted(club, weights);
  return {
    ...club,
    computed: {
      tier: TIERS[club.tier] || null,
      blocked: club.blocked || null,
      divergences: divergences(club),
      faceValue: round(face),
      adjusted: round(adj),
      faith: round(face - adj),
      coverage: round(coverage(club, weights) * 100, 0),
      odds: round(oddsOf(club)),
      positionFit: round(positionFitOf(club)),
      expectedValue: round(expectedValue(club, weights)),
      blanks: blanks(club).map(d => d.id),
      cost: annualCost(club),
      urgency: urgency(club, today),
      travel: TRAVEL_TIERS[club.travelTier] || null,
      live: isLive(club),
      stage: club.pipeline ? (STAGES.find(s => s.id === club.pipeline.stage) || null) : null,
    },
  };
}

// The matrix. Sorted by expected value by default — fit discounted by whether
// it can actually happen. Sort by `adjusted` instead to see pure quality.
export function matrix(clubs, { sortBy = "expectedValue", liveOnly = false, tier = null, weights = DEFAULT_WEIGHTS, today = todayISO() } = {}) {
  let rows = clubs.map(c => scoreClub(c, weights, today));
  if (liveOnly) rows = rows.filter(r => r.computed.live);
  if (tier) rows = rows.filter(r => r.tier === tier);
  return rows.sort((a, b) => (b.computed[sortBy] ?? 0) - (a.computed[sortBy] ?? 0));
}

// Screening clubs that outscore a club already chosen for a full report.
//
// The check on the choice of shortlist. A club at screening depth carries more
// unknowns and so sits closer to the prior; if it still lands above a deep-
// dive club on expected value, that is not noise — the family's own screening
// data says it is worth more than a club it is spending research on. Either
// promote it or write down why not.
//
// The bar is the weakest club being actively pursued — not a gated one. A club
// kept in the deep-dive tier to be closed out with one email is not a bar, and
// measuring the field against it would promote half the league.
export function promotions(clubs, weights = DEFAULT_WEIGHTS) {
  const rows = matrix(clubs, { weights });
  const pursued = rows.filter(r =>
    r.tier === "deep-dive" && r.computed.live && (r.research?.posture || "full") === "full");
  if (!pursued.length) return [];
  const floor = Math.min(...pursued.map(r => r.computed.expectedValue));
  const weakest = pursued.find(r => r.computed.expectedValue === floor);
  return rows
    .filter(r => r.tier === "screening" && r.computed.live && r.computed.expectedValue >= floor)
    .map(r => ({
      ...r, outscores: weakest.name, floor,
      // What is carrying it: a screening club's fit sits near the prior, so a
      // high EV is usually the odds gate — national reach, or the drivable
      // rule. Worth knowing before promoting on the strength of it.
      carriedBy: r.computed.odds >= 4 && r.computed.adjusted < 3.4 ? "odds" : "fit",
    }));
}

// Where the research as a whole stands.
export function health(clubs, weights = DEFAULT_WEIGHTS) {
  const rows = clubs.map(c => scoreClub(c, weights));
  const deep = rows.filter(r => r.tier === "deep-dive");
  const live = deep.filter(r => r.computed.live);
  return {
    clubs: rows.length,
    deepDive: deep.length,
    blocked: rows.filter(r => r.blocked).length,
    live: live.length,
    avgCoverage: round(live.reduce((n, r) => n + r.computed.coverage, 0) / (live.length || 1), 0),
    blanks: deep.reduce((n, r) => n + r.computed.blanks.length, 0),
    contacted: deep.filter(r => stageIndex(r.pipeline?.stage) > 0).length,
    corrections: deep.reduce((n, r) => n + (r.corrections?.length || 0), 0),
    // A deep-dive club whose score rests mostly on unverified claims. Ranking
    // these against researched clubs is the error the model exists to prevent.
    unreliable: deep.filter(r => r.computed.coverage < 60).map(r => r.name),
    // A deep-dive club with no form and no email cannot be started, however it
    // scores. It reads as a research gap and is not one — it is the first
    // piece of work.
    noRoute: deep.filter(r => { const k = r.profile?.contact || {}; return !k.interestForm && !k.email; }).map(r => r.name),
    promotions: promotions(clubs, weights).map(r => r.name),
  };
}

export { DIMENSIONS, DIM, CONFIDENCE, TIERS, STAGES, DEFAULT_WEIGHTS };

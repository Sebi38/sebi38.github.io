// ─────────────────────────────────────────────────────────────────────────────
// Schema checks for an academy dataset.
//
// The data is hand-edited between phone calls, which is exactly when mistakes
// get made — a score updated without its confidence, a question pointing at a
// dimension that was renamed, a club scored on nine dimensions instead of ten.
// None of those throw. They just quietly produce a wrong ranking.
//
// Takes the merged dataset (see mergeTiers), so the same checks run on the
// private files before export and on what comes back from Firebase.
//
// The one worth naming: a score with `conf: "unknown"` should have `score:
// null`. A number sitting behind an unknown is a guess that will eventually be
// read as a finding.
// ─────────────────────────────────────────────────────────────────────────────

import { CONFIDENCE, DIMENSIONS, DIM, STAGES, TRAVEL_TIERS, RANK_SOURCE } from '../data/academies/meta.js';
import { MASTER_QUESTIONS } from '../data/academies/questions.js';

const GATE_IDS = ["odds", "positionFit"];
const SCREEN_FIELDS = ["school", "housing", "pathway", "reach"];
const ISO = /^\d{4}-\d{2}-\d{2}$/;

// A score/confidence pair, as used in both tiers. Firebase drops null-valued
// keys, so a missing score is read the same as a null one.
function checkEntry(E, at, label, e, { allowDerived = false, min = 1 } = {}) {
  if (!e) { E(at, `missing ${label}`); return; }
  if (!CONFIDENCE[e.conf]) E(at, `${label} has unknown confidence "${e.conf}"`);
  if (e.conf === "derived" && !allowDerived) E(at, `${label} uses "derived", which only applies to cost`);
  if (e.score != null && (typeof e.score !== "number" || e.score < min || e.score > 5))
    E(at, `${label} score ${e.score} is outside ${min}–5`);
  if (e.conf === "unknown" && e.score != null)
    E(at, `${label} is unknown but carries a score of ${e.score} — a guess behind an unknown reads as a finding later`);
  if (!["unknown", "derived"].includes(e.conf) && e.score == null)
    E(at, `${label} has confidence "${e.conf}" but no score`);
}

export function check(dataset) {
  const errors = [];
  const warnings = [];
  const E = (where, msg) => errors.push(`${where}: ${msg}`);
  const W = (where, msg) => warnings.push(`${where}: ${msg}`);

  const clubs = dataset?.clubs || [];
  if (!clubs.length) E("dataset", "no clubs");
  if (!dataset?.player?.birthYear) W("dataset", "no player birth year");

  const seen = new Set();
  const ranks = new Map();
  for (const club of clubs) {
    const at = club.id || club.name || "<unnamed club>";

    // ── Screening tier: every club ───────────────────────────────────────────
    if (!club.id) E(at, "no id");
    if (seen.has(club.id)) E(at, "duplicate id");
    seen.add(club.id);
    if (!club.name) E(at, "no name");
    if (!["US", "CA"].includes(club.country)) E(at, `country "${club.country}" — expected US or CA`);
    if (club.country === "CA" && !club.blocked) E(at, "Canadian club with no Article 19 block recorded");
    if (!TRAVEL_TIERS[club.travelTier]) E(at, `travelTier ${club.travelTier} is not a tier`);
    if (!club.travelNote) W(at, "no travel note");
    if (!["deep-dive", "screening"].includes(club.tier)) E(at, `tier "${club.tier}" is not deep-dive or screening`);
    const r = club.rank?.value;
    if (r != null) {
      if (!Number.isInteger(r) || r < 1 || r > RANK_SOURCE.ranked) E(at, `rank ${r} is outside 1–${RANK_SOURCE.ranked}`);
      if (ranks.has(r)) E(at, `rank ${r} is also held by ${ranks.get(r)}`);
      ranks.set(r, club.name);
    }
    for (const f of SCREEN_FIELDS) checkEntry(E, at, `screening.${f}`, club.screening?.[f]);
    if (!club.screening?.summary) W(at, "no summary line");

    if (club.tier !== "deep-dive") continue;

    // ── Research tier ────────────────────────────────────────────────────────
    for (const dim of DIMENSIONS) {
      const e = club.scores?.[dim.id];
      if (!e) { E(at, `missing dimension "${dim.id}"`); continue; }
      checkEntry(E, at, `"${dim.id}"`, e, { allowDerived: dim.id === "cost" });
      // Cost is the one dimension whose confidence is computed. Declaring it
      // by hand there means a number that looks authoritative and is ignored.
      if (dim.id === "cost" && e.conf !== "derived")
        E(at, `"cost" declares confidence "${e.conf}" — it must be "derived", since the engine computes it from the cost model`);
      if (dim.id === "cost" && e.score == null) E(at, `"cost" needs a score — only its confidence is computed`);
      if (!e.note) W(at, `"${dim.id}" has no note — the reasoning is the part worth keeping`);
    }
    const extra = Object.keys(club.scores || {}).filter(k => !DIM[k]);
    if (extra.length) E(at, `scores on dimensions that do not exist: ${extra.join(", ")}`);

    for (const g of GATE_IDS) checkEntry(E, at, `gate "${g}"`, club.gates?.[g]);

    const stage = club.pipeline?.stage;
    if (!STAGES.some(s => s.id === stage)) E(at, `stage "${stage}" is not in STAGES`);
    if (club.pipeline?.dueBy && !ISO.test(club.pipeline.dueBy)) E(at, `dueBy "${club.pipeline.dueBy}" is not YYYY-MM-DD`);
    if (!club.pipeline?.nextAction) W(at, "no next action");
    if (!club.pipeline?.owner) W(at, "nobody owns the next action");

    for (const k of ["soccer", "tuition", "housing", "travel"]) {
      const l = club.costModel?.[k];
      if (!l) { E(at, `cost model is missing "${k}"`); continue; }
      if (!["club-stated", "estimated"].includes(l.basis)) E(at, `cost "${k}" has basis "${l.basis}" — expected club-stated or estimated`);
      if (l.low != null && l.high != null && l.low > l.high) E(at, `cost "${k}" has a low above its high`);
      if (l.basis === "club-stated" && !l.note) W(at, `cost "${k}" is club-stated with no note saying where it came from`);
    }

    for (const q of club.openQuestions || []) {
      if (!q.q) E(at, "an open question with no text");
      for (const rr of q.resolves || [])
        if (!DIM[rr] && !GATE_IDS.includes(rr)) E(at, `question resolves "${rr}", which is not a dimension or a gate`);
      if (!(q.resolves || []).length) W(at, `question "${String(q.q).slice(0, 40)}…" resolves nothing, so it cannot be ranked`);
      if (q.effort && !["low", "medium", "high"].includes(q.effort)) E(at, `question effort "${q.effort}" is not low/medium/high`);
    }

    const posture = club.research?.posture;
    if (posture && !["full", "gated"].includes(posture)) E(at, `research posture "${posture}" is not full or gated`);
    if (posture === "gated" && !club.research?.gatedOn) E(at, "gated with no gate written down");
    if (posture === "gated" && !(club.openQuestions || []).some(q => q.priority === "blocking"))
      E(at, "gated but has no blocking question to clear the gate");

    // A club nobody can contact cannot be pursued, however good it looks.
    const contact = club.profile?.contact || {};
    if (!contact.interestForm && !contact.email && stage === "not-contacted")
      W(at, "no interest form and no email — there is currently no way to start");
  }
  if (ranks.size && ranks.size !== RANK_SOURCE.ranked)
    W("dataset", `${ranks.size} ranked clubs, but RANK_SOURCE says ${RANK_SOURCE.ranked}`);

  for (const q of MASTER_QUESTIONS)
    for (const rr of q.resolves || [])
      if (!DIM[rr] && !GATE_IDS.includes(rr)) E(`master:${q.id}`, `resolves "${rr}", which is not a dimension or a gate`);

  return { errors, warnings, ok: errors.length === 0 };
}

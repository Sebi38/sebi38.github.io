// ─────────────────────────────────────────────────────────────────────────────
// The model behind the academy matrix — the part that is not about anyone.
//
// Everything here is generic: how confidence is priced, what the dimensions
// are, what the stages and tiers mean. The data it scores — the clubs, the
// player, the decisions — lives in private/academies/ (gitignored) and, once
// imported, in Firebase behind sign-in. This repo is public and the site is
// static, so nothing personal may be imported into the bundle.
//
// The source material scored clubs on four dimensions and hand-assigned a rank.
// That has two problems. A club can only be compared on what someone happened
// to research, and a 5 that nobody has verified sorts above a 4 that is
// confirmed — so the matrix rewards ignorance. Everything here exists to fix
// those two things: a fixed set of dimensions every club is scored on, and
// confidence carried as a number rather than a label.
// ─────────────────────────────────────────────────────────────────────────────

// How much a claim is worth. `weight` is the share of a score we are willing to
// take at face value; the rest is pulled back to PRIOR.
//
// `dated` is the interesting one: a real, documented arrangement, announced
// years ago, under staff who have since left. That is not nothing and it is
// not a fact. It is a lead worth one phone call.
export const CONFIDENCE = {
  confirmed: { weight: 1.00, label: "Confirmed", mark: "✅",
               meaning: "Stated by the club on its own site or in its own release." },
  reported:  { weight: 0.80, label: "Reported",  mark: "○",
               meaning: "Credible third party — independent evaluation, league release, established beat outlet." },
  dated:     { weight: 0.45, label: "Dated",     mark: "⚠",
               meaning: "Was true at the cited date. The arrangement may have changed. A lead, not a fact." },
  unknown:   { weight: 0.00, label: "Unknown",   mark: "?",
               meaning: "Not established. A research task, not a low score." },
  // Cost only. Its confidence is computed from how much of the cost model is
  // actually pinned down, so there is no hand-set number here to go stale —
  // and nothing in the data that looks authoritative while being ignored.
  derived:   { weight: 0.00, label: "Derived",   mark: "ƒ",
               meaning: "Computed from the cost model rather than declared. See costConfidence()." },
};

// What an unresearched dimension is worth. The midpoint of the 1–5 scale, and
// the whole point of it: not knowing whether a club's schooling is any good is
// not evidence that it is bad. An unknown 5 and an unknown 1 both land here.
export const PRIOR = 3;

// The ten dimensions, lifted from the fit scorecard in the source research so
// that the sheet used on a visit and the matrix used to choose who to visit are
// the same instrument.
//
// Weights are the dial to turn when the family's priorities change — they are
// the only genuinely subjective numbers in this file, so they live in one place
// and nothing else hard-codes a priority. The site lets them be adjusted live.
//
// The source research marked distance Medium. It is set High here on the
// strength of that research's own argument: a place within driving range
// removes schooling, housing and relocation as questions at once. That is not
// a convenience, it is three fewer ways for the plan to fail.
export const DIMENSIONS = [
  { id:"soccer",     label:"Soccer environment",   weight:3,
    asks:"Is the level high enough that he is stretched every session?" },
  { id:"coaching",   label:"Coaching & continuity", weight:3,
    asks:"Who coaches his age group, and will they still be there in two years?" },
  { id:"pathway",    label:"Pro pathway realism",   weight:3,
    asks:"If he is good enough, does this club actually sign players like him?" },
  { id:"school",     label:"Academics",             weight:3,
    asks:"Named school, accredited, NCAA-eligible, and who pays?" },
  { id:"housing",    label:"Housing & welfare",     weight:3,
    asks:"Where does he sleep, and who is responsible for him at 11pm?" },
  { id:"access",     label:"Distance & access",     weight:3,
    asks:"Can we be there — routinely, not heroically?" },
  { id:"cost",       label:"Cost to family",        weight:2,
    asks:"What does a year actually cost us, all in?" },
  { id:"college",    label:"College-route support", weight:2,
    asks:"If he does not sign pro, does this club get him recruited?" },
  { id:"stability",  label:"Club & funding stability", weight:2,
    asks:"Will the academy he joins still be that academy in three years?" },
  { id:"facilities", label:"Facilities & sports science", weight:1.5,
    asks:"Pitches, gym, medical, and who actually gets access to them." },
];

export const DIM = Object.fromEntries(DIMENSIONS.map(d => [d.id, d]));
export const DEFAULT_WEIGHTS = Object.fromEntries(DIMENSIONS.map(d => [d.id, d.weight]));

// Two axes deliberately kept out of the composite, because they answer a
// different question. The dimensions above ask "how good would this be for
// him". These ask "is it going to happen". Averaging the two hides exactly the
// trade-off worth seeing: a strong club that will never take him is worth less
// than a decent one that will.
//
// Odds is about the *place*, not the look. Whether he gets seen is a matter of
// where he lives and how the club scouts; whether he gets taken is a matter of
// how selective the club is and what it needs in his birth year. A club can be
// long odds for either reason.
export const GATES = [
  { id:"odds",        label:"Realistic chance of a place",
    asks:"Given where he lives, how this club recruits and how selective it is, does he get in?" },
  { id:"positionFit", label:"Positional need",
    asks:"Does this club need what he is, in his birth year, in the target season?" },
];

// Where each club sits in the conversation. Ordered — `stageIndex` reads
// position from this array, so inserting a stage mid-list shifts the meaning of
// every record. Append, or update the records too.
export const STAGES = [
  { id:"not-contacted",   label:"Not contacted",    live:true  },
  { id:"form-submitted",  label:"Form submitted",   live:true  },
  { id:"responded",       label:"Responded",        live:true  },
  { id:"in-dialogue",     label:"In dialogue",      live:true  },
  { id:"trial-offered",   label:"Trial offered",    live:true  },
  { id:"visited",         label:"Visited",          live:true  },
  { id:"declined-by-club",label:"Declined by club", live:false },
  { id:"ruled-out-by-us", label:"Ruled out by us",  live:false },
];

export const stageIndex = id => STAGES.findIndex(s => s.id === id);
export const stageIsLive = id => (STAGES.find(s => s.id === id) || {}).live === true;

// What the distance actually costs in a normal week, not in miles.
//
// `travelCost` is the annual family travel budget a tier implies — visits out
// plus his trips home — used as the default for any club without a researched
// cost model. Estimates, and labelled as such everywhere they appear.
export const TRAVEL_TIERS = {
  1: { label:"Daily commute",      detail:"He sleeps at home. No housing question, no schooling question.",
       travelCost:[0, 600] },
  2: { label:"Drivable, 2–4h",     detail:"Weekend visits are easy. Weekday presence is not.",
       travelCost:[1200, 3000] },
  3: { label:"Nonstop under 2.5h", detail:"You fly to watch him. Plan on a real flight budget.",
       travelCost:[2500, 5000] },
  4: { label:"Flight, 2.5–4h",     detail:"A visit costs a weekend.",
       travelCost:[3500, 6500] },
  5: { label:"Transcontinental",   detail:"A visit costs a long weekend and a fare to match.",
       travelCost:[5000, 9000] },
};

// The two depths a club can be researched to.
export const TIERS = {
  "deep-dive": { label:"Deep dive", mark:"●", detail:"A full research report: ten dimensions, cost model, pipeline, questions." },
  "screening": { label:"Screening", mark:"○", detail:"Travel, rank and four screening scores from the original matrix." },
};

// The public ranking the screening tier's soccer score is read from.
export const RANK_SOURCE = {
  name: "US Soccer Collective MLS Academy Rankings",
  date: "2026-08",
  covers: 27,     // US academies assessed
  ranked: 26,     // one assessed but not ranked
  note: "Canadian clubs are outside its scope.",
};

// Firebase node the imported dataset lives under, beneath the app's ROOT.
export const ACADEMIES_NODE = "academies";

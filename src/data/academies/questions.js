// ─────────────────────────────────────────────────────────────────────────────
// The master question bank — asked of every club, not just the ones with a gap
// someone happened to notice.
//
// Each question declares which dimensions it would resolve. That is what turns
// a checklist into a priority: a question aimed at a dimension already
// confirmed is worth nothing, and the same question aimed at a blank on a
// heavily-weighted dimension is worth the most. The engine does that sum per
// club, so the call sheet reorders itself as answers come in.
// ─────────────────────────────────────────────────────────────────────────────

export const MASTER_QUESTIONS = [
  // Soccer -------------------------------------------------------------------
  { id:"q-squad-depth", cat:"soccer", resolves:["soccer","positionFit"],
    q:"How many players are in his birth year, and how deep are you at centre back and in midfield right now?" },
  { id:"q-releases", cat:"soccer", resolves:["soccer","stability"],
    q:"How many players will be released at the end of this year, and how is that decided?" },
  { id:"q-retention", cat:"soccer", resolves:["soccer","pathway"],
    q:"What is the actual retention rate from U15 to U18?" },
  { id:"q-load", cat:"soccer", resolves:["soccer","school"],
    q:"Sessions and matches per week, travel days per season, and school days missed?" },
  { id:"q-coach", cat:"soccer", resolves:["coaching"],
    q:"Who coaches the age group he would enter, and how long have they been in post?" },
  { id:"q-second-team", cat:"soccer", resolves:["pathway"],
    q:"How many academy players got minutes with the second team last season?" },

  // Academics ----------------------------------------------------------------
  { id:"q-school-named", cat:"academics", resolves:["school"],
    q:"Named school, format, and accreditation?" },
  { id:"q-school-cost", cat:"academics", resolves:["school","cost"],
    q:"Who pays tuition, and what does it actually cost us?" },
  { id:"q-ncaa", cat:"academics", resolves:["school","college"],
    q:"Is the academic programme approved by the NCAA Eligibility Center?" },
  { id:"q-study", cat:"academics", resolves:["school"],
    q:"Is there supervised study time or tutoring during the training day?" },
  { id:"q-traditional-school", cat:"academics", resolves:["school"],
    q:"Can he stay on a traditional school schedule instead, and does the training day permit it?" },

  // Living -------------------------------------------------------------------
  { id:"q-residential-count", cat:"living", resolves:["housing"],
    q:"How many residential players do you currently have, and in which age groups?" },
  { id:"q-vetting", cat:"living", resolves:["housing"],
    q:"How are host families vetted and matched, and can we meet ours before committing?" },
  { id:"q-welfare", cat:"living", resolves:["housing"],
    q:"Who is the designated welfare and safeguarding contact — who do we call at 11pm?" },
  { id:"q-flights", cat:"living", resolves:["housing","cost"],
    q:"How many flights home per year, and who pays?" },
  { id:"q-trial-period", cat:"living", resolves:["housing","stability"],
    q:"Is there a trial period before a full-year commitment, and what happens if the placement does not work?" },

  // Medical — the section families skip and regret ----------------------------
  { id:"q-med-cost", cat:"medical", resolves:["cost","housing"],
    q:"Who pays for treatment and surgery for an injury sustained in club training or matches?" },
  { id:"q-med-roster", cat:"medical", resolves:["stability"],
    q:"Does he keep his roster spot while injured?" },
  { id:"q-med-continuity", cat:"medical", resolves:["housing","school"],
    q:"Do housing and schooling continue through a long-term injury?" },
  { id:"q-med-rehab", cat:"medical", resolves:["facilities"],
    q:"Where does rehab happen, and who supervises it?" },

  // The downside — ask before signing, not after ------------------------------
  { id:"q-released-midyear", cat:"downside", resolves:["housing","school","stability"],
    q:"If he is released mid-year, what happens to housing and schooling for the rest of that year?" },
  { id:"q-replacement", cat:"downside", resolves:["college","pathway"],
    q:"Do you help place released players at other clubs?" },
  { id:"q-destinations", cat:"downside", resolves:["pathway","college"],
    q:"Where did your last three U18 classes actually go — pro, college, or out of the game? Names and destinations." },
  { id:"q-college-support", cat:"downside", resolves:["college"],
    q:"How do you support college recruiting for players who will not sign pro?" },

  // Commitment ---------------------------------------------------------------
  { id:"q-trial-process", cat:"commitment", resolves:["odds"],
    q:"What is the trial process and timeline?" },
  { id:"q-paperwork", cat:"commitment", resolves:["stability"],
    q:"What do you ask us to sign, and what does it commit the club to?" },
];

export const QUESTION_CATS = {
  soccer:     "Soccer",
  academics:  "Academics",
  living:     "Living",
  medical:    "Medical",
  downside:   "The downside",
  commitment: "Commitment",
};

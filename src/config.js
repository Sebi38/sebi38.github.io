// Player identity ------------------------------------------------------------
export const PLAYER = {
  firstName: "SEBASTIAN",
  lastName: "HOWELL",
  number: "38",
  team: "ASA 2013 MLSNext",
  // Where he actually plays, shown under his name on the home page.
  positions: [
    { code: "CB",  label: "Center Back" },
    { code: "CAM", label: "Center Attacking Midfielder" },
  ],
};


// Training drill categories
export const CATS = [
  "Shooting",
  "Dribbling / Ball Control",
  "Passing",
  "Defending",
  "Positioning / Tactical",
  "Fitness / Speed",
  "Mental Game",
];

// Positions
export const POS = ["GK","CB","LB","RB","CDM","CM","CAM","LM","RM","LW","RW","ST","CF"];

// Resource categories
export const TRAIN_RES_CATS = ["YouTube / Video","Website","App","Book / Article","Coach / Program"];

// localStorage keys
export const SK = {
  games: "seb38-games",
  highlights: "seb38-highlights",
  training: "seb38-training",
  trainRes: "seb38-train-res",
  coaching: "seb38-coaching",
  journal: "seb38-journal",
  stats: "seb38-stats",
  // The academy dataset, cached whole. Lives at seb38/academies, not under
  // seb38/data: it is one document, not a row collection, and it never goes
  // through the row-merge path.
  academies: "seb38-academies",
  academyWeights: "seb38-academy-weights",
};

// localStorage key -> Firebase node name
export const SK_TO_FB = {
  [SK.games]: "games",
  [SK.highlights]: "highlights",
  [SK.training]: "training",
  [SK.trainRes]: "trainRes",
  [SK.coaching]: "coaching",
  [SK.journal]: "journal",
  [SK.stats]: "stats",
};

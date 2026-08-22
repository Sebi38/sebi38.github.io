// Player identity ------------------------------------------------------------
export const PLAYER = {
  firstName: "SEBASTIAN",
  lastName: "HOWELL",
  number: "38",
  team: "ASA 2013 MLSNext",
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
  journal: "seb38-journal",
  stats: "seb38-stats",
};

// localStorage key -> Firebase node name
export const SK_TO_FB = {
  [SK.games]: "games",
  [SK.highlights]: "highlights",
  [SK.training]: "training",
  [SK.trainRes]: "trainRes",
  [SK.journal]: "journal",
  [SK.stats]: "stats",
};

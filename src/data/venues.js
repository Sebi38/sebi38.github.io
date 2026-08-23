// Pitch surface belongs to the ground, not the match — so it is recorded once
// per venue and applied to every game played there, past and future.
//
// TeamSnap carries no surface information for games (only for FTA training
// sessions), so this cannot be derived from the feed. Each entry below was
// confirmed by hand.
//
// The same ground appears under different names across seasons — "Witter Field"
// in the club's own listings, "2700 Witter Dr, Alexandria" from TeamSnap — so
// matching is by pattern rather than exact string.
export const VENUE_SURFACES = [
  { name: "Maryland Soccerplex",           match: /soccerplex/i,               surface: "grass" },
  { name: "Witter Field",                  match: /witter/i,                   surface: "turf"  },
  { name: "Chase Fields",                  match: /chase\s*field/i,            surface: "turf"  },
  { name: "Covenant Park",                 match: /covenant\s*park/i,          surface: "turf"  },
  { name: "Bermudian Springs Middle School", match: /bermudian springs middle/i, surface: "turf" },
  { name: "Limerick Field",                match: /limerick/i,                 surface: "turf"  },
];

// The surface for a venue string, or null when the ground hasn't been
// confirmed. Null matters: it means "not known", which is different from grass.
export function surfaceForVenue(text = "") {
  const hit = VENUE_SURFACES.find(v => v.match.test(text));
  return hit ? hit.surface : null;
}

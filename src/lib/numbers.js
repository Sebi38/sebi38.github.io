// Form inputs give us strings. Stats are stored as numbers, except for the
// optional fields (score, Taka counts) where "" means "not recorded" and has to
// survive a round trip as "" rather than becoming 0.

export const toInt = v => parseInt(v) || 0;

export const toIntOrBlank = v => (v !== "" && v != null ? parseInt(v) || 0 : "");

// True when an optional numeric field actually holds a value.
export const hasValue = v => v !== "" && v != null;

// "2-1" when both sides are recorded, otherwise null.
export const scoreLine = (f, a) => (hasValue(f) && hasValue(a) ? `${f}-${a}` : null);

// The stat fields that are always numeric.
const REQUIRED_NUMS = ["minutes","goals","assists","shots","sot","passes","tackles"];
// The stat fields where "" is meaningful.
const OPTIONAL_NUMS = ["scoreFor","scoreAgainst","takaPos","takaNeg"];

// Normalise a stats/journal form into stored shape.
export function normalizeStatForm(form) {
  const out = { ...form };
  REQUIRED_NUMS.forEach(k => { out[k] = toInt(form[k]); });
  OPTIONAL_NUMS.forEach(k => { out[k] = toIntOrBlank(form[k]); });
  return out;
}

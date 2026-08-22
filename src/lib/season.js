// Helpers that turn the raw stats/journal rows into the things the UI shows:
// the next fixture, recent form, and season splits.

const today = () => new Date().toISOString().slice(0, 10);

export const isPlayed = g => g.result && g.result !== "—";

// Fixtures still to come, soonest first.
export const upcoming = (stats, from = today()) =>
  stats.filter(g => g.date >= from && !isPlayed(g)).sort((a, b) => a.date.localeCompare(b.date));

// Games already played, most recent first.
export const played = stats =>
  stats.filter(isPlayed).sort((a, b) => b.date.localeCompare(a.date));

export const nextFixture = (stats, from = today()) => upcoming(stats, from)[0] || null;

// Last n results, oldest→newest, for the form strip.
export const form = (stats, n = 5) => played(stats).slice(0, n).reverse();

// Whole-day difference between two YYYY-MM-DD dates.
export function daysUntil(date, from = today()) {
  const a = Date.UTC(...date.split("-").map(Number).map((v, i) => (i === 1 ? v - 1 : v)));
  const b = Date.UTC(...from.split("-").map(Number).map((v, i) => (i === 1 ? v - 1 : v)));
  return Math.round((a - b) / 86400000);
}

export function countdownLabel(date, from = today()) {
  const d = daysUntil(date, from);
  if (d < 0) return null;
  if (d === 0) return "Today";
  if (d === 1) return "Tomorrow";
  if (d < 7) return `In ${d} days`;
  const w = Math.round(d / 7);
  return w === 1 ? "In a week" : `In ${w} weeks`;
}

// "Sat 13 Sep"
export function prettyDate(date) {
  const [y, m, d] = date.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
}

export const monthLabel = date => {
  const [y, m] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1))
    .toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" });
};

// The venue/kickoff string lives in notes (stats) or location (journal).
// Split "Scrimmage · Witter Field · 12:00 PM" into its parts.
export function splitVenue(text = "") {
  const parts = text.split("·").map(s => s.trim()).filter(Boolean);
  const time = parts.find(p => /\d{1,2}:\d{2}\s*(AM|PM)/i.test(p)) || "";
  const tag = parts.find(p => /scrimmage/i.test(p)) || "";
  const venue = parts.filter(p => p !== time && p !== tag).join(" · ");
  return { venue, time, tag };
}

export function record(stats) {
  const p = stats.filter(isPlayed);
  return {
    played: p.length,
    w: p.filter(g => g.result === "W").length,
    d: p.filter(g => g.result === "D").length,
    l: p.filter(g => g.result === "L").length,
    gf: p.reduce((s, g) => s + (Number(g.scoreFor) || 0), 0),
    ga: p.reduce((s, g) => s + (Number(g.scoreAgainst) || 0), 0),
  };
}

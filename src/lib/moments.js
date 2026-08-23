// Match moments were originally one blob of text in `freeform`, with each
// moment on its own line and a timestamp prefix written by Match Day:
//
//     4:35 PM — won a big header
//
// They are now structured so each can be ticked off once it has been seen on
// film. Everything here is tolerant of the old shape, because existing entries
// still hold it and nothing should be lost in translation.

export const momentId = () =>
  Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

// "4:35 PM — won a big header" -> { t: "4:35 PM", text: "won a big header" }
// A line with no timestamp keeps its whole text and an empty time.
export function parseLine(line) {
  const m = line.match(/^\s*(\d{1,2}:\d{2}\s*(?:AM|PM))\s*[—–-]\s*(.*)$/i);
  return m
    ? { t: m[1].trim(), text: m[2].trim() }
    : { t: "", text: line.trim() };
}

// Accepts either shape and always returns the structured one.
export function toMoments(value) {
  if (Array.isArray(value)) {
    return value
      .map(m => (typeof m === "string"
        ? { id: momentId(), ...parseLine(m), reviewed: false }
        : { id: m.id || momentId(), t: m.t || "", text: m.text || "", reviewed: !!m.reviewed }))
      .filter(m => m.text);
  }
  if (typeof value === "string" && value.trim()) {
    return value.split("\n").filter(l => l.trim())
      .map(l => ({ id: momentId(), ...parseLine(l), reviewed: false }));
  }
  return [];
}

// Read whichever field an entry happens to carry.
export const momentsOf = entry => toMoments(entry?.moments ?? entry?.freeform);

export const reviewedCount = ms => ms.filter(m => m.reviewed).length;

export const label = m => (m.t ? `${m.t} — ${m.text}` : m.text);

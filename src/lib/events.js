// Corners, free kicks and shots on goal are captured live with the time they
// happened, the same way match moments are — a count alone loses when in the
// game they came, which is the interesting part.
import { momentId } from './moments.js';

export const EVENT_TYPES = [
  { key: "corner",     label: "Corners",        short: "COR", icon: "⛳" },
  { key: "freeKick",   label: "Free Kicks",     short: "FK",  icon: "🎯" },
  { key: "shotOnGoal", label: "Shots on Goal",  short: "SOG", icon: "⚽" },
];

export function toEvents(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map(e => ({ id: e.id || momentId(), t: e.t || "", type: e.type || "", note: e.note || "" }))
    .filter(e => EVENT_TYPES.some(x => x.key === e.type));
}

export const eventsOf = row => toEvents(row?.events);

export const countOf = (events, type) => events.filter(e => e.type === type).length;

// { corner: 3, freeKick: 1, shotOnGoal: 2 }
export const countsOf = events =>
  Object.fromEntries(EVENT_TYPES.map(t => [t.key, countOf(events, t.key)]));

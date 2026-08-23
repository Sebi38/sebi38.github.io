// A journal entry belongs to a fixture by `statId`. Entries written before that
// link existed carry only a date, so the date is a fallback — but only when
// exactly one *unlinked* entry shares it.
//
// Matching on the date alone is not safe: some days hold two fixtures
// (2025-12-13 is a tournament pair, RSL Arizona and Michigan Jaguars), and a
// loose `statId === id || e.date === date` meant opening the second game
// loaded the first game's reflection and then overwrote it — reassigning its
// statId and merging the two games' moments, with the first game's reflection
// silently orphaned. Every page must resolve entries through here.
export function findEntry(journal, statId, date) {
  const list = journal || [];
  const direct = list.find(e => e.statId === statId);
  if (direct) return direct;
  if (!date) return null;
  const sameDay = list.filter(e => !e.statId && e.date === date);
  return sameDay.length === 1 ? sameDay[0] : null;
}

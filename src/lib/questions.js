// Questions for coaches are typed as free text — one per line — because that is
// the lowest-friction thing to ask a 13-year-old to do after a match. They are
// read back as a structured list so each can be ticked off once answered.
//
// Tolerant of both shapes at read time, so no migration is needed: entries
// written as plain text keep working.
import { momentId } from './moments.js';

export function toQuestions(value) {
  if (Array.isArray(value)) {
    return value
      .map(q => (typeof q === "string"
        ? { id: momentId(), text: q.trim(), answered: false }
        : { id: q.id || momentId(), text: (q.text || "").trim(), answered: !!q.answered }))
      .filter(q => q.text);
  }
  if (typeof value === "string" && value.trim()) {
    return value.split("\n").map(l => l.trim()).filter(Boolean)
      .map(text => ({ id: momentId(), text, answered: false }));
  }
  return [];
}

export const questionsOf = entry => toQuestions(entry?.questionsForCoaches);

// Back to the plain text Sebi edits.
export const questionsToText = qs => qs.map(q => q.text).join("\n");

// Re-parse edited text while keeping the answered flags of lines that survived.
export function mergeQuestionText(text, previous = []) {
  const prior = new Map(previous.map(q => [q.text, q]));
  return toQuestions(text).map(q => {
    const was = prior.get(q.text);
    return was ? { ...q, id: was.id, answered: was.answered } : q;
  });
}

export const openCount = qs => qs.filter(q => !q.answered).length;

// Coaching sessions — the structured record of someone working with Sebi
// directly, as opposed to a link he can go and read.
//
// Two things used to be filed as Training "Resources" that are really sessions:
// the GIKA10 1:1 reviews (a Fathom recording per week) and the First Touch Aid
// academy Zooms. A resource is something to look up; a session happened on a
// date and has content. They now live together under Coaching, newest first.

export const KINDS = {
  gika10: { key: "gika10", label: "GIKA10", who: "Yannick van der Putten", color: "violet" },
  fta:    { key: "fta",    label: "FTA",    who: "First Touch Aid",        color: "teal"   },
};

export const kindLabel = k => KINDS[k]?.label || "Session";

const MONTHS = ["jan","feb","mar","apr","may","jun","jul","aug","sep","oct","nov","dec"];

// "FTA Zoom recording · 13 Apr 2026" -> "2026-04-13". Also reads an id that
// already carries the date ("gika-2026-03-30").
export function dateFromRow(row = {}) {
  if (row.date) return row.date;
  const idDate = String(row.id || "").match(/(\d{4})-(\d{2})-(\d{2})/);
  if (idDate) return idDate[0];
  const hay = `${row.notes || ""} ${row.title || ""}`;
  const m = hay.match(/(\d{1,2})\s+([A-Za-z]{3})[a-z]*\s+(\d{4})/);
  if (!m) return "";
  const mi = MONTHS.indexOf(m[2].toLowerCase().slice(0, 3));
  if (mi < 0) return "";
  const pad = n => String(n).padStart(2, "0");
  return `${m[3]}-${pad(mi + 1)}-${pad(Number(m[1]))}`;
}

// Which kind of session a Training resource actually is, or null if it is a
// genuine resource and should stay put.
//
// Deliberately narrow. Several real resources merely *mention* FTA — the centre
// back masterclass playlist, the ball mastery program FTA recommended, the
// playlists that accompany a session. Those are things to go and watch, not
// sessions that happened, so only a row that is itself a session moves.
export function sessionKind(row = {}) {
  const id = String(row.id || "");
  const title = String(row.title || "");
  const notes = String(row.notes || "");
  const link = String(row.link || row.shareUrl || "");

  if (id.startsWith("gika-") || /gika\s*10/i.test(`${title} ${notes}`) ||
      /fathom\.video/i.test(link)) return "gika10";

  if (id.startsWith("res-fta-session-") || /^FTA Session\b/i.test(title.trim()) ||
      /FTA Zoom recording/i.test(notes)) return "fta";

  return null;
}

// What is left of a resource's note once the card is already showing it.
// "FTA Zoom recording · 4 May 2026" carries no information the card does not
// have: the date is its own field and the format is implied by the badge.
const BOILERPLATE = /^(FTA\s+Zoom\s+recording|GIKA10(\s+session)?)$/i;

const noteToPurpose = text => {
  const t = String(text)
    .replace(/\s*·?\s*\d{1,2}\s+[A-Za-z]{3}[a-z]*\s+\d{4}\s*$/, "")
    .replace(/\s*·\s*$/, "")
    .trim();
  return BOILERPLATE.test(t) ? "" : t;
};

// A Training resource, rewritten as a coaching session. The imported Fathom
// recaps already have this shape; this gives the moved rows the same one so a
// single list can render both.
export function toSession(row = {}, kind = sessionKind(row)) {
  const date = dateFromRow(row);
  return {
    id: row.id,
    kind,
    date,
    minutes: null,
    title: row.title || kindLabel(kind),
    // The note usually ends with the date ("FTA Zoom recording · 4 May 2026").
    // The card shows the date already, so drop it rather than say it twice.
    purpose: noteToPurpose(row.notes || ""),
    shareUrl: row.link || "",
    takeaways: [], topics: [], nextSteps: [], actionItems: [],
    movedFrom: "trainRes",
  };
}

// Anything already in Coaching that arrived as a Fathom recap is GIKA10 —
// those rows predate the `kind` field.
export const kindOf = s => s?.kind || (s?.shareUrl?.includes("fathom.video") ? "gika10" : "gika10");

// Merge moved rows into the existing coaching list without creating a second
// copy of a session that is already there in fuller form. The March 30 GIKA10
// recap, for instance, exists both as a bare link in Resources and as a fully
// parsed session — the parsed one wins.
export function mergeSessions(existing = [], incoming = []) {
  const out = [...existing];
  const hasUrl = url => url && out.some(s => s.shareUrl === url);
  const hasDate = (kind, date) =>
    date && out.some(s => kindOf(s) === kind && s.date === date);

  for (const row of incoming) {
    if (hasUrl(row.shareUrl) || hasDate(row.kind, row.date)) continue;
    out.push(row);
  }
  return out;
}

export const byDateDesc = (a, b) => String(b.date || "").localeCompare(String(a.date || ""));

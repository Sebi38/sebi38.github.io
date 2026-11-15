// Film links — Veo full-match recordings and Taka highlights — are personal,
// so they live only in the database behind the login, never in this public
// repository. They arrive as a small JSON file picked on the Matches tab
// ("Import film"), read in the browser and saved straight to the database.
//
// Bundle shape (an array of links on its own is accepted too):
//   { "kind": "film-links",
//     "links": [ { "date": "2026-11-08", "opponent": "Sporting Athletic",
//                  "veo": "https://app.veo.co/matches/…/", "taka": "https://…taka.io/…" } ] }
//
// An import only ever fills a link that is empty. A link already on a match is
// kept, even if the file disagrees, so re-importing the same file is harmless
// and nothing typed in by hand is overwritten.

import { findEntry } from './journal.js';
import { gid } from './storage.js';

const DATE = /^\d{4}-\d{2}-\d{2}$/;

// Only the services' own hosts. A typo'd or pasted-in-the-wrong-column link is
// refused rather than shown as a film button.
const HOSTS = {
  veo:  host => host === 'app.veo.co' || host === 'veo.co' || host.endsWith('.veo.co'),
  taka: host => host === 'taka.io' || host.endsWith('.taka.io'),
};

function cleanLink(kind, value) {
  if (!value) return '';
  try {
    const u = new URL(String(value).trim());
    return u.protocol === 'https:' && HOSTS[kind](u.hostname) ? u.href : null;
  } catch {
    return null;
  }
}

export function parseFilmBundle(raw) {
  const t = (raw || '').trim();
  if (!t) return { ok: false, error: 'That file is empty.' };
  let data;
  try { data = JSON.parse(t); } catch { return { ok: false, error: "That isn't a film-links file." }; }
  const list = Array.isArray(data) ? data : data?.links;
  if (!Array.isArray(list) || !list.length) return { ok: false, error: 'No film links in that file.' };

  const links = [], rejected = [];
  for (const l of list) {
    const date = String(l?.date || '');
    const veo = cleanLink('veo', l?.veo);
    const taka = cleanLink('taka', l?.taka);
    if (!DATE.test(date) || veo === null || taka === null || (!veo && !taka)) {
      rejected.push({ date, reason: !DATE.test(date) ? 'no date' : 'not a Veo or Taka link' });
      continue;
    }
    links.push({ date, opponent: String(l.opponent || ''), veo, taka });
  }
  if (!links.length) return { ok: false, error: 'None of the links in that file could be used.' };
  return { ok: true, links, rejected };
}

// Same opponent, allowing for how differently clubs get written down
// ("Baltimore Armour 2013 HG" against "Baltimore Armour").
const norm = s => (s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const sameOpponent = (a, b) => {
  const x = norm(a), y = norm(b);
  return !!x && !!y && (x.includes(y) || y.includes(x));
};

// Works out what an import would do, without changing anything.
export function planFilmImport(stats, journal, links) {
  const fills = [], unchanged = [], unmatched = [];
  for (const l of links) {
    let games = (stats || []).filter(s => s.date === l.date);
    if (games.length > 1 && l.opponent) games = games.filter(s => sameOpponent(s.opponent, l.opponent));
    if (games.length !== 1) {
      unmatched.push({ ...l, reason: games.length ? 'two matches that day' : 'no match on that date' });
      continue;
    }
    const game = games[0];
    const e = findEntry(journal, game.id, game.date) || {};
    const has = { veoLink: e.veoLink || game.veoLink || '', takaLink: e.takaLink || game.takaLink || '' };
    const set = {}, kept = [];
    if (l.veo)  { if (!has.veoLink)  set.veoLink = l.veo;   else kept.push('Veo'); }
    if (l.taka) { if (!has.takaLink) set.takaLink = l.taka; else kept.push('Taka'); }
    const row = { statId: game.id, date: game.date, opponent: game.opponent, set, kept };
    (Object.keys(set).length ? fills : unchanged).push(row);
  }
  return { fills, unchanged, unmatched };
}

// Applies a plan to the journal, where the match cards read film links from.
// A match with no journal entry yet gets one carrying only the links — no
// placeholder rating, so it doesn't show a score Sebi never gave.
export function applyFilmImport(journal, plan) {
  let next = [...(journal || [])];
  for (const f of plan.fills) {
    const e = findEntry(next, f.statId, f.date);
    if (e) {
      next = next.map(x => x.id === e.id ? { ...x, ...f.set } : x);
    } else {
      next = [{ id: gid(), statId: f.statId, date: f.date, opponent: f.opponent,
                veoLink: '', takaLink: '', ...f.set,
                wentWell: '', toImprove: '', questionsForCoaches: '', moments: [] }, ...next];
    }
  }
  return next;
}

#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// The academy search, printed — from the private data, on this machine only.
//
//   npm run academies              the full brief
//   npm run academies -- --md      also writes private/academies/academy-search.md
//   npm run academies -- --export  writes private/academies/bundle.json for the site
//   npm run academies -- --json    the scored matrix, for taking back into a chat
//   npm run academies -- --warn    include schema warnings
//
// Reads private/academies/{screening,research,player}.js. Those files are
// gitignored: this repo is public and the site is a static bundle, so the only
// place the data may live online is Firebase, behind sign-in. The bundle this
// writes is what the Academies tab imports.
// ─────────────────────────────────────────────────────────────────────────────

import { writeFileSync, existsSync } from 'node:fs';
import { mergeTiers, matrix, health, globalCallSheet, callSheet, calendar, promotions, DIMENSIONS, TIERS }
  from '../src/lib/academies.js';
import { TRAVEL_TIERS, RANK_SOURCE } from '../src/data/academies/meta.js';
import { check } from '../src/lib/academies-check.js';

const args = process.argv.slice(2);
const has = f => args.includes(f);
const TODAY = new Date().toISOString().slice(0, 10);
const PRIVATE = new URL('../private/academies/', import.meta.url);

// ── Load the private data ────────────────────────────────────────────────────
if (!existsSync(new URL('screening.js', PRIVATE))) {
  console.error("\nNo private/academies/screening.js — the academy data is not on this machine.");
  console.error("It is gitignored on purpose. Restore it from wherever you keep it, then run again.\n");
  process.exit(2);
}
const [{ SCREENING }, { RESEARCH }, { PLAYER_SEARCH, BLOCKERS, KEY_DATES }] = await Promise.all([
  import(new URL('screening.js', PRIVATE)),
  import(new URL('research.js', PRIVATE)),
  import(new URL('player.js', PRIVATE)),
]);
const dataset = {
  version: 1,
  exported: TODAY,
  player: PLAYER_SEARCH,
  blockers: BLOCKERS,
  keyDates: KEY_DATES,
  clubs: mergeTiers(SCREENING, RESEARCH),
};

// ── Validate before anything else ────────────────────────────────────────────
// A report built on broken data is worse than no report, because it looks fine.
const v = check(dataset);
if (!v.ok) {
  console.error(`\n${v.errors.length} problem${v.errors.length > 1 ? "s" : ""} in the academy data:\n`);
  for (const e of v.errors) console.error("  ✗ " + e);
  console.error("");
  process.exit(1);
}

// ── Export the bundle for the site ───────────────────────────────────────────
if (has('--export')) {
  const out = new URL('bundle.json', PRIVATE);
  writeFileSync(out, JSON.stringify(dataset, null, 2) + "\n");
  console.log(`→ wrote private/academies/bundle.json (${dataset.clubs.length} clubs). Import it from the Academies tab.`);
  if (!has('--md') && !has('--json')) process.exit(0);
}

// ── Plumbing ─────────────────────────────────────────────────────────────────
const P = { dim:"\x1b[2m", b:"\x1b[1m", r:"\x1b[0m", red:"\x1b[31m", grn:"\x1b[32m", yel:"\x1b[33m" };
const plain = !process.stdout.isTTY || has('--no-color');
const c = (code, s) => (plain ? String(s) : code + s + P.r);
const pad = (s, n) => String(s).padEnd(n).slice(0, n);
const lpad = (s, n) => String(s).padStart(n);
const rule = (n = 78) => c(P.dim, "─".repeat(n));
const head = t => `\n${c(P.b, t.toUpperCase())}\n${rule()}`;
const dimLabel = id => DIMENSIONS.find(d => d.id === id)?.label || id;
const money = n => n == null ? "?" : n === 0 ? "$0" : "$" + n.toLocaleString();
const costBand = k => k.complete ? `${money(k.low)}–${money(k.high)}`
  : `${money(k.low)}–${k.high > 0 ? money(k.high) + "+" : "?"}  (${k.open.join(", ")} open)`;
const bar = (v, max = 5, w = 10) => { const n = Math.round((v / max) * w); return c(P.dim, "▰".repeat(n) + "▱".repeat(w - n)); };
const days = n => n == null ? "" : n < 0 ? c(P.red, `${-n}d overdue`) : n <= 30 ? c(P.yel, `${n}d`) : c(P.dim, `${n}d`);
const tierMark = r => r.tier === "deep-dive" ? c(P.b, TIERS["deep-dive"].mark) : c(P.dim, TIERS.screening.mark);

const clubs = dataset.clubs;
const h = health(clubs);
const rows = matrix(clubs, { today: TODAY });
const deep = rows.filter(r => r.tier === "deep-dive");
const promo = promotions(clubs);
const calls = globalCallSheet(clubs, { limit: 8, perClub: 4 });
const cal = calendar(dataset.keyDates, TODAY);
const blockers = [...dataset.blockers].sort((a, z) => a.dueBy.localeCompare(z.dueBy));
const corr = deep.filter(r => r.corrections?.length);

// ── JSON export of the scored matrix ─────────────────────────────────────────
if (has('--json')) {
  console.log(JSON.stringify({
    generated: TODAY, player: dataset.player, rankSource: RANK_SOURCE, health: h, blockers, calendar: cal,
    matrix: rows.map(r => ({
      id: r.id, name: r.name, city: r.city, country: r.country, tier: r.tier, blocked: r.blocked || null,
      rank: r.rank, travelTier: r.travelTier, travelNote: r.travelNote, stage: r.pipeline?.stage || null,
      ...r.computed, screening: r.screening, scores: r.scores || null, gates: r.gates || null,
      assessment: r.assessment || null, risks: r.risks || null, corrections: r.corrections || null,
      calls: callSheet(r, { limit: 5 }),
    })),
    promotions: promo.map(r => ({ id: r.id, name: r.name, ev: r.computed.expectedValue, outscores: r.outscores, carriedBy: r.carriedBy })),
  }, null, 2));
  process.exit(0);
}

// ── The report ───────────────────────────────────────────────────────────────
const lines = [];
const say = (s = "") => lines.push(s);
const p = dataset.player;

say(`\n${c(P.b, "ACADEMY SEARCH")}  ${c(P.dim, `· ${TODAY} · ${p.birthYear} · target ${p.ageGroupTarget} ${p.targetSeason}`)}`);
say(rule());
say(`${h.clubs} clubs · ${c(P.b, h.deepDive)} in deep research · ${h.blocked} blocked · ${c(P.b, h.avgCoverage + "%")} of the deep-dive decision evidenced · ${h.contacted} contacted`);
if (h.unreliable.length) say(c(P.yel, `Too thin to rank honestly: ${h.unreliable.join(", ")}`));
if (h.noRoute.length) say(c(P.red, `No way in on file — no form, no email: ${h.noRoute.join(", ")}`));
if (v.warnings.length && has('--warn')) { say(""); for (const w of v.warnings) say(c(P.dim, "  ! " + w)); }

say(head("ours to decide"));
say(c(P.dim, "Nobody else can answer these, and they gate the outreach."));
say("");
for (const b of blockers) {
  const d = Math.round((new Date(b.dueBy) - new Date(TODAY)) / 86400000);
  say(`  ${c(P.b, b.title)}  ${days(d)} ${c(P.dim, "· by " + b.dueBy)}`);
  say(`  ${c(P.dim, "blocks:")} ${b.blocks}`);
  say("");
}

say(head("the matrix"));
say(c(P.dim, `${TIERS["deep-dive"].mark} deep dive · ${TIERS.screening.mark} screening. Fit is the weighted score with confidence priced in;`));
say(c(P.dim, "odds is the chance of a place; EV is fit × odds — the sort order. Ev'd is how much"));
say(c(P.dim, "of the score is evidenced. A screening club sits near the prior on fit; its EV is mostly odds."));
say("");
say(c(P.dim, "   " + pad("club", 25) + lpad("fit", 5) + lpad("odds", 6) + lpad("EV", 6) + lpad("ev'd", 6) + lpad("rank", 6) + "  travel"));
for (const r of rows) {
  const k = r.computed, thin = k.coverage < 60;
  const fit = thin ? c(P.dim, lpad(k.adjusted.toFixed(2), 5)) : lpad(k.adjusted.toFixed(2), 5);
  const cov = thin ? c(P.dim, lpad(k.coverage + "%", 6)) : lpad(k.coverage + "%", 6);
  const rank = r.rank.value ? lpad("#" + r.rank.value, 6) : c(P.dim, lpad("—", 6));
  const name = r.blocked ? c(P.dim, pad(r.name, 25)) : (r.tier === "deep-dive" ? c(P.b, pad(r.name, 25)) : pad(r.name, 25));
  const ev = r.blocked ? c(P.dim, lpad("0", 6)) : c(P.b, lpad(k.expectedValue.toFixed(2), 6));
  say(` ${tierMark(r)} ${name}${fit}${lpad(k.odds.toFixed(1), 6)}${ev}${cov}${rank}  ${c(P.dim, `T${r.travelTier} ${r.travelNote}`)}${r.blocked ? c(P.red, "  Article 19") : ""}`);
}
say("");
say(c(P.dim, `  Rank: ${RANK_SOURCE.name}, ${RANK_SOURCE.date}. ${RANK_SOURCE.ranked} US clubs ranked; ${RANK_SOURCE.note}`));

say(head("screening clubs outscoring the shortlist"));
if (!promo.length) say(c(P.dim, "None. Every club being pursued outscores every club that is not."));
else {
  say(c(P.dim, `Above ${promo[0].outscores} (EV ${promo[0].floor.toFixed(2)}), the weakest club being actively pursued. Either`));
  say(c(P.dim, "promote them to a research record or write down why not. \"Odds\" means the score is"));
  say(c(P.dim, "carried by national reach or the drivable rule, not by anything known about the club."));
  say("");
  for (const r of promo) {
    const k = r.computed;
    say(`  ${c(P.b, pad(r.name, 24))} EV ${k.expectedValue.toFixed(2)}  fit ${k.adjusted.toFixed(2)}  odds ${k.odds.toFixed(1)}  ${c(P.dim, `#${r.rank.value ?? "—"} · T${r.travelTier} · carried by ${r.carriedBy}`)}`);
    say(`    ${c(P.dim, r.screening.summary)}`);
  }
}

say(head(`the ${deep.length}, club by club`));
for (const r of deep) {
  const k = r.computed;
  say(`${c(P.b, r.name)} ${c(P.dim, "· " + r.city + " · " + (r.rank.value ? `#${r.rank.value}/${r.rank.of}` : "unranked"))}`);
  say(`  fit ${bar(k.adjusted)} ${k.adjusted.toFixed(2)}    odds ${bar(k.odds)} ${k.odds.toFixed(1)}    evidenced ${k.coverage}%`);
  if (k.faith >= 0.1) say(c(P.yel, `  ${k.faith.toFixed(2)} of that fit is unverified claim.`));
  if (k.blanks.length) say(`  ${c(P.dim, "blank:")} ${k.blanks.map(dimLabel).join(", ")}`);
  if (k.divergences.length) say(`  ${c(P.dim, "screening vs research:")} ${k.divergences.map(d => `${dimLabel(d.dim)} ${d.screening}→${d.research}`).join(" · ")}`);
  say(`  ${c(P.dim, "cost/yr:")} ${costBand(k.cost)}`);
  if (r.research?.posture === "gated") say(`  ${c(P.yel, "gated:")} ${r.research.gatedOn}`);
  const top = callSheet(r, { limit: 1 });
  if (top.length) say(`  ${c(P.dim, "ask first:")} ${top[0].q}`);
  say("");
}

say(head("the call sheet"));
say(c(P.dim, "Clubs in the order worth phoning. A club is scored on what one conversation settles —"));
say(c(P.dim, "a decisive answer is worth the club's whole candidacy, divided by how hard it is to get."));
say("");
calls.forEach((g, i) => {
  say(`${lpad(i + 1, 3)}. ${c(P.b, pad(g.club, 21))} ${c(P.dim, `value ${g.weighted}`)}${g.posture === "gated" ? c(P.yel, "  gated") : ""}`);
  if (g.gatedOn) say(`     ${c(P.yel, "gate:")} ${g.gatedOn}`);
  for (const q of g.questions) {
    const tag = q.decisive ? c(P.red, "★") : q.blocking ? c(P.red, "●") : c(P.dim, "○");
    say(`     ${tag} ${c(P.dim, pad(q.effort, 7))}${q.q}`);
  }
  say("");
});
say(c(P.dim, "  ★ decisive — the answer puts the club on the list or takes it off."));
say(c(P.dim, "  ● blocking · ○ clarifying · effort is how hard the answer is to come by."));

say(head("the calendar"));
for (const d of cal) {
  say(`  ${d.hard ? c(P.red, "■") : c(P.dim, "□")} ${pad(d.date, 12)} ${pad(d.label, 26)} ${days(d.daysAway)}`);
  say(`    ${c(P.dim, d.detail)}`);
}

if (corr.length) {
  say(head("changed from the source research"));
  say(c(P.dim, "Numbers that disagreed with the prose they were sitting next to."));
  say("");
  for (const r of corr) for (const x of r.corrections) {
    say(`  ${c(P.b, r.name)} · ${x.field}: ${c(P.dim, x.was)} → ${c(P.grn, x.now)}`);
    say(`    ${x.why}`);
    say("");
  }
}

console.log(lines.join("\n"));

// ── Markdown, to the private folder ──────────────────────────────────────────
if (has('--md')) {
  const md = [];
  md.push(`# Academy search\n`);
  md.push(`_Generated ${TODAY} from \`private/academies/\`. Edit the data, not this file._\n`);
  md.push(`**${h.clubs} clubs · ${h.deepDive} in deep research · ${h.blocked} blocked · ${h.avgCoverage}% of the deep-dive decision evidenced · ${h.contacted} contacted**\n`);
  if (h.noRoute.length) md.push(`> **No way in on file** — no interest form and no email for: ${h.noRoute.join(", ")}. That is the first piece of work, not a research gap.\n`);
  md.push(`\n## Ours to decide\n`);
  md.push(`| By | Decision | Blocks |`); md.push(`|---|---|---|`);
  for (const b of blockers) md.push(`| ${b.dueBy} | ${b.title} | ${b.blocks} |`);
  md.push(`\n## The matrix\n`);
  md.push(`All ${h.clubs} MLS academies. ● deep dive · ○ screening. Fit is the weighted score with confidence priced in; odds is the chance of a place; EV is fit × odds. "Evidenced" is the share of the weighted decision resting on something somebody checked — a screening club sits near the prior on fit, so its EV is mostly odds.\n`);
  md.push(`| | Club | Fit | Odds | EV | Evidenced | Rank | Travel |`); md.push(`|---|---|---:|---:|---:|---:|---:|---|`);
  for (const r of rows) {
    const k = r.computed;
    md.push(`| ${TIERS[r.tier].mark} | ${r.tier === "deep-dive" ? `**${r.name}**` : r.name}${r.blocked ? " _(Article 19)_" : ""} | ${k.adjusted.toFixed(2)} | ${k.odds.toFixed(1)} | ${r.blocked ? "0" : k.expectedValue.toFixed(2)} | ${k.coverage}% | ${r.rank.value ? "#" + r.rank.value : "—"} | T${r.travelTier} ${r.travelNote} |`);
  }
  md.push(`\nRank: ${RANK_SOURCE.name}, ${RANK_SOURCE.date}. ${RANK_SOURCE.ranked} US clubs ranked; ${RANK_SOURCE.note}\n`);
  md.push(`\n## Screening clubs outscoring the shortlist\n`);
  if (!promo.length) md.push(`None.\n`);
  else {
    md.push(`Above ${promo[0].outscores} (EV ${promo[0].floor.toFixed(2)}), the weakest club being actively pursued. Either promote them to a research record or write down why not. "Carried by odds" means the score rests on national reach or the drivable rule, not on anything known about the club.\n`);
    md.push(`| Club | EV | Fit | Odds | Rank | Travel | Carried by | |`); md.push(`|---|---:|---:|---:|---:|---|---|---|`);
    for (const r of promo) { const k = r.computed; md.push(`| **${r.name}** | ${k.expectedValue.toFixed(2)} | ${k.adjusted.toFixed(2)} | ${k.odds.toFixed(1)} | ${r.rank.value ? "#" + r.rank.value : "—"} | T${r.travelTier} | ${r.carriedBy} | ${r.screening.summary} |`); }
  }
  md.push(`\n## The ${deep.length}, club by club\n`);
  for (const r of deep) {
    const k = r.computed;
    md.push(`### ${r.name}\n`);
    md.push(`${r.rank.value ? `#${r.rank.value} of ${r.rank.of}` : "Unranked"} · ${r.city} · ${TRAVEL_TIERS[r.travelTier].label}\n`);
    md.push(`Fit **${k.adjusted.toFixed(2)}** · odds **${k.odds.toFixed(1)}** · evidenced **${k.coverage}%**${k.faith >= 0.1 ? ` · ${k.faith.toFixed(2)} of the fit is unverified claim` : ""}\n`);
    md.push(`${r.assessment}\n`);
    if (k.blanks.length) md.push(`**Blank:** ${k.blanks.map(dimLabel).join(", ")}\n`);
    if (k.divergences.length) md.push(`**Screening vs research:** ${k.divergences.map(d => `${dimLabel(d.dim)} ${d.screening} → ${d.research}`).join(" · ")}\n`);
    md.push(`**Cost/yr:** ${costBand(k.cost)}\n`);
    if (r.research?.posture === "gated") md.push(`> **Gated:** ${r.research.gatedOn}\n`);
    md.push(`**Ask first:**\n`);
    for (const q of callSheet(r, { limit: 5 })) md.push(`- ${q.decisive ? "★ " : ""}${q.blocking ? "**" : ""}${q.q}${q.blocking ? "**" : ""}`);
    md.push(``);
    if (r.risks?.length) { md.push(`**Risks:**\n`); for (const x of r.risks) md.push(`- ${x}`); md.push(``); }
  }
  md.push(`\n## The call sheet\n`);
  md.push(`Clubs in the order worth phoning. A club is scored on what one conversation settles — a decisive answer (★) is worth the club's whole candidacy, divided by how hard it is to get.\n`);
  calls.forEach((g, i) => {
    md.push(`**${i + 1}. ${g.club}** — value ${g.weighted}${g.posture === "gated" ? " · _gated_" : ""}`);
    if (g.gatedOn) md.push(`> **Gate:** ${g.gatedOn}`);
    md.push(``);
    for (const q of g.questions) md.push(`- ${q.decisive ? "★" : q.blocking ? "●" : "○"} _${q.effort}_ — ${q.q}`);
    md.push(``);
  });
  md.push(`\n## Calendar\n`);
  md.push(`| Date | | Away | Detail |`); md.push(`|---|---|---:|---|`);
  for (const d of cal) md.push(`| ${d.date} | ${d.hard ? "**" + d.label + "**" : d.label} | ${d.daysAway}d | ${d.detail} |`);
  md.push(`\n## Changed from the source research\n`);
  for (const r of corr) for (const x of r.corrections) md.push(`- **${r.name} · ${x.field}:** ${x.was} → ${x.now}. ${x.why}`);
  writeFileSync(new URL('academy-search.md', PRIVATE), md.join("\n") + "\n");
  console.log(c(P.grn, "\n→ wrote private/academies/academy-search.md"));
}

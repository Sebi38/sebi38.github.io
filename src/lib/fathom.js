// Parses a Fathom "Recap of your meeting with GIKA10" email into structured
// form, so coaching sessions live in the app rather than only as a link out.
//
// Runs entirely in the browser on text you paste. The recaps are personal
// coaching notes, so they are never stored in this repository — they go
// straight to the database, which requires a login.
//
// Fathom's emails follow a fixed template: a one-paragraph digest at the top,
// then meta (date • duration • link), Action Items, and an expanded
// "Meeting Summary" with Meeting Purpose / Key Takeaways / Topics / Next Steps.
// The expanded section is the one worth reading, so that is what we parse.

// Fathom recaps arrive in two shapes depending on how they were forwarded:
//
//   Gmail on the web — plain text, <https://…> links, "-" bullets on their own
//   lines, hard-wrapped at ~72 characters.
//
//   Forwarded from an iPhone — markdown: "##"/"###" headings, "*" bullets run
//   together on one long line, []( … ) links, and "| |" table scaffolding.
//
// Both are normalised to one shape here so the rest of the parser only has to
// understand a single format.
const stripLinks = t => t
  .replace(/<https?:\/\/[^>]*>/g, "")        // angle-bracketed links
  .replace(/\[[^\]]*\]\(https?:\/\/[^)]*\)/g, "")  // markdown links
  .replace(/\[image:[^\]]*\]/g, "");

const normalise = t => t
  .replace(/^\s*\|[\s|-]*$/gm, "")            // empty table rows
  .replace(/^\s*\|\s?/gm, "")                 // leading table pipes
  .replace(/\s\|\s*$/gm, "")                  // trailing pipes
  .replace(/\s*###?\s+/g, "\n")               // markdown headings -> line breaks
  .replace(/\s+\*\s+/g, "\n- ")              // markdown bullets -> dash bullets
  .replace(/\n{3,}/g, "\n\n");

const clean = t => t
  .replace(/\*/g, "")                         // Fathom's *bold* markers
  .replace(/ /g, " ")
  .replace(/[ \t]+/g, " ")
  .trim();

// "April 27, 2026 • 58 mins" -> { date: "2026-04-27", minutes: 58 }
const MONTHS = ["january","february","march","april","may","june","july",
                "august","september","october","november","december"];
function parseMeta(text) {
  const m = text.match(/([A-Z][a-z]+)\s+(\d{1,2}),\s*(\d{4})\s*•\s*(\d+)\s*mins?/);
  if (!m) return { date: "", minutes: null };
  const mi = MONTHS.indexOf(m[1].toLowerCase());
  if (mi < 0) return { date: "", minutes: Number(m[4]) };
  const pad = n => String(n).padStart(2, "0");
  return { date: `${m[3]}-${pad(mi + 1)}-${pad(Number(m[2]))}`, minutes: Number(m[4]) };
}

// Pull the block between one heading and the next.
function section(text, start, ends) {
  const s = text.indexOf(start);
  if (s < 0) return "";
  const from = s + start.length;
  let to = text.length;
  for (const e of ends) {
    const i = text.indexOf(e, from);
    if (i >= 0 && i < to) to = i;
  }
  return text.slice(from, to);
}

// Fathom writes each bullet as a lone "-" on its own line followed by the text.
// The email is hard-wrapped at ~72 characters, so one bullet spans several
// lines — split on the markers and rejoin each chunk, or every wrapped line
// becomes its own fragment.
function bullets(block) {
  const out = [];
  for (const rawLine of block.split("\n")) {
    const line = clean(rawLine);
    if (!line) continue;
    if (line === "-") { out.push(""); continue; }      // lone separator: start a bullet
    if (/^-\s+/.test(line)) { out.push(line.replace(/^-\s+/, "")); continue; }
    // A continuation of the bullet above — the email wrapped it.
    if (out.length) out[out.length - 1] = (out[out.length - 1] + " " + line).trim();
    else out.push(line);
  }
  return out
    .map(t => clean(t))
    // Drop the bare owner headings ("Sebi:", "Yannick:") that label a group.
    .filter(t => t.length > 3 && !/^(Sebi|Yannick|Marina|Sean)\s*:?$/i.test(t));
}

// Action items are laid out differently from the summary bullets: no dashes,
// just item text, then the deep link, then whose job it is. So the links are
// the delimiter — which means parsing this block before they are stripped.
const NAME_LINE = /^[A-Z][a-z]+(?:\s+(?:van|der|de|von|[A-Z][a-z]+))+$/;

function parseActionItems(raw) {
  const block = section(raw, "Action Items", ["Meeting Summary"]);
  if (!block) return [];
  return block
    // Either link syntax ends an item; the owner's name follows it.
    .split(/<https?:\/\/[^>]*>|\[[^\]]*\]\(https?:\/\/[^)]*\)/)
    .map(chunk => chunk.split("\n")
      .map(l => clean(l)
        .replace(/^\|+\s*/, "").replace(/\s*\|+$/, "")   // markdown table pipes
        .replace(/^✨\s*/, "").trim())
      .filter(l => l && l !== "|" && !NAME_LINE.test(l))  // drop the owner's name
      .join(" "))
    .map(t => clean(t).replace(/^\|+\s*/, "").replace(/\s*\|+$/, "").trim())
    .filter(t => t.length > 3);
}

// A bundle is several already-parsed sessions in one JSON payload, so a
// backlog can be brought in with a single paste instead of one email at a time.
export function parseBundle(raw) {
  const t = (raw || "").trim();
  if (!t.startsWith("{") && !t.startsWith("[")) return null;
  try {
    const data = JSON.parse(t);
    const list = Array.isArray(data) ? data : data.sessions;
    if (!Array.isArray(list) || !list.length) return null;
    return list
      .filter(s => s && (s.shareUrl || s.date || s.takeaways?.length))
      .map(s => ({
        ok: true, error: "",
        date: s.date || "", minutes: s.minutes ?? null,
        shareUrl: s.shareUrl || "", title: s.title || "GIKA10 session",
        purpose: s.purpose || "",
        takeaways: s.takeaways || [], topics: s.topics || [],
        nextSteps: s.nextSteps || [], actionItems: s.actionItems || [],
      }));
  } catch {
    return null;
  }
}

export function parseFathomRecap(raw) {
  if (!raw || !raw.trim()) return { ok: false, error: "Nothing pasted." };
  const text = normalise(stripLinks(raw));

  const share = raw.match(/https:\/\/fathom\.video\/share\/([A-Za-z0-9_-]+)/);
  const { date, minutes } = parseMeta(text);

  // Everything below "Meeting Summary" is the expanded, readable version.
  const summaryStart = text.lastIndexOf("Meeting Summary");
  const body = summaryStart >= 0 ? text.slice(summaryStart) : text;

  const purpose = clean(section(body, "Meeting Purpose", ["Key Takeaways"]));
  const takeaways = bullets(section(body, "Key Takeaways", ["Topics", "Next Steps"]));
  const topics = bullets(section(body, "Topics", ["Next Steps", "View Meeting"]));
  const nextSteps = bullets(section(body, "Next Steps", ["View Meeting", "Ask Fathom"]));

  const actionItems = parseActionItems(raw);

  const title = (clean(section(text, "Meeting with", ["View Meeting"])).split("\n")[0] || "")
    .split("•")[0].trim();

  const ok = Boolean(share || purpose || takeaways.length);
  return {
    ok,
    error: ok ? "" : "That doesn't look like a Fathom recap email.",
    date,
    minutes,
    shareUrl: share ? `https://fathom.video/share/${share[1]}` : "",
    title: title || "GIKA10 session",
    purpose,
    takeaways,
    topics,
    nextSteps,
    actionItems,
  };
}

// Anything that looks like a match statistic mentioned in the notes. Surfaced
// for reference only — never written into a match automatically, because a
// number misattributed to the wrong game is worse than no number at all.
export function findStats(parsed) {
  // Firebase does not store empty arrays, so a session saved with no takeaways
  // or no topics comes back from the database with the key missing entirely.
  const list = v => (Array.isArray(v) ? v : []);
  const hay = [parsed?.purpose || "", ...list(parsed?.takeaways), ...list(parsed?.topics)].join(" ");
  // Longer phrases first so "short passes" wins over "passes".
  const re = /(\d+)\s+(crucial interceptions|crucial tackles|short passes|long passes|ground duels|interceptions|clearances|tackles|passes|assists|shots|goals)/gi;
  const seen = new Map();
  let m;
  while ((m = re.exec(hay))) {
    // The same figure is often repeated in a takeaway and again in a topic.
    const key = `${m[1]}|${m[2].toLowerCase()}`;
    if (!seen.has(key)) seen.set(key, { value: Number(m[1]), label: m[2].toLowerCase() });
  }
  return [...seen.values()];
}

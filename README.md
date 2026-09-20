# Seb #38 — Soccer Development Tracker

A private tracker for Sebastian Howell (#38, ASA 2013 MLSNext): game stats, a
reflection journal, highlight clips, and training drills.

**Live:** https://sebi38.github.io/

---

## Running it locally

```bash
npm install
npm run dev
```

Vite prints a URL — open the one it prints.

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server with hot reload |
| `npm run build` | Production build into `dist/` |
| `npm run preview` | Serve the built `dist/` locally |

## Deploying

Push to `main`. [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml)
builds the site and publishes it to GitHub Pages.

> **One-time setup:** in the repo's **Settings → Pages**, set **Source** to
> **GitHub Actions**. The site used to be served as static files straight from
> `main`; now that there's a build step, Pages has to run the workflow instead.

## Project layout

```
index.html              Vite entry point
vite.config.js          Build config (`base` must match how Pages serves the site)
src/
  main.jsx              React root
  App.jsx               Auth gate, tab routing, initial data load
  config.js             Player info, password, categories, storage keys
  styles.css            Global CSS
  assets/sebi.jpg       Home page photo
  data/
    seasons.js          ← the season registry (see below)
    fall2025.js         Fall 2025 schedule + results
    spring2026.js       Spring 2026 schedule + journal stubs
  lib/
    firebase.js         Firebase init
    storage.js          localStorage read/write, mirrored to Firebase
    sync.js             Pull the database down into localStorage on load
    seeds.js            One-time season seeding, guarded by flags
    numbers.js          Form-value parsing helpers
  ui/                   Shared pieces: Nav, Modal, Pill, SearchBar, theme…
  pages/                One file per tab (Home, Highlights, Training, Journal, Stats)
```

## Adding a new season

1. Create `src/data/<season>.js` exporting an array of game rows. Every row
   needs an `id` prefixed with the season's prefix, e.g. `fa26-1`, `fa26-2`.
2. Add one entry to `SEASONS` in [`src/data/seasons.js`](src/data/seasons.js).

That's the whole change — the Stats filter pills and the database seeding both
read from that list.

> ⚠️ **Never change or reuse an existing `seedKey`.** Each season is written to
> Firebase exactly once, and the flag at `seb38/seeds/<seedKey>` is the only
> thing preventing a season from being inserted twice. Reusing a key that has
> already run means the rows silently never appear; inventing a new key for a
> season that already ran means duplicates.

## How data flows

The UI reads and writes `localStorage` synchronously, and every write is
mirrored up to Firebase Realtime Database under `seb38/data/*`. On load, the
whole database is pulled back down into `localStorage`.

That means edits made in one browser show up in another **after a reload**, not
live. There is no conflict resolution: last write wins.

```
  UI  ──write──▶  localStorage  ──mirror──▶  Firebase
  UI  ◀──read───  localStorage  ◀──pull────  Firebase   (on load)
```

Journal and Stats are linked: saving a journal entry also creates or updates a
Stats row (`statId` on the journal entry points at it), and deleting the journal
entry deletes that Stats row too.

## Authentication & database security

The site uses **Firebase Email/Password authentication**. Sign-in is enforced by
Firebase, and the Realtime Database rules in
[`database.rules.json`](database.rules.json) reject every read and write from an
unauthenticated client.

> The old gate was a password compared in client-side JavaScript. It kept casual
> visitors out of the *page* but did nothing to protect the *data* — the database
> was readable by anyone with the URL. That is why the journal, coaching notes,
> and film links only belong here once the rules below are applied.

### One-time setup — do these in order

Order matters. Applying the rules before the auth-enabled app is live will take
the site down, because the old build cannot authenticate.

1. **Enable the sign-in provider.** Firebase console → *Authentication* →
   *Get started* → *Sign-in method* → enable **Email/Password**.
   (As of this writing the project has no Authentication configured at all —
   sign-in returns `CONFIGURATION_NOT_FOUND` until this is done.)
2. **Create the family user.** *Authentication* → *Users* → *Add user*. Use an
   email you both have and a strong password. Everyone shares this one login.
   Add a second user per person if you would rather not share.
3. **Deploy this build.** Push to `main` and let the Pages workflow finish. The
   app now signs in properly while the rules are still permissive.
4. **Verify you can sign in** on the live site.
5. **Apply the rules.** Firebase console → *Realtime Database* → *Rules*, paste
   the contents of `database.rules.json`, and publish.
6. **Confirm the lockdown.** This should now return a permission error rather
   than data:
   ```
   curl -s "https://sebi-soccer-38-default-rtdb.firebaseio.com/seb38/data/journal.json"
   ```

### What is still public

- The Firebase API key in `src/lib/firebase.js` is public by design. It
  identifies the project; it does not grant access. Access is decided by the
  rules and the signed-in user.
- Everyone shares one login, so treat the password the way you would treat a
  house key.

---

## The academy search

The Academies tab scores MLS academies for a player: ten weighted dimensions,
confidence priced in, fit and odds on separate axes, and a call sheet that
ranks the open questions by what an answer would settle.

**The data is private and never enters the bundle.** This repo is public and
the site is static files on GitHub Pages — the sign-in screen decides what
React renders, not what is served, so anything imported into `src/` is readable
by anyone who fetches the JavaScript. The only real wall is Firebase. So:

- **Code lives here.** The engine (`src/lib/academies.js`), the validator, the
  generic model (`src/data/academies/meta.js` — dimensions, confidence,
  stages, tiers) and the reusable question bank. None of it is about anyone.
- **Data lives in `private/academies/`**, which is gitignored: the screening
  rows for every club, the research records for the shortlist, the player and
  the family's own decisions. Edited in a text editor.
- **The site reads from Firebase** at `seb38/academies`, behind the same rules
  as everything else, after sign-in. Pipeline edits made in the tab — stage
  changes, call notes — save back there and survive a re-import.

```
npm run academies              the brief, printed from private/academies/
npm run academies -- --export  writes private/academies/bundle.json
npm run academies -- --md      also writes private/academies/academy-search.md
npm run academies -- --json    the scored matrix, for taking back into a chat
```

Every run validates the data first and exits non-zero if it is broken. To get
the data into the site: `--export`, then open the Academies tab and pick the
bundle file. Re-importing replaces the research and keeps the pipeline state
the tab has written since.

### How a club is scored

Two tiers. Every club has a screening row — travel tier, public rank, and four
scores with notes. The shortlist also has a research record: all ten
dimensions, two gates, a cost model, a pipeline, open questions, and the
reasoning behind every number. Both are scored on the same dimensions;
research scores where they exist, screening scores mapped onto the dimensions
they inform where they do not, and everything else at the neutral prior — so a
screening club is never quietly credited with a coaching staff nobody has
looked at.

- **Confidence is arithmetic, not a label.** A dimension's score is blended
  toward the prior in proportion to how little is known: `score × c + 3 × (1 −
  c)`. An unresearched dimension scores 3, not whatever somebody guessed, so a
  club cannot climb the table by being unexamined and a confirmed 4 beats a
  reported 5. The gap between face value and the adjusted score is shown as
  how much of a club's standing is currently faith.
- **Fit and odds are separate axes.** "How good would this be" and "will it
  happen" are different questions, and averaging them hides the trade-off. The
  default sort is expected value — fit × odds.
- **Cost confidence is computed**, from how much of the four-line cost model
  is pinned down. A club can be "fully funded" and uncosted at the same time.
- **Weights are the family's priorities**, set once in `meta.js` and
  adjustable live in the tab, where they save to that browser only.

The tab also lists screening clubs that outscore the weakest club being
actively pursued — the check on the choice of shortlist.

### The call sheet

Every open question declares which dimensions it would resolve. A question that
*clarifies* is worth the weighted uncertainty it removes; one that *decides*
whether a club stays on the list is worth the club's whole candidacy, counted
once per club. Both are divided by effort. Clubs marked `posture: "gated"` get
only their own questions until the gate clears.

### Editing it

Edit the private files, never the generated brief. Logging a call means moving
`pipeline.stage` (in the tab or the file), raising the confidence on whatever
the answer settled, and deleting the question it answered. Promoting a club
means adding a record to `research.js` under its `screening.js` id; where a
research score and the screening score for the same dimension disagree by a
point or more, the tab and the brief both say so.

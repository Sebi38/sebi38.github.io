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

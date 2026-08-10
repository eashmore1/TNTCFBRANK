# 🧨 TNT College Football Rankings

A live-updating college football rankings site for you and your friends.

Everyone builds their own **Top 25 ballot** by dragging team helmets into place,
and all ballots are averaged into the combined **TNT Ranking** — recalculated
live the moment anyone changes their ballot.

## Features

- **Easy helmet ranking** — all 136 Division I FBS teams get an SVG helmet in
  their school colors with the school + mascot name underneath. **Tap a helmet**
  to add it to the next open spot, then **drag** or use the **▲▼ buttons** to
  reorder, and **✕** to remove — no dragging required if you don't want to.
  Drop zones highlight while you drag. Filter the pool by any FBS conference
  (SEC, Big Ten, Big 12, ACC, American, C-USA, MAC, Mountain West, Pac-12,
  Sun Belt, Independents) or search by name.
- **A poll for every week** — Preseason, Weeks 1–16, and Bowls/Final. Each
  user submits one ballot per week, and there's a TNT Ranking for every week.
  A "Copy previous week" button pre-fills your ballot so you only have to move
  what changed.
- **Weeks close on time** — a week's ballot locks the moment the next week's
  games kick off, so nobody rewrites history after seeing how it turned out.
  Closed weeks show as a plain final list with a 🔒 in the week picker; the
  open week shows its deadline. The server refuses late writes, so the
  deadline is real rather than a suggestion.
- **TNT Ranking (AP-style scoring)** — a #1 vote is worth 25 points, #25 is
  worth 1. Points are summed across all ballots; first-place votes are shown
  in parentheses, and teams outside the top 25 land in "Also receiving votes."
- **AP / Coaches poll tab** — the real national polls next to ours. Flip
  between the **AP Top 25** and the **US LBM Coaches Poll** for the week you're
  viewing; each team shows its points, first-place votes, and how far off the
  TNT Ranking is on that team (`TNT #3 ▲8` = we have them eight spots higher).
  The 2026 preseason Coaches Poll is loaded; the AP preseason poll isn't out
  until Aug 17, so it says so until you add it. These polls are typed in by
  hand, not scraped — add a week by dropping an entry into
  `public/polls.js` (the format is documented at the top of the file).
- **Playoff bracket** — a live 12-team bracket built off the current TNT
  Ranking using the **2026 CFP selection rules**: automatic bids to the four
  Power-4 champions (ACC, Big 12, Big Ten, SEC) plus the single highest-ranked
  Group of Six team (American, C-USA, MAC, Mountain West, Pac-12, Sun Belt),
  then at-large bids fill the rest, everyone seeded straight by rank. Top four
  seeds get first-round byes; seeds 5–12 play in the first round. Since there
  are no game results, a conference's "champion" is proxied by its
  highest-ranked team. Updates the instant the ranking changes.
- **Preseason predictions (locked until kickoff)** — a separate tab, split into
  three sub-tabs, where each person makes their calls before the season starts:
  (1) the two teams they think meet in each of the ten FBS conference
  championship games plus the winner, (2) a full 12-team playoff prediction —
  seed your own field, then tap a team in each game to advance them all the way
  to a national champion (bye slots, reseeding and downstream games update
  automatically), and (3) the **Heisman**, picked off the preseason odds board
  (~50 players, longest shots last; the board lives in `public/heisman.js` and
  is hand-entered, so it's easy to update). **Your picks stay
  completely private** — nobody can see anyone else's until they all lock the
  moment the first game kicks off (Aug 29, 2026). Until then a live countdown
  shows how long is left and who has already locked in (names only, never their
  picks); once the clock hits zero everyone's predictions are revealed side by
  side.
- **Built for phones** — every tab is laid out for a phone screen, not just
  shrunk down: the tab strip scrolls sideways, the team pool goes three helmets
  across, both brackets stack round-by-round instead of scrolling sideways, and
  nothing runs off the edge (checked down to 360px wide).
- **Light / dark mode** — a toggle in the top bar; your choice is remembered.
- **Live updates** — when a friend saves their ballot, your TNT Ranking
  updates on its own within a few seconds, no refresh needed. Your own saves
  show up instantly.
- **No passwords** — it's for friends. Pick your name once and your ballots
  save under it automatically (autosave on every change).
- **Opens to the right week** — no setup step. The site lands you on the week
  you were last viewing, or on the latest week anyone has ranked if it's your
  first visit. Switch weeks anytime with the dropdown.

## Running it

```bash
npm install
npm start
```

Then open <http://localhost:3000>. Set `PORT` to change the port.

Locally, everything is stored in `data/store.json` (created automatically), so
back that file up if you care about your poll history.

## Deploying to Vercel

The site is built to run on Vercel: `public/` is served as static files and
each file in `api/` becomes a serverless function. Pushing to the connected
branch deploys it.

**One setup step is required, once.** Serverless functions have no disk, so
`data/store.json` has nowhere to live. Worse than losing data on redeploy:
Vercel runs several function instances, each with its own memory, so without a
shared database different people can be served different ballots. Pick either
option below — the app detects whichever one you configure.

### Option A — a secret GitHub Gist

Needs no account beyond the GitHub one this repo already lives in, and has
nothing to pay for or run out of.

1. Go to <https://gist.github.com>, make a **secret** gist with one file named
   `tnt-store.json` containing `{}`. The gist's ID is the last part of its URL.
2. Make a token at **GitHub → Settings → Developer settings → Personal access
   tokens → Tokens (classic)** with only the **`gist`** scope ticked.
3. Add both to the Vercel project's environment variables as `GIST_ID` and
   `GIST_TOKEN`.
4. Redeploy.

Every save writes a gist revision, so its history grows one entry per ballot
change — harmless, just busy-looking. Optional: `GIST_FILE` to use a filename
other than `tnt-store.json`.

### Option B — Firebase Realtime Database

1. In the Firebase console, create a project and a **Realtime Database**.
2. Add `FIREBASE_DB_URL` to the Vercel project's environment variables
   (e.g. `https://your-project-default-rtdb.firebaseio.com`), plus **one** of:
   - `FIREBASE_DB_SECRET` — Project Settings → Service Accounts → Database
     secrets. One value, quickest to set up.
   - `FIREBASE_SERVICE_ACCOUNT` — the whole service-account JSON, pasted in.
     This is Google's current supported path; the app signs a JWT with it and
     exchanges that for a short-lived access token, cached until it expires.
3. Leave the database's security rules closed (`".read": false`,
   `".write": false`). Only the server talks to Firebase, and it authenticates,
   so no public access is needed — see the note below.
4. Redeploy.

Optional: `FIREBASE_DB_PATH` to store somewhere other than `tnt/store`.

### Option C — Redis

Either connect one through the Vercel dashboard (**Storage** → **Create
Database** → Redis), which injects `KV_REST_API_URL` and `KV_REST_API_TOKEN`
for you, or make a database at <https://upstash.com> directly and paste those
two values in yourself. Then redeploy. The app can't tell the difference.

**If something doesn't save, open `/api/health` on the deployed site.** It
reports which backend is actually in use, whether it can be read, and the
current revision — no credentials, just the diagnosis. `backend: "memory"`
means none of the variables below are reaching the app. Add `?write=1` to
round-trip a write and prove it survives.

Set exactly one of the three. They're checked Firebase → Redis → Gist, so a
half-finished migration resolves to a single store rather than quietly
splitting the data across two. To confirm it took, check the deployment logs —
with none configured the app still runs but logs a loud warning that data is
being held in memory.

> **Why the browser never talks to the database directly.** It would be
> tempting to use a Firebase client SDK and get real-time push for free. But
> the predictions rule — nobody sees anyone else's picks until the Aug 29 lock
> — is enforced server-side in `lib/core.js`, and it only holds because reads
> go through the server, which sends other people's picks to nobody. Pointing
> the client straight at Firebase would put every prediction in the browser and
> leave security rules as the only thing standing between them, which this app
> can't write meaningfully because it has no per-user authentication.

### Other hosts

`npm start` runs the same code against `data/store.json`, so any ordinary
Node host (Render, Railway, Fly.io, a VPS, a Raspberry Pi) works too — just
put `data/` on a persistent disk. No Redis needed there.

## Tech

- **Client**: vanilla JS + [SortableJS](https://github.com/SortableJS/Sortable)
  for smooth, animated drag & drop. Helmets are inline SVGs generated from
  each team's colors in `public/teams.js` — add or recolor teams there.
- **Server**: three serverless endpoints — `api/sync` (the single read the
  client polls) plus `api/ballot` and `api/predictions` for writes. All the
  actual rules live in `lib/core.js`, which both the serverless functions and
  the local Express server call into, so there's one implementation regardless
  of where it's running.
- **Storage**: `lib/store.js` picks its backend automatically — Firebase
  Realtime Database, Redis, or a GitHub gist when credentials are present
  (Vercel), a JSON file otherwise (local), memory as a last resort. The whole
  store is a single JSON document, so each backend is just a get and a put;
  adding another one means implementing those two functions. Saving is a
  read-modify-write, so writes are **conditional**: each one only lands if the
  document is still what was read, and `store.update()` re-reads and retries
  when it isn't. Without that, two people saving in the same moment would each
  write back a document based on what they read before the other's save, and
  the later write would silently erase the earlier ballot — while telling both
  of them "Saved". Redis does the check with a small `EVAL` script and Firebase
  with an ETag; gists have no conditional update, so there they're only
  serialised within one instance.
- **Updates**: `public/net.js` polls and presents the same `on`/`emit`
  interface the app was originally written against, so the app code doesn't
  know or care that there's no socket underneath. Polling is deliberate:
  serverless functions can't push to other people's browsers, which is exactly
  what a shared ranking needs. The loop is adaptive — every 3s while something
  is happening or you're touching the page, backing off to 15s when the page
  is just sitting there, and stopping entirely on a hidden tab. Everything the
  loop needs comes from a single `/api/sync` call so one tick costs one
  function invocation and one storage read. That matters: polling is the
  app's steady-state traffic, and a Redis free tier is priced per command.
- **Predictions privacy** is enforced server-side in `lib/core.js`. Before the
  lock, other people's picks are never sent to your browser at all, so there's
  nothing to find in dev tools.

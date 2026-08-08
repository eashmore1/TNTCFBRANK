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
- **Preseason predictions (locked until kickoff)** — a separate tab where each
  person makes two calls before the season starts: (1) the two teams they think
  meet in each of the ten FBS conference championship games plus the winner, and
  (2) a full 12-team playoff prediction — seed your own field, then tap a team in
  each game to advance them all the way to a national champion (bye slots,
  reseeding and downstream games update automatically). **Your picks stay
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
- **Live updates** — built on WebSockets (Socket.IO). When a friend saves
  their ballot, your TNT Ranking updates instantly, no refresh needed.
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

All data is stored in `data/store.json` (created automatically), so back that
file up if you care about your poll history.

## Deploying for your friends

Any Node.js host works (Render, Railway, Fly.io, a VPS, a Raspberry Pi...).
Just make sure:

1. `npm install && npm start` runs on the host.
2. The `data/` directory is on a persistent disk, or your ballots reset on
   redeploy.

## Tech

- **Server**: Node.js + Express + Socket.IO, JSON file persistence — no
  database to manage.
- **Client**: vanilla JS + [SortableJS](https://github.com/SortableJS/Sortable)
  for smooth, animated drag & drop. Helmets are inline SVGs generated from
  each team's colors in `public/teams.js` — add or recolor teams there.

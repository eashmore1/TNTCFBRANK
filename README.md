# 🧨 TNT College Football Rankings

A live-updating college football rankings site for you and your friends.

Everyone builds their own **Top 25 ballot** by dragging team helmets into place,
and all ballots are averaged into the combined **TNT Ranking** — recalculated
live the moment anyone changes their ballot.

## Features

- **Drag & drop helmets** — all 136 Division I FBS teams get an SVG helmet in
  their school colors with the school + mascot name underneath. Drag from the
  team pool into your 1–25 list, drag to reorder, drag out (or hit ✕) to
  remove. Double-click a helmet to add it to the next open spot. Filter the
  pool by any FBS conference (SEC, Big Ten, Big 12, ACC, American, C-USA, MAC,
  Mountain West, Pac-12, Sun Belt, Independents) or search by name.
- **A poll for every week** — Preseason, Weeks 1–16, and Bowls/Final. Each
  user submits one ballot per week, and there's a TNT Ranking for every week.
  A "Copy previous week" button pre-fills your ballot so you only have to move
  what changed.
- **TNT Ranking (AP-style scoring)** — a #1 vote is worth 25 points, #25 is
  worth 1. Points are summed across all ballots; first-place votes are shown
  in parentheses, and teams outside the top 25 land in "Also receiving votes."
- **Playoff bracket** — a live 12-team CFP-style bracket built off the current
  TNT Ranking using the real selection rules: five automatic bids to the
  highest-ranked conference champions (which guarantees a Group of Five team a
  spot, even if it bumps a higher-ranked at-large team), seven at-large bids,
  then everyone seeded straight by rank. Top four seeds get first-round byes;
  seeds 5–12 play in the first round. Since there are no game results, each
  conference's "champion" is proxied by its highest-ranked team. Updates the
  instant the ranking changes.
- **Light / dark mode** — a toggle in the top bar; your choice is remembered.
- **Live updates** — built on WebSockets (Socket.IO). When a friend saves
  their ballot, your TNT Ranking updates instantly, no refresh needed.
- **No passwords** — it's for friends. Pick your name once and your ballots
  save under it automatically (autosave on every change).
- **Group week** — anyone can star the active week so everyone lands on the
  same poll when they open the site.

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

const express = require('express');
const http = require('http');
const path = require('path');
const fs = require('fs');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'store.json');

// One ballot per user per week; a TNT poll exists for every week.
const WEEKS = ['Preseason', ...Array.from({ length: 16 }, (_, i) => `Week ${i + 1}`), 'Bowls / Final'];

// Preseason predictions lock the moment the first game of the season kicks off
// (Aug 29, 2026). Until then, each person only ever sees their own picks; once
// the clock passes the lock, everyone's picks are revealed to everyone.
const LOCK_TS = process.env.TNT_LOCK_TS
  ? Date.parse(process.env.TNT_LOCK_TS)
  : Date.parse('2026-08-29T00:00:00-04:00');

// Conferences that stage a championship game (Independents don't).
const TITLE_CONFS = ['SEC', 'Big Ten', 'Big 12', 'ACC', 'American', 'C-USA', 'MAC', 'MW', 'Pac-12', 'Sun Belt'];
const BRACKET_KEYS = ['r1_0', 'r1_1', 'r1_2', 'r1_3', 'qf_0', 'qf_1', 'qf_2', 'qf_3', 'sf_0', 'sf_1', 'final'];

const MAX_RANKS = 25;
const MAX_NAME_LEN = 24;

// state.ballots = { [week]: { [userName]: [teamId, ...] } }  (public — broadcast)
let state = {
  ballots: {},
};

// predictions = { [userName]: { confChamps, playoff } }  (PRIVATE until LOCK_TS)
let predictions = {};

function isLocked() {
  return Number.isFinite(LOCK_TS) && Date.now() >= LOCK_TS;
}

function load() {
  try {
    const raw = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    if (raw && typeof raw === 'object') {
      if (raw.ballots && typeof raw.ballots === 'object') state.ballots = raw.ballots;
      if (raw.predictions && typeof raw.predictions === 'object') predictions = raw.predictions;
    }
  } catch (e) {
    // First run: no data file yet.
  }
}

let saveTimer = null;
function scheduleSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    const tmp = DATA_FILE + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify({ ballots: state.ballots, predictions }, null, 2));
    fs.renameSync(tmp, DATA_FILE);
  }, 250);
}

function cleanName(name) {
  if (typeof name !== 'string') return null;
  const n = name.trim().slice(0, MAX_NAME_LEN);
  return n.length ? n : null;
}

function cleanRanking(ranking) {
  if (!Array.isArray(ranking)) return null;
  const seen = new Set();
  const out = [];
  for (const id of ranking) {
    if (typeof id !== 'string' || !id || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
    if (out.length === MAX_RANKS) break;
  }
  return out;
}

/* ============ predictions ============ */

function cleanId(v) {
  return typeof v === 'string' && v && v.length <= 40 ? v : null;
}

// Structural sanitize only — the client owns team/conference validity; the
// server just guards types, lengths and counts so nothing abusive is stored.
function cleanPrediction(p) {
  const out = { confChamps: {}, playoff: { seeds: [], winners: {} } };
  if (!p || typeof p !== 'object') return out;

  if (p.confChamps && typeof p.confChamps === 'object') {
    for (const conf of TITLE_CONFS) {
      const c = p.confChamps[conf];
      if (!c || typeof c !== 'object') continue;
      const a = cleanId(c.a);
      const b = cleanId(c.b);
      const w = cleanId(c.winner);
      const entry = {};
      if (a) entry.a = a;
      if (b && b !== a) entry.b = b;
      if (w && (w === entry.a || w === entry.b)) entry.winner = w;
      if (entry.a || entry.b) out.confChamps[conf] = entry;
    }
  }

  const seen = new Set();
  const seeds = new Array(12).fill(null);
  const srcSeeds = Array.isArray(p.playoff && p.playoff.seeds) ? p.playoff.seeds : [];
  for (let i = 0; i < 12; i++) {
    const cid = cleanId(srcSeeds[i]);
    if (cid && !seen.has(cid)) {
      seen.add(cid);
      seeds[i] = cid;
    }
  }
  out.playoff.seeds = seeds;

  const srcWin = (p.playoff && p.playoff.winners) || {};
  if (srcWin && typeof srcWin === 'object') {
    for (const k of BRACKET_KEYS) {
      const w = cleanId(srcWin[k]);
      if (w && seen.has(w)) out.playoff.winners[k] = w;
    }
  }
  return out;
}

function hasPredContent(p) {
  if (!p) return false;
  if (p.confChamps && Object.keys(p.confChamps).length) return true;
  if (p.playoff && Array.isArray(p.playoff.seeds) && p.playoff.seeds.some(Boolean)) return true;
  return false;
}

function submittedUsers() {
  return Object.keys(predictions)
    .filter((u) => hasPredContent(predictions[u]))
    .sort();
}

// What a given user is allowed to receive: everyone's picks once locked,
// otherwise only their own (plus the names — not the contents — of who's in).
function predPayload(forUser) {
  const locked = isLocked();
  const base = { locked, lockTs: LOCK_TS, submittedUsers: submittedUsers() };
  if (locked) return { ...base, all: predictions };
  return { ...base, mine: (forUser && predictions[forUser]) || null };
}

load();

app.use(express.static(path.join(__dirname, 'public')));
app.use('/vendor', express.static(path.join(__dirname, 'node_modules', 'sortablejs')));

io.on('connection', (socket) => {
  socket.emit('init', { weeks: WEEKS, state, lockTs: LOCK_TS, now: Date.now() });

  socket.on('saveBallot', (payload = {}) => {
    const week = WEEKS.includes(payload.week) ? payload.week : null;
    const user = cleanName(payload.user);
    const ranking = cleanRanking(payload.ranking);
    if (!week || !user || !ranking) return;

    if (!state.ballots[week]) state.ballots[week] = {};
    if (ranking.length === 0) {
      delete state.ballots[week][user];
    } else {
      state.ballots[week][user] = ranking;
    }
    scheduleSave();
    io.emit('state', state);
  });

  // The client announces who it is so the server can hand back the right
  // (own-only, until locked) prediction data.
  socket.on('identify', (payload = {}) => {
    socket.data.user = cleanName(payload.user);
    socket.emit('predictions', predPayload(socket.data.user));
  });

  socket.on('savePrediction', (payload = {}) => {
    const user = cleanName(payload.user);
    if (user) socket.data.user = user;
    // Once locked, picks are frozen — just re-send the (now public) state.
    if (isLocked() || !user) {
      socket.emit('predictions', predPayload(socket.data.user));
      return;
    }
    const pred = cleanPrediction(payload.prediction);
    if (hasPredContent(pred)) predictions[user] = pred;
    else delete predictions[user];
    scheduleSave();

    socket.emit('predictions', predPayload(user));
    // Others learn only that the roster of who's locked in changed — not what.
    socket.broadcast.emit('predStatus', { locked: isLocked(), submittedUsers: submittedUsers() });
  });
});

// When the lock moment arrives, reveal everyone's picks to everyone that's
// currently connected (a refresh would do the same, but this is seamless).
if (Number.isFinite(LOCK_TS)) {
  const ms = LOCK_TS - Date.now();
  if (ms > 0 && ms < 2 ** 31 - 1) {
    setTimeout(() => {
      io.emit('predictions', { locked: true, lockTs: LOCK_TS, all: predictions, submittedUsers: submittedUsers() });
    }, ms);
  }
}

server.listen(PORT, () => {
  console.log(`TNT CFB Rankings running on http://localhost:${PORT}`);
});

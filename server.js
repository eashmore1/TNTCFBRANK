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

const MAX_RANKS = 25;
const MAX_NAME_LEN = 24;

// state.ballots = { [week]: { [userName]: [teamId, ...] } }
let state = {
  ballots: {},
};

function load() {
  try {
    const raw = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    if (raw && typeof raw === 'object') {
      if (raw.ballots && typeof raw.ballots === 'object') state.ballots = raw.ballots;
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
    fs.writeFileSync(tmp, JSON.stringify(state, null, 2));
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

load();

app.use(express.static(path.join(__dirname, 'public')));
app.use('/vendor', express.static(path.join(__dirname, 'node_modules', 'sortablejs')));

io.on('connection', (socket) => {
  socket.emit('init', { weeks: WEEKS, state });

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
});

server.listen(PORT, () => {
  console.log(`TNT CFB Rankings running on http://localhost:${PORT}`);
});

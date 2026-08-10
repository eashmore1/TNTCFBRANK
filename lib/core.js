/* ============================================================
   The rules of the app, with no transport attached.

   Both the local Express server (server.js) and the Vercel serverless
   functions (api/*.js) call straight into this, so there is exactly one
   implementation of "what is a legal ballot" and "who is allowed to see
   whose predictions" no matter where the app is running.
   ============================================================ */

const store = require('./store');

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

function isLocked() {
  return Number.isFinite(LOCK_TS) && Date.now() >= LOCK_TS;
}

/* ---------- weekly ballot deadlines ---------- */

// A week's ballot is your verdict on games already played, so it closes the
// moment the next week's games kick off — no going back to edit history once
// the season has moved on. Week 1's games start at LOCK_TS (the first game of
// the season), so week N's games start a week later each time, and week N's
// ballot closes when week N+1 starts. The Preseason ballot closes at kickoff.
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const FINAL_WEEKS_AFTER_START = 20; // Bowls / Final closes ~mid-January

function weekLockTs(week) {
  if (!Number.isFinite(LOCK_TS)) return null;
  if (week === 'Preseason') return LOCK_TS;
  const m = /^Week (\d+)$/.exec(week || '');
  if (m) return LOCK_TS + Number(m[1]) * WEEK_MS;
  return LOCK_TS + FINAL_WEEKS_AFTER_START * WEEK_MS;
}

function weekLocked(week) {
  const ts = weekLockTs(week);
  return ts !== null && Date.now() >= ts;
}

// The full schedule, sent to the client once so it can grey out closed weeks
// and count down to the next deadline. The server still refuses late writes;
// this is only so the UI can explain itself.
function weekLocks() {
  const out = {};
  for (const w of WEEKS) out[w] = weekLockTs(w);
  return out;
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

function cleanId(v) {
  return typeof v === 'string' && v && v.length <= 40 ? v : null;
}

// Structural sanitize only — the client owns team/conference validity; the
// server just guards types, lengths and counts so nothing abusive is stored.
function cleanPrediction(p) {
  const out = { confChamps: {}, playoff: { seeds: [], winners: {} }, heisman: null };
  if (!p || typeof p !== 'object') return out;

  out.heisman = cleanId(p.heisman);

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
  if (p.heisman) return true;
  if (p.confChamps && Object.keys(p.confChamps).length) return true;
  if (p.playoff && Array.isArray(p.playoff.seeds) && p.playoff.seeds.some(Boolean)) return true;
  return false;
}

function submittedUsers(predictions) {
  return Object.keys(predictions)
    .filter((u) => hasPredContent(predictions[u]))
    .sort();
}

// What a given user is allowed to receive: everyone's picks once locked,
// otherwise only their own (plus the names — not the contents — of who's in).
// This is the whole privacy guarantee, and it lives here on the server so that
// other people's picks are never sent to a browser that shouldn't have them.
function predPayload(predictions, forUser, rev) {
  const locked = isLocked();
  const base = { locked, lockTs: LOCK_TS, submittedUsers: submittedUsers(predictions), rev };
  if (locked) return { ...base, all: predictions };
  return { ...base, mine: (forUser && predictions[forUser]) || null };
}

/* ---------- operations ---------- */

// Everything the client polls for, off one storage read — see api/sync.js for
// why this is a single trip rather than two.
async function getSync(user) {
  const doc = await store.read();
  return {
    weeks: WEEKS,
    weekLocks: weekLocks(),
    rev: doc.rev,
    state: { ballots: doc.ballots },
    lockTs: LOCK_TS,
    now: Date.now(),
    predictions: predPayload(doc.predictions, cleanName(user), doc.rev),
  };
}

async function saveBallot(payload = {}) {
  const week = WEEKS.includes(payload.week) ? payload.week : null;
  const user = cleanName(payload.user);
  const ranking = cleanRanking(payload.ranking);

  // Say why, whenever we don't save. Answering a dropped write with the same
  // "here's your state" as a successful one is how a lost ballot ends up
  // showing "Saved ✓" on the screen of the person who lost it. Late edits are
  // refused here rather than in the browser: the deadline is only real if the
  // server keeps it.
  let rejected = null;
  if (!week) rejected = 'bad-week';
  else if (!user) rejected = 'no-user';
  else if (!ranking) rejected = 'bad-ranking';
  else if (weekLocked(week)) rejected = 'week-locked';

  if (rejected) {
    const doc = await store.read();
    return { rev: doc.rev, ballots: doc.ballots, rejected };
  }

  const doc = await store.update((d) => {
    if (!d.ballots[week]) d.ballots[week] = {};
    if (ranking.length === 0) delete d.ballots[week][user];
    else d.ballots[week][user] = ranking;
  });
  return { rev: doc.rev, ballots: doc.ballots };
}

async function getPredictions(user) {
  const doc = await store.read();
  return predPayload(doc.predictions, cleanName(user), doc.rev);
}

async function savePrediction(payload = {}) {
  const user = cleanName(payload.user);

  // Once kickoff passes, picks are frozen. Say so rather than handing back the
  // state as though the save had gone through.
  const rejected = !user ? 'no-user' : isLocked() ? 'locked' : null;
  if (rejected) {
    const doc = await store.read();
    return { ...predPayload(doc.predictions, user, doc.rev), rejected };
  }

  const pred = cleanPrediction(payload.prediction);
  const doc = await store.update((d) => {
    if (hasPredContent(pred)) d.predictions[user] = pred;
    else delete d.predictions[user];
  });

  return predPayload(doc.predictions, user, doc.rev);
}

module.exports = {
  WEEKS,
  LOCK_TS,
  isLocked,
  weekLockTs,
  weekLocked,
  getSync,
  saveBallot,
  getPredictions,
  savePrediction,
};

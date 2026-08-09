/* ============================================================
   Where the ballots and predictions actually live.

   Four backends, picked automatically from whatever is in the environment.
   Either hosted option works on Vercel, where serverless functions have no
   writable disk and no shared memory, so a write handled by one instance has
   to be visible to every other one:

   1. Firebase — FIREBASE_DB_URL plus either FIREBASE_DB_SECRET or
                FIREBASE_SERVICE_ACCOUNT. Realtime Database over REST; see
                lib/firebase.js.
   2. Redis   — KV_REST_API_* or UPSTASH_REDIS_REST_*, as injected by the
                Vercel Marketplace Upstash integration. Spoken over plain
                fetch — no SDK, nothing to cold-start.
   3. File    — local development (`npm start`): data/store.json, written
                atomically via a .tmp file + rename.
   4. Memory  — the fallback if we're serverless with neither configured.
                The app runs, but data is per-instance and vanishes on
                redeploy, so we say so loudly in the logs once.

   Set one or the other. If both Firebase and Redis are present Firebase
   wins, so a half-finished migration can't quietly split the data in two.
   ============================================================ */

const fs = require('fs');
const path = require('path');
const firebase = require('./firebase');

const DATA_DIR = path.join(__dirname, '..', 'data');
const DATA_FILE = path.join(DATA_DIR, 'store.json');
const KEY = process.env.TNT_STORE_KEY || 'tnt:store';

const REDIS_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const IS_SERVERLESS = !!process.env.VERCEL;

const EMPTY = { ballots: {}, predictions: {} };
const clone = (v) => JSON.parse(JSON.stringify(v));

function backend() {
  if (firebase.configured()) return 'firebase';
  if (REDIS_URL && REDIS_TOKEN) return 'redis';
  return IS_SERVERLESS ? 'memory' : 'file';
}

/* ---------- Redis (Upstash REST) ---------- */

async function redisCmd(cmd) {
  const res = await fetch(REDIS_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${REDIS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(cmd),
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`Redis ${cmd[0]} failed: ${res.status} ${await res.text()}`);
  return (await res.json()).result;
}

/* ---------- Memory ---------- */

let memory = null;
let warnedAboutMemory = false;

/* ---------- Public API ---------- */

async function read() {
  const mode = backend();

  if (mode === 'firebase') {
    return normalize(await firebase.read());
  }

  if (mode === 'redis') {
    const raw = await redisCmd(['GET', KEY]);
    if (!raw) return clone(EMPTY);
    try {
      return normalize(typeof raw === 'string' ? JSON.parse(raw) : raw);
    } catch {
      return clone(EMPTY);
    }
  }

  if (mode === 'file') {
    try {
      return normalize(JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')));
    } catch {
      return clone(EMPTY); // first run, no file yet
    }
  }

  if (!warnedAboutMemory) {
    warnedAboutMemory = true;
    console.warn(
      '[tnt] No database configured — ballots are being kept in memory and WILL ' +
        'be lost on redeploy, and will not be shared between serverless ' +
        'instances, so different people can see different data. Set either ' +
        'FIREBASE_DB_URL (+ secret or service account) or KV_REST_API_URL/' +
        'KV_REST_API_TOKEN to fix this.'
    );
  }
  if (!memory) memory = clone(EMPTY);
  return clone(memory);
}

async function write(data) {
  const doc = normalize(data);
  const mode = backend();

  if (mode === 'firebase') {
    await firebase.write(doc);
    return;
  }

  if (mode === 'redis') {
    await redisCmd(['SET', KEY, JSON.stringify(doc)]);
    return;
  }

  if (mode === 'file') {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    const tmp = DATA_FILE + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(doc, null, 2));
    fs.renameSync(tmp, DATA_FILE);
    return;
  }

  memory = clone(doc);
}

function normalize(raw) {
  const out = clone(EMPTY);
  if (raw && typeof raw === 'object') {
    if (raw.ballots && typeof raw.ballots === 'object') out.ballots = raw.ballots;
    if (raw.predictions && typeof raw.predictions === 'object') out.predictions = raw.predictions;
  }
  return out;
}

module.exports = { read, write, backend };

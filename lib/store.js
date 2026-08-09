/* ============================================================
   Where the ballots and predictions actually live.

   Three backends, picked automatically:

   1. Redis  — whenever Redis REST credentials are in the environment.
                This is what runs on Vercel: serverless functions have no
                writable disk and no shared memory, so a request handled by
                one instance has to be visible to every other instance.
                Works with the Vercel Marketplace Upstash integration
                (KV_REST_API_* or UPSTASH_REDIS_REST_*). Spoken over plain
                fetch — no SDK, nothing to cold-start.
   2. File   — local development (`npm start`): data/store.json, written
                atomically via a .tmp file + rename.
   3. Memory — the fallback if we're serverless with no Redis configured.
                The app runs, but data is per-instance and vanishes on
                redeploy, so we say so loudly in the logs once.
   ============================================================ */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const DATA_FILE = path.join(DATA_DIR, 'store.json');
const KEY = process.env.TNT_STORE_KEY || 'tnt:store';

const REDIS_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const IS_SERVERLESS = !!process.env.VERCEL;

const EMPTY = { ballots: {}, predictions: {} };
const clone = (v) => JSON.parse(JSON.stringify(v));

function backend() {
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
      '[tnt] No Redis configured — ballots are being kept in memory and WILL be ' +
        'lost on redeploy, and will not be shared between serverless instances. ' +
        'Add a Redis store from the Vercel Marketplace to fix this.'
    );
  }
  if (!memory) memory = clone(EMPTY);
  return clone(memory);
}

async function write(data) {
  const doc = normalize(data);
  const mode = backend();

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

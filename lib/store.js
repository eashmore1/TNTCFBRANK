/* ============================================================
   Where the ballots and predictions actually live.

   Four backends, picked automatically from whatever is in the environment.
   Either hosted option works on Vercel, where serverless functions have no
   writable disk and no shared memory, so a write handled by one instance has
   to be visible to every other one:

   1. Firebase — FIREBASE_DB_URL plus either FIREBASE_DB_SECRET or
                FIREBASE_SERVICE_ACCOUNT. Realtime Database over REST; see
                lib/firebase.js.
   2. Redis   — KV_REST_API_* or UPSTASH_REDIS_REST_*, whether injected by
                Vercel's Upstash integration or pasted in from an Upstash
                account. Spoken over plain fetch — no SDK to cold-start.
   3. Gist    — GIST_ID + GIST_TOKEN. A secret GitHub gist; see lib/gist.js.
                Needs no account you don't already have.
   4. File    — local development (`npm start`): data/store.json, written
                atomically via a .tmp file + rename.
   5. Memory  — the fallback if we're serverless with none configured. The
                app runs, but data is per-instance and vanishes on redeploy,
                so we say so loudly in the logs once.

   Set exactly one. They're checked in the order above, so a half-finished
   migration resolves to a single store rather than quietly splitting the
   data across two.
   ============================================================ */

const fs = require('fs');
const path = require('path');
const firebase = require('./firebase');
const gist = require('./gist');

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
  if (gist.configured()) return 'gist';
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

// Several people polling at once would otherwise each spend a round trip on
// identical data. A couple of seconds is well under the client's polling
// interval, so nobody perceives it, and it keeps a busy Saturday from
// multiplying every viewer into its own database call.
const READ_CACHE_MS = Number(process.env.TNT_READ_CACHE_MS || 2000);
let cached = null; // { at, doc }

async function read() {
  if (cached && Date.now() - cached.at < READ_CACHE_MS) return clone(cached.doc);
  const doc = await readFresh();
  cached = { at: Date.now(), doc };
  return clone(doc);
}

async function readFresh() {
  const mode = backend();

  if (mode === 'firebase') {
    return normalize(await firebase.read());
  }

  if (mode === 'gist') {
    return normalize(await gist.read());
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
        'instances, so different people can see different data. Set one of: ' +
        'GIST_ID + GIST_TOKEN, KV_REST_API_URL + KV_REST_API_TOKEN, or ' +
        'FIREBASE_DB_URL + FIREBASE_DB_SECRET.'
    );
  }
  if (!memory) memory = clone(EMPTY);
  return clone(memory);
}

async function write(data) {
  const doc = normalize(data);
  const mode = backend();
  // We know exactly what the store holds now, so seed the cache rather than
  // letting the next read go and fetch back what we just sent.
  cached = { at: Date.now(), doc: clone(doc) };

  if (mode === 'firebase') {
    await firebase.write(doc);
    return;
  }

  if (mode === 'gist') {
    await gist.write(doc);
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

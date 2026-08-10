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

const EMPTY = { ballots: {}, predictions: {}, rev: 0 };
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

// Write only if the stored value is still byte-for-byte what we read. We hold
// the exact string Redis gave us, so there's nothing to parse or compare
// field-by-field — and no need for cjson, which not every hosted Redis has.
const CAS_SCRIPT = `
local cur = redis.call('GET', KEYS[1])
if (cur == false and ARGV[1] == '') or cur == ARGV[1] then
  redis.call('SET', KEYS[1], ARGV[2])
  return 1
end
return 0`;

// Upstash runs EVAL, but if some other Redis behind KV_REST_API_URL doesn't,
// fall back to a plain SET rather than refusing to save at all: that's the old
// behaviour, so the worst case is the bug we're fixing and not a dead site.
// Only an actual "I don't know that command" counts — a timeout or a 500 is a
// failure to report, not a reason to quietly give up on conditional writes for
// the rest of this instance's life.
let redisNoEval = false;
const looksUnsupported = (msg) =>
  /unknown command|unsupported|not supported|not allowed|ERR eval/i.test(msg || '');

async function redisPut(json, token) {
  if (token !== null && !redisNoEval) {
    try {
      return (await redisCmd(['EVAL', CAS_SCRIPT, '1', KEY, token, json])) === 1;
    } catch (err) {
      if (!looksUnsupported(err.message)) throw err;
      redisNoEval = true;
      console.warn(
        '[tnt] This Redis will not run EVAL, so saves cannot be made conditional: ' +
          `${err.message}. Two people saving in the same instant may now overwrite ` +
          'each other. Everything else works normally.'
      );
    }
  }
  await redisCmd(['SET', KEY, json]);
  return true;
}

/* ---------- Memory ---------- */

let memory = null;
let warnedAboutMemory = false;
const memoryToken = () => (memory ? JSON.stringify(memory) : '');

/* ---------- Public API ---------- */

// Deliberately uncached. Caching reads here looks like an easy win — several
// people polling at once each spend a round trip on identical data — but each
// serverless instance caches separately, so the instance that didn't handle
// your save keeps serving its own copy from before it. The client then
// repaints your ballot from that older copy and the team you just ranked
// disappears off the screen. Read-after-write has to hold; the databases are
// consistent, so going straight to them is what makes it hold.
//
// A read also hands back a token: whatever this backend can later use to say
// "only write if nothing has changed since I read this". A null token means
// this backend can't do that, and the write goes through unconditionally.
async function readWithToken() {
  const mode = backend();

  if (mode === 'firebase') {
    const { data, etag } = await firebase.read();
    return { doc: normalize(data), token: etag };
  }

  if (mode === 'gist') {
    // GitHub has no conditional gist update, so gist saves are only protected
    // by the in-process lock below — fine on one server, not across Vercel's
    // several instances. Use Redis or Firebase if that matters to you.
    return { doc: normalize(await gist.read()), token: null };
  }

  if (mode === 'redis') {
    const raw = await redisCmd(['GET', KEY]);
    if (raw === null || raw === undefined) return { doc: clone(EMPTY), token: '' };
    // The token is the stored string itself, so it must be the string Redis
    // actually holds; anything else can't be compared against it.
    const token = typeof raw === 'string' ? raw : null;
    try {
      return { doc: normalize(typeof raw === 'string' ? JSON.parse(raw) : raw), token };
    } catch {
      return { doc: clone(EMPTY), token };
    }
  }

  if (mode === 'file') {
    let text = '';
    try {
      text = fs.readFileSync(DATA_FILE, 'utf8');
    } catch {
      return { doc: clone(EMPTY), token: '' }; // first run, no file yet
    }
    try {
      return { doc: normalize(JSON.parse(text)), token: text };
    } catch {
      return { doc: clone(EMPTY), token: text };
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
  // Don't create the document just by reading it — that would make the very
  // first write look like a conflict against a store we invented ourselves.
  return { doc: memory ? clone(memory) : clone(EMPTY), token: memoryToken() };
}

async function read() {
  return (await readWithToken()).doc;
}

// Hand the document to the backend. Returns false — and writes nothing — when
// a token was supplied and the store has moved on since it was read.
async function put(doc, token) {
  const mode = backend();

  if (mode === 'firebase') return firebase.write(doc, token);
  if (mode === 'gist') {
    await gist.write(doc);
    return true;
  }
  if (mode === 'redis') return redisPut(JSON.stringify(doc), token);

  if (mode === 'file') {
    // Every step here is synchronous, so nothing can slip between the check
    // and the write.
    if (token !== null) {
      let cur = '';
      try {
        cur = fs.readFileSync(DATA_FILE, 'utf8');
      } catch {
        cur = '';
      }
      if (cur !== token) return false;
    }
    fs.mkdirSync(DATA_DIR, { recursive: true });
    const tmp = DATA_FILE + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(doc, null, 2));
    fs.renameSync(tmp, DATA_FILE);
    return true;
  }

  if (token !== null && memoryToken() !== token) return false;
  memory = clone(doc);
  return true;
}

// Every write bumps the revision. Clients use it to recognise and drop a
// response that's older than something they've already seen, whichever
// instance or retry it came from.
function bumped(data) {
  const doc = normalize(data);
  doc.rev = (Number(doc.rev) || 0) + 1;
  return doc;
}

// Unconditional write — last writer wins. Only /api/health's round-trip test
// wants this; everything that changes a ballot goes through update().
async function write(data) {
  const doc = bumped(data);
  await put(doc, null);
  return doc.rev;
}

/* ---------- changing something ---------- */

// Saving is read-modify-write: read the whole document, change one ballot,
// write it back. Two of those overlapping means the second read happens before
// the first write lands, and whoever writes last silently erases the other
// person's ballot. On a Saturday night with everyone re-ranking at once that's
// the normal case, not a rare one — and both people are told "Saved".
//
// So a write only lands if the document is still what we read; if it isn't, we
// read again, re-apply the change, and retry. `mutate` is therefore called
// once per attempt and must be safe to re-run: ours just assign one key.
const MAX_ATTEMPTS = 6;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Within one instance, run updates one at a time. That alone settles it for
// the local server and the gist backend, and it keeps the retry loop below
// from fighting with itself.
let queue = Promise.resolve();
function serialize(fn) {
  const run = queue.then(fn, fn);
  queue = run.then(
    () => {},
    () => {}
  );
  return run;
}

async function update(mutate) {
  return serialize(async () => {
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      const { doc, token } = await readWithToken();
      mutate(doc);
      const next = bumped(doc);
      if (await put(next, token)) return next;
      // Somebody else got in first. Back off a little — with jitter, so two
      // clients that collided don't collide again in step.
      await sleep(25 * (attempt + 1) + Math.floor(Math.random() * 40));
    }
    throw new Error(
      `Could not save after ${MAX_ATTEMPTS} attempts — too many writes at once.`
    );
  });
}

function normalize(raw) {
  const out = clone(EMPTY);
  if (raw && typeof raw === 'object') {
    if (raw.ballots && typeof raw.ballots === 'object') out.ballots = raw.ballots;
    if (raw.predictions && typeof raw.predictions === 'object') out.predictions = raw.predictions;
    if (Number.isFinite(Number(raw.rev))) out.rev = Number(raw.rev);
  }
  return out;
}

module.exports = { read, write, update, backend };

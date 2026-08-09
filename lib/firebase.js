/* ============================================================
   Firebase Realtime Database over its REST API.

   RTDB is a good fit here because this app's entire store is one JSON
   document, which is exactly the shape RTDB speaks — a GET and a PUT against
   a single path, no SDK and nothing to cold-start in a serverless function.

   Two ways to authenticate, whichever your console gives you:

     FIREBASE_DB_URL + FIREBASE_DB_SECRET
       The legacy database secret (Project Settings -> Service Accounts ->
       Database secrets). One env var, passed straight through as ?auth=.
       Google calls it legacy, but it still works and it's the quickest path.

     FIREBASE_DB_URL + FIREBASE_SERVICE_ACCOUNT
       The current, supported way: paste the whole service-account JSON in.
       We sign a JWT with its private key and trade that for a short-lived
       Google access token, cached until just before it expires.

   Note that the browser never talks to Firebase — only these server-side
   functions do. That's deliberate: the predictions privacy rule (nobody sees
   anyone else's picks before the lock) is enforced in lib/core.js, and it
   only holds if reads go through the server. Pointing the client straight at
   Firebase would need real per-user auth and security rules to replace it.
   ============================================================ */

const crypto = require('crypto');

const DB_URL = (process.env.FIREBASE_DB_URL || '').replace(/\/+$/, '');
const DB_SECRET = process.env.FIREBASE_DB_SECRET || '';
const SERVICE_ACCOUNT = process.env.FIREBASE_SERVICE_ACCOUNT || '';
// RTDB paths can't contain . $ # [ ] or /
const DB_PATH = (process.env.FIREBASE_DB_PATH || 'tnt/store').replace(/^\/+|\/+$/g, '');

const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const SCOPES = [
  'https://www.googleapis.com/auth/firebase.database',
  'https://www.googleapis.com/auth/userinfo.email',
].join(' ');

function configured() {
  return !!(DB_URL && (DB_SECRET || SERVICE_ACCOUNT));
}

const b64url = (buf) =>
  Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

let cachedToken = null; // { value, expiresAt }

async function accessToken() {
  if (DB_SECRET) return DB_SECRET;

  if (cachedToken && Date.now() < cachedToken.expiresAt) return cachedToken.value;

  let sa;
  try {
    sa = JSON.parse(SERVICE_ACCOUNT);
  } catch {
    throw new Error('FIREBASE_SERVICE_ACCOUNT is not valid JSON');
  }
  if (!sa.client_email || !sa.private_key) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT is missing client_email or private_key');
  }

  const iat = Math.floor(Date.now() / 1000);
  const claims = {
    iss: sa.client_email,
    scope: SCOPES,
    aud: TOKEN_URL,
    iat,
    exp: iat + 3600,
  };
  const unsigned =
    `${b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))}.${b64url(JSON.stringify(claims))}`;
  // Env vars flatten the key's newlines; put them back or the sign fails.
  const key = sa.private_key.replace(/\\n/g, '\n');
  const signature = b64url(crypto.createSign('RSA-SHA256').update(unsigned).sign(key));

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: `${unsigned}.${signature}`,
    }),
  });
  if (!res.ok) {
    throw new Error(`Firebase token exchange failed: ${res.status} ${await res.text()}`);
  }
  const json = await res.json();
  cachedToken = {
    value: json.access_token,
    // Renew a minute early so a request never rides an expiring token.
    expiresAt: Date.now() + Math.max(60, (json.expires_in || 3600) - 60) * 1000,
  };
  return cachedToken.value;
}

async function url() {
  return `${DB_URL}/${DB_PATH}.json?auth=${encodeURIComponent(await accessToken())}`;
}

async function read() {
  const res = await fetch(await url(), { cache: 'no-store' });
  if (!res.ok) throw new Error(`Firebase read failed: ${res.status} ${await res.text()}`);
  return res.json(); // null when the path has never been written
}

async function write(doc) {
  const res = await fetch(await url(), {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(doc),
  });
  if (!res.ok) throw new Error(`Firebase write failed: ${res.status} ${await res.text()}`);
}

module.exports = { configured, read, write };

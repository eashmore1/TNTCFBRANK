/* ============================================================
   A secret GitHub Gist as the database.

   Not glamorous, but it fits this app unusually well: the whole store is one
   small JSON document, a gist is one small file you already own, and the only
   account involved is the GitHub account this repo is already in. No card, no
   project quota, no third-party signup.

   Set GIST_ID and GIST_TOKEN (a token with the `gist` scope). The gist should
   be secret and contain a file named by GIST_FILE — default tnt-store.json.

   Three things to know. Reads go through api.github.com, which allows 5,000
   authenticated requests an hour — enough for a handful of friends polling
   every few seconds, but it is a ceiling. Every save writes a gist revision,
   so the history grows one entry per ballot change: harmless, just busy
   looking. And GitHub offers no conditional gist update, so unlike Redis and
   Firebase a gist can't refuse a write that would clobber someone else's —
   two people saving in the same instant, on two different serverless
   instances, can still cost one of them their ballot.
   ============================================================ */

const GIST_ID = process.env.GIST_ID || '';
const GIST_TOKEN = process.env.GIST_TOKEN || process.env.GITHUB_TOKEN || '';
const GIST_FILE = process.env.GIST_FILE || 'tnt-store.json';

const API = process.env.GIST_API_BASE || 'https://api.github.com';

function configured() {
  return !!(GIST_ID && GIST_TOKEN);
}

function headers(extra) {
  return {
    Authorization: `Bearer ${GIST_TOKEN}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'tnt-cfb-rankings',
    ...extra,
  };
}

async function read() {
  const res = await fetch(`${API}/gists/${GIST_ID}`, {
    headers: headers(),
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`Gist read failed: ${res.status} ${await res.text()}`);

  const json = await res.json();
  const file = json.files && json.files[GIST_FILE];
  if (!file) return null; // gist exists but we've never written our file

  // Files over a megabyte come back truncated with a raw_url to fetch
  // instead. This store won't get there, but silently losing everyone's
  // ballots to a truncation bug is not the way to find that out.
  let content = file.content;
  if (file.truncated && file.raw_url) {
    const raw = await fetch(file.raw_url, { headers: headers(), cache: 'no-store' });
    if (!raw.ok) throw new Error(`Gist raw read failed: ${raw.status}`);
    content = await raw.text();
  }

  if (!content || !content.trim()) return null;
  try {
    return JSON.parse(content);
  } catch {
    throw new Error(`Gist file ${GIST_FILE} is not valid JSON`);
  }
}

async function write(doc) {
  const res = await fetch(`${API}/gists/${GIST_ID}`, {
    method: 'PATCH',
    headers: headers({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({
      files: { [GIST_FILE]: { content: JSON.stringify(doc, null, 2) } },
    }),
  });
  if (!res.ok) throw new Error(`Gist write failed: ${res.status} ${await res.text()}`);
}

module.exports = { configured, read, write };

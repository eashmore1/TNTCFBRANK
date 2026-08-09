const store = require('../lib/store');

// GET /api/health — is the database actually wired up, and does a write
// survive? Open this in a browser when something didn't save; it answers in
// one screen what would otherwise be guesswork.
//
// It deliberately reports no credentials, only which backend was selected.
module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');

  const mode = store.backend();
  const out = {
    backend: mode,
    persistent: mode !== 'memory',
  };

  if (mode === 'memory') {
    out.problem =
      'No database is configured, so ballots are held in memory: they are lost ' +
      'on every redeploy and are not shared between serverless instances. Set ' +
      'KV_REST_API_URL + KV_REST_API_TOKEN (Upstash), GIST_ID + GIST_TOKEN, or ' +
      'FIREBASE_DB_URL + a Firebase credential, then redeploy.';
  }

  try {
    const doc = await store.read();
    out.read = 'ok';
    out.rev = doc.rev;
    out.weeksWithBallots = Object.keys(doc.ballots).length;
    out.users = [
      ...new Set(Object.values(doc.ballots).flatMap((w) => Object.keys(w))),
    ].sort();
    out.predictionsSubmitted = Object.keys(doc.predictions).length;

    // Round-trip a value through the store to prove writes land and come back.
    if (req.query && req.query.write === '1') {
      const before = doc.rev;
      await store.write(doc);
      const after = await store.read();
      out.writeTest =
        after.rev > before
          ? `ok — revision went ${before} -> ${after.rev}`
          : `FAILED — wrote at revision ${before} but read back ${after.rev}. ` +
            'Writes are not surviving, which is why nothing saves.';
    }
  } catch (err) {
    out.read = 'FAILED';
    out.error = String(err.message || err);
    out.problem =
      'The database rejected us. If this mentions 401 or Permission denied the ' +
      'credentials are wrong; if it mentions ENOTFOUND or fetch failed the URL is.';
  }

  res.status(200).json(out);
};

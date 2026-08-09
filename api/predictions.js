const core = require('../lib/core');
const { readJsonBody } = require('../lib/body');

// GET  /api/predictions?user=Evan   — Evan's own picks (and the names of who
//                                     else has picked), or everyone's once the
//                                     Aug 29 lock has passed.
// POST /api/predictions { user, prediction } — save, then the same payload.
//
// The filtering happens in core.predPayload, on the server, on purpose: before
// the lock, another person's picks are never put on the wire at all, so they
// can't be dug out of dev tools.
module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  try {
    if (req.method === 'GET') {
      const user = (req.query && req.query.user) || '';
      res.status(200).json(await core.getPredictions(user));
      return;
    }
    if (req.method === 'POST') {
      const body = await readJsonBody(req);
      res.status(200).json(await core.savePrediction(body));
      return;
    }
    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('[tnt] /api/predictions failed:', err);
    res.status(500).json({ error: 'Could not load predictions' });
  }
};

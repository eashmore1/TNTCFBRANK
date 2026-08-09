const core = require('../lib/core');
const { readJsonBody } = require('../lib/body');

// POST /api/ballot { week, user, ranking } — saves one person's Top 25 for one
// week and returns the full ballot set back, so the sender repaints instantly
// instead of waiting for its next poll.
module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  try {
    const body = await readJsonBody(req);
    res.status(200).json(await core.saveBallot(body));
  } catch (err) {
    console.error('[tnt] /api/ballot failed:', err);
    res.status(500).json({ error: 'Could not save ballot' });
  }
};

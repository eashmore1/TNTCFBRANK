const core = require('../lib/core');

// GET /api/sync?user=Evan — everything the client polls for, in one request
// off a single storage read: the week list, every ballot, the server clock,
// and whatever predictions this user is allowed to see.
//
// This is deliberately one endpoint rather than two. Polling is the app's
// steady-state traffic, so each extra request here is an extra function
// invocation and an extra Redis command every few seconds, for every open
// tab, forever.
module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  try {
    const user = (req.query && req.query.user) || '';
    res.status(200).json(await core.getSync(user));
  } catch (err) {
    console.error('[tnt] /api/sync failed:', err);
    res.status(500).json({ error: 'Could not load rankings' });
  }
};

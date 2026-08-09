const core = require('../lib/core');

// GET /api/state — everything public: the week list, every ballot, and the
// server's clock (the client uses `now` to run an honest lock countdown even
// if the phone's clock is wrong).
module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  try {
    res.status(200).json(await core.getInit());
  } catch (err) {
    console.error('[tnt] /api/state failed:', err);
    res.status(500).json({ error: 'Could not load rankings' });
  }
};

/* Local development server.
 *
 * On Vercel there is no server: public/ is served as static files and each
 * file in api/ becomes its own function. This runs that same code behind
 * Express so `npm start` behaves exactly like production — same endpoints,
 * same handlers, same rules — just with data/store.json standing in for Redis.
 */

const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

const syncApi = require('./api/sync');
const ballotApi = require('./api/ballot');
const predictionsApi = require('./api/predictions');

app.use(express.json({ limit: '256kb' }));

// Vercel hands the handler a parsed req.query; Express already does too.
app.get('/api/sync', syncApi);
app.post('/api/ballot', ballotApi);
app.all('/api/predictions', predictionsApi);

app.use(express.static(path.join(__dirname, 'public')));
app.use('/vendor', express.static(path.join(__dirname, 'node_modules', 'sortablejs')));

app.listen(PORT, () => {
  const { backend } = require('./lib/store');
  console.log(`TNT CFB Rankings running on http://localhost:${PORT}  (store: ${backend()})`);
});

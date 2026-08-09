/* ============================================================
   Live updates without a socket.

   The app was built against Socket.IO, but Vercel runs on serverless
   functions: a function instance can hold one client's connection, and it
   has no way to push to everybody else's. Fan-out — "Blake saved a ballot,
   so Evan's TNT Ranking should change" — is exactly what this app needs and
   exactly what serverless can't do.

   So the transport is polling instead of pushing, and this file wears the
   Socket.IO costume: it exposes the same io() / .on() / .emit() surface, so
   app.js is unchanged and doesn't know the difference. Saves still apply
   instantly for the person making them (the POST hands back fresh state);
   everyone else sees it within POLL_MS.
   ============================================================ */

(function () {
  const POLL_MS = 3000;
  const MAX_BACKOFF_MS = 30000;

  const handlers = {};
  const client = {
    on(event, fn) {
      (handlers[event] || (handlers[event] = [])).push(fn);
      return client;
    },
    emit(event, payload) {
      const send = EMITTERS[event];
      if (send) send(payload);
      return client;
    },
  };

  function fire(event, data) {
    for (const fn of handlers[event] || []) {
      try {
        fn(data);
      } catch (err) {
        console.error(`[tnt] handler for "${event}" threw:`, err);
      }
    }
  }

  /* ---------- state ---------- */

  let currentUser = null;
  let started = false;
  let lastBallotsJSON = null;
  let lastPredJSON = null;

  // A poll that was already in flight when we wrote must not be allowed to
  // overwrite what we just wrote with the state from before the write.
  let lastBallotWriteAt = 0;
  let lastPredWriteAt = 0;

  let failures = 0;
  let timer = null;

  async function getJSON(url) {
    const res = await fetch(url, { cache: 'no-store', headers: { Accept: 'application/json' } });
    if (!res.ok) throw new Error(`${url} -> ${res.status}`);
    return res.json();
  }

  async function postJSON(url, body) {
    const res = await fetch(url, {
      method: 'POST',
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`${url} -> ${res.status}`);
    return res.json();
  }

  /* ---------- polling ---------- */

  async function pullState() {
    const startedAt = Date.now();
    const data = await getJSON('/api/state');
    if (lastBallotWriteAt > startedAt) return; // stale; our own write is newer

    const ballotsJSON = JSON.stringify(data.state && data.state.ballots);
    if (lastBallotsJSON === null) {
      lastBallotsJSON = ballotsJSON;
      fire('init', data);
    } else if (ballotsJSON !== lastBallotsJSON) {
      lastBallotsJSON = ballotsJSON;
      fire('state', data.state);
    }
  }

  async function pullPredictions() {
    const startedAt = Date.now();
    const data = await getJSON(
      `/api/predictions?user=${encodeURIComponent(currentUser || '')}`
    );
    if (lastPredWriteAt > startedAt) return; // stale; our own write is newer

    const json = JSON.stringify(data);
    if (json === lastPredJSON) return;
    lastPredJSON = json;
    fire('predictions', data);
  }

  async function tick() {
    try {
      await pullState();
      await pullPredictions();
      failures = 0;
    } catch (err) {
      failures++;
      if (failures === 1) console.warn('[tnt] update failed, will retry:', err.message);
    }
    schedule();
  }

  function schedule() {
    clearTimeout(timer);
    if (document.hidden) return; // nothing to repaint; resume on focus
    const delay = failures ? Math.min(POLL_MS * 2 ** failures, MAX_BACKOFF_MS) : POLL_MS;
    timer = setTimeout(tick, delay);
  }

  function pollNow() {
    clearTimeout(timer);
    tick();
  }

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && started) pollNow();
  });

  /* ---------- the emit side ---------- */

  const EMITTERS = {
    async saveBallot(payload) {
      lastBallotWriteAt = Date.now();
      try {
        const state = await postJSON('/api/ballot', payload);
        lastBallotsJSON = JSON.stringify(state.ballots);
        fire('state', state);
      } catch (err) {
        console.error('[tnt] ballot save failed:', err.message);
      }
    },

    async identify(payload) {
      currentUser = (payload && payload.user) || null;
      lastPredJSON = null; // different person, different picks
      try {
        const data = await getJSON(
          `/api/predictions?user=${encodeURIComponent(currentUser || '')}`
        );
        lastPredJSON = JSON.stringify(data);
        fire('predictions', data);
      } catch (err) {
        console.error('[tnt] identify failed:', err.message);
      }
    },

    async savePrediction(payload) {
      lastPredWriteAt = Date.now();
      try {
        const data = await postJSON('/api/predictions', payload);
        lastPredJSON = JSON.stringify(data);
        fire('predictions', data);
      } catch (err) {
        console.error('[tnt] prediction save failed:', err.message);
      }
    },
  };

  // app.js runs `io()` at the top of the file but registers its handlers
  // further down. Deferring the first poll by a macrotask guarantees every
  // handler is attached before 'init' fires.
  window.io = function io() {
    if (!started) {
      started = true;
      setTimeout(pollNow, 0);
    }
    return client;
  };
})();

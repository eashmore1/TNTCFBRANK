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
  // Polling is this app's steady-state traffic: every tick is a serverless
  // invocation and a storage read, per open tab, forever. So the loop is
  // adaptive — quick while something is actually happening, then backing off
  // toward IDLE_MS once the page has been sitting still. A tab left open on
  // the couch all afternoon costs ~2 requests a minute instead of 20.
  const ACTIVE_MS = 3000; // right after a change, yours or anyone's
  const IDLE_MS = 15000; // nothing has moved and nobody's touching the page
  const RAMP = 2; // how fast quiet backs off toward IDLE_MS
  const MAX_BACKOFF_MS = 60000; // only after outright failures
  const INTERACT_THROTTLE_MS = 2000;

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

  // Every write bumps the store's revision, so anything that comes back with
  // a lower one is a view of the past and gets dropped on the floor. Belt and
  // braces against responses arriving out of order, a retry landing late, or
  // an instance answering from behind.
  let lastRev = -1;

  function staleRev(rev) {
    if (!Number.isFinite(rev)) return false; // no rev to judge by; let it through
    if (rev < lastRev) return true;
    lastRev = rev;
    return false;
  }

  let failures = 0;
  let timer = null;
  let idleDelay = ACTIVE_MS; // grows while nothing changes

  // Something happened worth watching closely — go back to a quick cadence.
  function wakeUp() {
    idleDelay = ACTIVE_MS;
  }

  async function getJSON(url) {
    const res = await fetch(url, { cache: 'no-store', headers: { Accept: 'application/json' } });
    if (!res.ok) throw new Error(`${url} -> ${res.status}`);
    return res.json();
  }

  // A save is somebody's ballot, so a flaky connection or a cold function
  // shouldn't cost them it. Three quick attempts before we admit defeat.
  async function retry(fn, attempts = 3) {
    let lastErr;
    for (let i = 0; i < attempts; i++) {
      try {
        return await fn();
      } catch (err) {
        lastErr = err;
        if (i < attempts - 1) await new Promise((r) => setTimeout(r, 400 * 2 ** i));
      }
    }
    throw lastErr;
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

  // One request per tick, one storage read behind it, both halves of the
  // payload out of the same trip.
  async function pull() {
    const startedAt = Date.now();
    const data = await getJSON(`/api/sync?user=${encodeURIComponent(currentUser || '')}`);
    if (staleRev(data.rev)) return; // older than something we've already applied
    let changed = false;

    if (lastBallotWriteAt <= startedAt) {
      const ballotsJSON = JSON.stringify(data.state && data.state.ballots);
      if (lastBallotsJSON === null) {
        lastBallotsJSON = ballotsJSON;
        fire('init', data);
        changed = true;
      } else if (ballotsJSON !== lastBallotsJSON) {
        lastBallotsJSON = ballotsJSON;
        fire('state', data.state);
        changed = true;
      }
    }

    if (data.predictions && lastPredWriteAt <= startedAt) {
      const json = JSON.stringify(data.predictions);
      if (json !== lastPredJSON) {
        lastPredJSON = json;
        fire('predictions', data.predictions);
        changed = true;
      }
    }

    // Someone's doing something — stay sharp. Otherwise drift toward idle.
    if (changed) wakeUp();
    else idleDelay = Math.min(idleDelay * RAMP, IDLE_MS);
  }

  // A focus event or a save can ask for a poll while one is already running;
  // queue it rather than running two at once.
  let inFlight = false;
  let queued = false;

  async function tick() {
    if (inFlight) {
      queued = true;
      return;
    }
    inFlight = true;
    try {
      await pull();
      failures = 0;
    } catch (err) {
      failures++;
      if (failures === 1) console.warn('[tnt] update failed, will retry:', err.message);
    } finally {
      inFlight = false;
    }
    if (queued) {
      queued = false;
      tick();
      return;
    }
    schedule();
  }

  function schedule() {
    clearTimeout(timer);
    if (document.hidden) return; // nobody's looking; resume on focus
    const delay = failures
      ? Math.min(ACTIVE_MS * 2 ** failures, MAX_BACKOFF_MS)
      : idleDelay;
    timer = setTimeout(tick, delay);
  }

  function pollNow() {
    clearTimeout(timer);
    wakeUp();
    tick();
  }

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && started) pollNow();
  });

  // If you're touching the page at all — scrolling the poll, flipping tabs,
  // dragging a helmet — you're watching, so keep updates quick. Walk away and
  // it settles back down to IDLE_MS on its own.
  let lastInteraction = 0;
  const noteInteraction = () => {
    const now = Date.now();
    if (now - lastInteraction < INTERACT_THROTTLE_MS) return;
    lastInteraction = now;
    if (!started || document.hidden) return;
    if (idleDelay === ACTIVE_MS) return; // already quick, leave the timer alone
    wakeUp();
    schedule(); // pull the next poll in rather than waiting out a long delay
  };
  for (const evt of ['pointerdown', 'keydown', 'scroll', 'touchstart']) {
    window.addEventListener(evt, noteInteraction, { passive: true });
  }

  /* ---------- the emit side ---------- */

  const EMITTERS = {
    async saveBallot(payload) {
      lastBallotWriteAt = Date.now();
      wakeUp(); // you're mid-session; watch closely for a bit
      try {
        const state = await retry(() => postJSON('/api/ballot', payload));
        lastBallotWriteAt = Date.now(); // retries may have taken a while
        staleRev(state.rev); // our own write — always the newest, so record it
        lastBallotsJSON = JSON.stringify(state.ballots);
        fire('state', state);
        fire('saveResult', {
          what: 'ballot',
          ok: !state.rejected,
          reason: state.rejected,
        });
      } catch (err) {
        console.error('[tnt] ballot save failed:', err.message);
        fire('saveResult', { what: 'ballot', ok: false, error: err.message });
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
      wakeUp();
      try {
        const data = await retry(() => postJSON('/api/predictions', payload));
        lastPredWriteAt = Date.now();
        staleRev(data.rev);
        lastPredJSON = JSON.stringify(data);
        fire('predictions', data);
        fire('saveResult', { what: 'prediction', ok: true });
      } catch (err) {
        console.error('[tnt] prediction save failed:', err.message);
        fire('saveResult', { what: 'prediction', ok: false, error: err.message });
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

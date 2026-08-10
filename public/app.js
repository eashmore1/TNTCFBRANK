/* TNT CFB Rankings - client */

const socket = io();

let WEEKS = [];
let state = null; // { ballots: { [week]: { [user]: [teamId] } } }
let me = localStorage.getItem('tnt-user') || null;
let viewWeek = null;
let activeConf = 'All';
let lastSavedJSON = null;
// True from the moment you change your ballot until the server confirms it
// back. While it's set, nothing arriving from the server may rebuild the
// editor — otherwise a poll landing mid-save repaints your list from the
// server's older copy and the teams you just ranked vanish off the screen.
let ballotDirty = false;
// When each week's ballot closes, from the server. Populated on 'init'.
let weekLocks = {};
let lastDragEnd = 0; // suppresses the click that fires at the end of a drag

const $ = (sel) => document.querySelector(sel);
const rankingList = $('#rankingList');
const teamPool = $('#teamPool');

// Inject the shared helmet clip-path + gradient once, before any helmet renders.
document.body.insertAdjacentHTML('afterbegin', helmetDefsSVG());

/* ============ helpers ============ */

function myBallot(week = viewWeek) {
  return (state.ballots[week] && state.ballots[week][me]) || [];
}

function weekBallots(week = viewWeek) {
  return state.ballots[week] || {};
}

function editorRanking() {
  return [...rankingList.children].map((li) => li.dataset.id);
}

// Only the teams we can actually draw. A stored id that isn't in teams.js (a
// school renamed between deploys, say) would otherwise leave the saved ballot
// and the on-screen list permanently disagreeing, and the reconcile below
// would rebuild the editor on every single poll trying to fix it.
function myBallotOnScreen(week = viewWeek) {
  return myBallot(week).filter((id) => TEAM_MAP[id]);
}

// Mid-drag the list is in a temporary state that matches nothing saved.
// Rebuilding it now yanks the row out from under the finger holding it and the
// move is silently undone — so we leave it alone and reconcile after the drop.
function editorBusy() {
  return document.body.classList.contains('is-dragging');
}

function allKnownUsers() {
  const users = new Set();
  for (const week of Object.keys(state.ballots)) {
    for (const u of Object.keys(state.ballots[week])) users.add(u);
  }
  return [...users];
}

// Names are the one thing on this page that people type themselves, and they
// get dropped into innerHTML on everyone else's screen. Without this, picking
// the name `<img src=x onerror=...>` runs whatever you like in your friends'
// browsers. Everything else rendered here comes from teams.js or polls.js.
const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ESCAPES[c]);
}

function showToast(msg, ms = 2600) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.remove('hidden');
  clearTimeout(showToast._timer);
  showToast._timer = setTimeout(() => t.classList.add('hidden'), ms);
}

/* ============ weekly ballot deadlines ============ */

// A week's ballot closes when the next week's games kick off, so you can't go
// back and rewrite history once the season has moved past it. The server
// enforces it; this is what makes the page explain itself.
function weekLockTsFor(week = viewWeek) {
  const ts = weekLocks[week];
  return Number.isFinite(ts) ? ts : null;
}

function isWeekLocked(week = viewWeek) {
  const ts = weekLockTsFor(week);
  return ts !== null && serverNow() >= ts;
}

function fmtDeadline(ts) {
  return new Date(ts).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/* ============ saving ============ */

let saveTimer = null;
function scheduleSave() {
  if (isWeekLocked()) return; // closed weeks are final
  ballotDirty = true;
  $('#saveStatus').textContent = 'Saving…';
  $('#saveStatus').classList.add('saving');
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    const ranking = editorRanking();
    lastSavedJSON = JSON.stringify(ranking);
    // Says "Saving…" until the server actually confirms it. Claiming "Saved"
    // the moment we hand it to the network is how a lost ballot looks like a
    // successful one.
    socket.emit('saveBallot', { week: viewWeek, user: me, ranking });
  }, 350);
}

/* ============ ballot editor rendering ============ */

function rankedItemHTML(team) {
  return `
    <span class="grip" title="Drag to reorder" aria-hidden="true">⠿</span>
    ${helmetSVG(team, 46)}
    <div class="ranked-info">
      <div class="school">${team.school}</div>
      <div class="mascot">${team.mascot}</div>
    </div>
    <div class="rank-controls">
      <button class="move-btn move-up" title="Move up" aria-label="Move up">▲</button>
      <button class="move-btn move-down" title="Move down" aria-label="Move down">▼</button>
    </div>
    <button class="remove-btn" title="Remove from ballot" aria-label="Remove">✕</button>`;
}

function rankedRowHTML(team) {
  return `<li class="ranked-item" data-id="${team.id}">${rankedItemHTML(team)}</li>`;
}

function teamCardHTML(team) {
  return `<div class="team-card" data-id="${team.id}" data-conf="${team.conf}">
    <span class="add-cue" aria-hidden="true">＋</span>
    ${helmetSVG(team, 66)}
    <div class="school">${team.school}</div>
    <div class="mascot">${team.mascot}</div>
  </div>`;
}

// Build a single DOM node from an HTML string (used by drag/click handlers that
// move one team at a time; bulk rendering uses innerHTML directly).
function nodeFromHTML(html) {
  const tmp = document.createElement('template');
  tmp.innerHTML = html.trim();
  return tmp.content.firstChild;
}

function makeRankedItem(team) {
  return nodeFromHTML(rankedRowHTML(team));
}

function makeTeamCard(team) {
  return nodeFromHTML(teamCardHTML(team));
}

// Convert a pool card into a ranked row (or vice versa) after a cross-list drag.
function morphToRanked(el) {
  const team = TEAM_MAP[el.dataset.id];
  const li = makeRankedItem(team);
  el.replaceWith(li);
}

function morphToCard(el) {
  const team = TEAM_MAP[el.dataset.id];
  const card = makeTeamCard(team);
  el.replaceWith(card);
  applyPoolFilters();
  return card;
}

function insertCardAlphabetically(card) {
  const school = TEAM_MAP[card.dataset.id].school.toLowerCase();
  for (const other of teamPool.children) {
    if (other === card) continue;
    if (TEAM_MAP[other.dataset.id].school.toLowerCase() > school) {
      teamPool.insertBefore(card, other);
      return;
    }
  }
  teamPool.appendChild(card);
}

function updateEditorMeta() {
  const n = rankingList.children.length;
  $('#ballotWeekLabel').textContent = `· ${viewWeek} · ${n}/25`;
  $('#rankingEmptyHint').classList.toggle('hidden', n > 0);
  $('#rankingEmptyHint').textContent =
    n === 0 ? 'Tap any helmet below to start your Top 25 🏈' : '';
  $('#copyPrevBtn').classList.toggle('hidden', WEEKS.indexOf(viewWeek) === 0);
}

// A closed week is shown as a plain, final list — no grip, no arrows, no ✕.
function lockedRowHTML(team, i) {
  return `<li class="ranked-item locked" data-id="${team.id}">
    <span class="locked-rank">${i + 1}</span>
    ${helmetSVG(team, 46)}
    <div class="ranked-info">
      <div class="school">${team.school}</div>
      <div class="mascot">${team.mascot}</div>
    </div>
  </li>`;
}

function renderWeekLockBar() {
  const bar = $('#weekLockBar');
  const ts = weekLockTsFor();
  if (ts === null) {
    bar.classList.add('hidden');
    return;
  }
  if (isWeekLocked()) {
    bar.className = 'lock-bar locked';
    bar.innerHTML = `<span class="lock-ico">🔒</span><b>${viewWeek} is final.</b>
      Ballots closed ${fmtDeadline(ts)}, when the next week's games kicked off.`;
  } else {
    bar.className = 'lock-bar';
    bar.innerHTML = `<span class="lock-ico">✏️</span>Your <b>${viewWeek}</b> ballot is
      open until <b>${fmtDeadline(ts)}</b> — it locks when the next week's games start.`;
  }
}

function renderEditor() {
  const ranking = myBallotOnScreen();
  const locked = isWeekLocked();

  document.body.classList.toggle('week-locked', locked);
  renderWeekLockBar();

  // One innerHTML write per list instead of ~150 appendChild calls — this is
  // what stops the pool from stuttering in as helmets are added one by one.
  rankingList.innerHTML = locked
    ? ranking.map((id, i) => lockedRowHTML(TEAM_MAP[id], i)).join('')
    : ranking.map((id) => rankedRowHTML(TEAM_MAP[id])).join('');

  // Nothing can be added to a closed week, so the pool would only be a tease.
  $('.pool-panel').classList.toggle('hidden', locked);
  $('.legend').classList.toggle('hidden', locked);
  if (!locked) {
    const rankedSet = new Set(ranking);
    const rest = TEAMS.filter((t) => !rankedSet.has(t.id)).sort((a, b) =>
      a.school.localeCompare(b.school)
    );
    teamPool.innerHTML = rest.map(teamCardHTML).join('');
    applyPoolFilters();
  }

  if (sortables) for (const s of sortables) s.option('disabled', locked);

  lastSavedJSON = JSON.stringify(ranking);
  updateEditorMeta();
}

/* ============ pool filters ============ */

function applyPoolFilters() {
  const q = $('#poolSearch').value.trim().toLowerCase();
  let visible = 0;
  for (const card of teamPool.children) {
    const team = TEAM_MAP[card.dataset.id];
    const matchesConf = activeConf === 'All' || team.conf === activeConf;
    const matchesText =
      !q ||
      team.school.toLowerCase().includes(q) ||
      team.mascot.toLowerCase().includes(q);
    card.classList.toggle('filtered', !(matchesConf && matchesText));
    if (matchesConf && matchesText) visible++;
  }
  $('#poolCount').textContent = `· ${visible} teams`;
}

function renderConfChips() {
  const wrap = $('#confChips');
  wrap.innerHTML = '';
  for (const conf of CONFS) {
    const b = document.createElement('button');
    b.className = 'conf-chip' + (conf === activeConf ? ' active' : '');
    b.textContent = conf;
    b.addEventListener('click', () => {
      activeConf = conf;
      renderConfChips();
      applyPoolFilters();
    });
    wrap.appendChild(b);
  }
}

/* ============ drag & drop ============ */

let sortables = null;

function initSortables() {
  const shared = {
    group: 'teams',
    animation: 180,
    easing: 'cubic-bezier(0.25, 1, 0.4, 1)',
    ghostClass: 'drag-ghost',
    chosenClass: 'drag-chosen',
    dragClass: 'drag-item',
    fallbackOnBody: true,
    delay: 120,
    delayOnTouchOnly: true,
    touchStartThreshold: 5,
    swapThreshold: 0.7,
    onStart() { document.body.classList.add('is-dragging'); },
    onEnd() {
      document.body.classList.remove('is-dragging');
      lastDragEnd = Date.now();
    },
  };

  const rankSortable = Sortable.create(rankingList, {
    ...shared,
    onMove(evt) {
      // Cap the ballot at 25 when dragging in from the pool.
      if (
        evt.to === rankingList &&
        evt.from !== rankingList &&
        rankingList.children.length >= 25
      ) {
        showToast('Your ballot is full — remove a team first (max 25)');
        return false;
      }
      return true;
    },
    onAdd(evt) { morphToRanked(evt.item); afterEditorChange(); },
    onUpdate() { afterEditorChange(); },
    onRemove() { afterEditorChange(); },
  });

  const poolSortable = Sortable.create(teamPool, {
    ...shared,
    sort: false, // pool stays alphabetical
    onAdd(evt) {
      const card = morphToCard(evt.item);
      insertCardAlphabetically(card);
      afterEditorChange();
    },
  });

  sortables = [rankSortable, poolSortable];
  for (const s of sortables) s.option('disabled', isWeekLocked());
}

function afterEditorChange() {
  updateEditorMeta();
  scheduleSave();
  renderPoll();
  renderNationalPoll();
  renderPlayoff();
  renderBallotsGrid();
}

/* ============ TNT poll ============ */

function computePoll(ballots) {
  const agg = {}; // id -> { pts, firsts, rankSum, votes }
  let voters = 0;
  for (const ranking of Object.values(ballots)) {
    if (!ranking.length) continue;
    voters++;
    ranking.forEach((id, i) => {
      if (!TEAM_MAP[id]) return;
      const a = (agg[id] = agg[id] || { pts: 0, firsts: 0, rankSum: 0, votes: 0 });
      a.pts += 25 - i;
      if (i === 0) a.firsts++;
      a.rankSum += i + 1;
      a.votes++;
    });
  }
  const rows = Object.entries(agg)
    .map(([id, a]) => ({ id, ...a, avg: a.rankSum / a.votes }))
    .sort(
      (x, y) =>
        y.pts - x.pts ||
        y.firsts - x.firsts ||
        x.avg - y.avg ||
        TEAM_MAP[x.id].school.localeCompare(TEAM_MAP[y.id].school)
    );
  return { rows, voters };
}

function renderPoll() {
  const ballots = weekBallots();
  const { rows, voters } = computePoll(ballots);

  $('#pollWeekLabel').textContent = `· ${viewWeek}`;
  $('#pollMeta').textContent = voters
    ? `${voters} ballot${voters === 1 ? '' : 's'} counted · #1 = 25 pts`
    : '';

  const votersWrap = $('#pollVoters');
  votersWrap.innerHTML = '';
  for (const [user, ranking] of Object.entries(ballots).sort()) {
    if (!ranking.length) continue;
    const chip = document.createElement('span');
    chip.className = 'voter-chip' + (ranking.length < 25 ? ' partial' : '');
    chip.textContent =
      ranking.length < 25 ? `${user} (${ranking.length}/25)` : user;
    votersWrap.appendChild(chip);
  }

  const list = $('#pollList');
  list.innerHTML = '';
  if (!rows.length) {
    list.innerHTML = `<div class="poll-empty">No ballots for ${viewWeek} yet.<br>Be the first — head to <b>My Ballot</b> and start dragging helmets! 🧨</div>`;
    $('#alsoReceiving').innerHTML = '';
    return;
  }

  rows.slice(0, 25).forEach((row) => {
    const t = TEAM_MAP[row.id];
    const li = document.createElement('li');
    li.className = 'poll-row';
    li.innerHTML = `
      <span class="rank"></span>
      ${helmetSVG(t, 52)}
      <div class="poll-info">
        <div class="school">${t.school}${
          row.firsts ? `<span class="firsts">(${row.firsts})</span>` : ''
        }</div>
        <div class="mascot">${t.mascot}</div>
      </div>
      <div class="points">
        <span class="pts">${row.pts} pts</span>
        <span class="avg">avg ${row.avg.toFixed(1)}</span>
      </div>`;
    li.querySelector('.rank').textContent = list.children.length + 1;
    list.appendChild(li);
  });

  const others = rows.slice(25);
  $('#alsoReceiving').innerHTML = others.length
    ? `<b>Also receiving votes:</b> ${others
        .map((r) => `${TEAM_MAP[r.id].school} ${r.pts}`)
        .join(', ')}`
    : '';
}

/* ============ national polls (AP + Coaches) ============ */

let activeNatPoll = localStorage.getItem('tnt-natpoll') || 'coaches';
if (!NATIONAL_POLLS[activeNatPoll]) activeNatPoll = NATIONAL_POLL_ORDER[0];

// Where each team sits in our own poll for this week, so the national poll
// can show how far off the TNT ballot is on every team.
function tntRankMap() {
  const m = new Map();
  computePoll(weekBallots()).rows.forEach((r, i) => {
    if (i < 25) m.set(r.id, i + 1);
  });
  return m;
}

function natDeltaHTML(id, natRank, tnt) {
  if (!tnt.size) return '';
  const ours = tnt.get(id);
  if (!ours) return '<span class="nat-tnt none">TNT&nbsp;—</span>';
  const diff = natRank - ours; // positive: we're higher on them
  const dir = diff > 0 ? 'up' : diff < 0 ? 'down' : 'same';
  const arrow = diff > 0 ? `▲${diff}` : diff < 0 ? `▼${-diff}` : '=';
  return `<span class="nat-tnt ${dir}">TNT&nbsp;#${ours} <b>${arrow}</b></span>`;
}

function renderPollSwitch() {
  const wrap = $('#pollSwitch');
  wrap.innerHTML = '';
  for (const id of NATIONAL_POLL_ORDER) {
    const poll = NATIONAL_POLLS[id];
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'poll-switch-btn' + (id === activeNatPoll ? ' active' : '');
    btn.dataset.poll = id;
    btn.textContent = poll.name;
    wrap.appendChild(btn);
  }
}

function renderNationalPoll() {
  const poll = NATIONAL_POLLS[activeNatPoll];
  const data = poll.weeks[viewWeek];
  const list = $('#natList');

  renderPollSwitch();
  $('#natWeekLabel').textContent = `· ${viewWeek}`;
  $('#natBlurb').textContent = poll.blurb;
  $('#natMeta').textContent = data
    ? [data.released && `released ${data.released}`, data.voters && `${data.voters} voters`]
        .filter(Boolean)
        .join(' · ')
    : '';

  list.innerHTML = '';
  $('#natOthers').innerHTML = '';

  if (!data) {
    list.innerHTML = `<div class="poll-empty">The <b>${poll.full}</b> hasn't been released for ${viewWeek} yet.${
      poll.pending ? `<br>${poll.pending}` : ''
    }</div>`;
    return;
  }

  const tnt = tntRankMap();
  data.teams.forEach(([id, pts, firsts], i) => {
    const t = TEAM_MAP[id];
    if (!t) return;
    const li = document.createElement('li');
    li.className = 'poll-row';
    li.innerHTML = `
      <span class="rank">${i + 1}</span>
      ${helmetSVG(t, 52)}
      <div class="poll-info">
        <div class="school">${t.school}${firsts ? `<span class="firsts">(${firsts})</span>` : ''}</div>
        <div class="mascot">${t.mascot}</div>
      </div>
      <div class="points">
        <span class="pts">${pts.toLocaleString()}</span>
        ${natDeltaHTML(id, i + 1, tnt)}
      </div>`;
    list.appendChild(li);
  });

  const others = data.others || [];
  $('#natOthers').innerHTML = others.length
    ? `<b>Others receiving votes:</b> ${others
        .map(([id, pts]) => `${(TEAM_MAP[id] || { school: id }).school} ${pts}`)
        .join(', ')}`
    : '';
}

$('#pollSwitch').addEventListener('click', (e) => {
  const btn = e.target.closest('.poll-switch-btn');
  if (!btn) return;
  activeNatPoll = btn.dataset.poll;
  localStorage.setItem('tnt-natpoll', activeNatPoll);
  renderNationalPoll();
});

/* ============ playoff bracket ============ */

// Build the 12-team field under the 2026 CFP rules:
//   - 4 automatic bids to the Power 4 champions (ACC, Big 12, Big Ten, SEC),
//     guaranteed regardless of ranking.
//   - 1 automatic bid to the single highest-ranked Group of Six team
//     (American, C-USA, MAC, Mountain West, Pac-12, Sun Belt) — it need not be
//     a conference champion.
//   - the rest are at-large bids to the next highest-ranked teams (Notre Dame
//     qualifies here if it lands in the top 12).
//   - everyone is seeded straight by TNT rank.
// We have no game results, so a Power 4 conference's "champion" is proxied by
// its highest-ranked team.
const POWER4 = ['ACC', 'Big 12', 'Big Ten', 'SEC'];
const GROUP6 = new Set(['American', 'C-USA', 'MAC', 'MW', 'Pac-12', 'Sun Belt']);

function computePlayoffField(rows) {
  const ranked = rows.map((r, i) => ({
    team: TEAM_MAP[r.id],
    rank: i + 1,
    conf: TEAM_MAP[r.id].conf,
  }));

  const auto = [];
  const autoIds = new Set();
  const addAuto = (e, title) => {
    if (!e || autoIds.has(e.team.id)) return;
    e.champOf = e.conf;
    e.autoTitle = title;
    auto.push(e);
    autoIds.add(e.team.id);
  };

  // Highest-ranked team in each Power 4 conference = that conference's champion.
  const champByConf = {};
  for (const e of ranked) {
    if (!champByConf[e.conf]) champByConf[e.conf] = e; // first seen = best rank
  }
  POWER4.map((c) => champByConf[c])
    .filter(Boolean)
    .sort((a, b) => a.rank - b.rank)
    .forEach((e) => addAuto(e, `${e.conf} champion — automatic bid`));

  // The single highest-ranked Group of Six team (ranked is already sorted).
  const bestG6 = ranked.find((e) => GROUP6.has(e.conf));
  if (bestG6) addAuto(bestG6, 'Highest-ranked Group of Six team — automatic bid');

  // At-large bids fill the rest with the next highest-ranked teams.
  const atLarge = ranked
    .filter((e) => !autoIds.has(e.team.id))
    .slice(0, 12 - auto.length);

  // Straight seeding: the whole 12-team field ordered by TNT rank.
  return [...auto, ...atLarge].sort((a, b) => a.rank - b.rank);
}

const CONF_LABEL = { 'Big Ten': 'B1G', 'Big 12': 'Big 12', 'Sun Belt': 'SBC' };
const confBadge = (c) => CONF_LABEL[c] || c;

function renderPlayoff() {
  const bracket = $('#bracket');
  const { rows, voters } = computePoll(weekBallots());

  $('#playoffWeekLabel').textContent = `· ${viewWeek}`;
  $('#playoffMeta').textContent = voters
    ? `Seeded from ${voters} ballot${voters === 1 ? '' : 's'}`
    : '';

  if (rows.length < 12) {
    bracket.innerHTML = `<div class="poll-empty">Need a TNT top 12 to build the bracket.<br>Only ${rows.length} team${
      rows.length === 1 ? '' : 's'
    } ${rows.length === 1 ? 'has' : 'have'} received votes for ${viewWeek} so far — get more ballots in! 🏈</div>`;
    return;
  }

  const field = computePlayoffField(rows); // 12 entries, index 0 = 1 seed

  const slot = (seed, opts = {}) => {
    if (!seed || !seed.team) {
      return `<div class="slot tbd"><span class="seed"></span><span class="pending">${
        opts.label || 'TBD'
      }</span></div>`;
    }
    const t = seed.team;
    const champ = seed.champOf
      ? `<span class="champ-badge" title="${seed.autoTitle}">🏆 ${confBadge(
          seed.champOf
        )}</span>`
      : '';
    const bye = opts.bye ? '<span class="bye-chip">BYE</span>' : '';
    return `<div class="slot">
      <span class="seed">${seed.n}</span>
      ${helmetSVG(t, 34)}
      <div class="slot-name"><b>${t.school}</b><span>${t.mascot}</span></div>
      <div class="slot-tags">${champ}${bye}</div>
    </div>`;
  };

  const seeded = (n) => ({ n, ...field[n - 1] });

  const matchup = (label, a, b, cls = '') =>
    `<div class="matchup ${cls}">
      <div class="matchup-label">${label}</div>
      ${a}${b}
    </div>`;

  // Round 1 (5v12, 8v9, 6v11, 7v10) ordered so the bracket flows into the byes.
  const r1 = [
    matchup('First Round', slot(seeded(5)), slot(seeded(12))),
    matchup('First Round', slot(seeded(8)), slot(seeded(9))),
    matchup('First Round', slot(seeded(6)), slot(seeded(11))),
    matchup('First Round', slot(seeded(7)), slot(seeded(10))),
  ];

  // Quarterfinals: top four seeds host the R1 winners.
  const qf = [
    matchup('Quarterfinal', slot(seeded(1), { bye: true }), slot(null, { label: 'Winner 5/12' })),
    matchup('Quarterfinal', slot(seeded(4), { bye: true }), slot(null, { label: 'Winner 8/9' })),
    matchup('Quarterfinal', slot(seeded(3), { bye: true }), slot(null, { label: 'Winner 6/11' })),
    matchup('Quarterfinal', slot(seeded(2), { bye: true }), slot(null, { label: 'Winner 7/10' })),
  ];

  const sf = [
    matchup('Semifinal', slot(null, { label: 'Winner QF 1' }), slot(null, { label: 'Winner QF 2' })),
    matchup('Semifinal', slot(null, { label: 'Winner QF 3' }), slot(null, { label: 'Winner QF 4' })),
  ];

  const final = matchup(
    'National Championship',
    slot(null, { label: 'Winner SF 1' }),
    slot(null, { label: 'Winner SF 2' }),
    'champ'
  );

  bracket.innerHTML = `
    <div class="round"><div class="round-title">First Round</div>${r1.join('')}</div>
    <div class="round"><div class="round-title">Quarterfinals</div>${qf.join('')}</div>
    <div class="round"><div class="round-title">Semifinals</div>${sf.join('')}</div>
    <div class="round"><div class="round-title">Title Game</div>
      <div class="champ-trophy">🏆</div>${final}
    </div>`;
}

/* ============ everyone's ballots ============ */

function renderBallotsGrid() {
  const grid = $('#ballotsGrid');
  grid.innerHTML = '';
  const ballots = weekBallots();
  const users = Object.keys(ballots)
    .filter((u) => ballots[u].length)
    .sort((a, b) => (a === me ? -1 : b === me ? 1 : a.localeCompare(b)));

  if (!users.length) {
    grid.innerHTML = `<div class="poll-empty">Nobody has submitted a ballot for ${viewWeek} yet.</div>`;
    return;
  }

  for (const user of users) {
    const card = document.createElement('div');
    card.className = 'ballot-card' + (user === me ? ' mine' : '');
    const items = ballots[user]
      .map((id, i) => {
        const t = TEAM_MAP[id];
        if (!t) return '';
        return `<li><span class="n">${i + 1}.</span>${helmetSVG(
          t,
          26
        )}<span class="nm">${t.school}</span></li>`;
      })
      .join('');
    card.innerHTML = `
      <h3>${esc(user)}${user === me ? ' (you)' : ''}
        <span class="count">${ballots[user].length}/25</span></h3>
      <ol>${items}</ol>`;
    grid.appendChild(card);
  }
}

/* ============ predictions ============ */

// Conferences that stage a title game, and the 12-team bracket wiring. Each
// game's two feeders are either a seed (index = seed - 1) or the winner of an
// earlier game, keyed by name.
const TITLE_CONFS = ['SEC', 'Big Ten', 'Big 12', 'ACC', 'American', 'C-USA', 'MAC', 'MW', 'Pac-12', 'Sun Belt'];
const PRED_GAMES = {
  r1_0: [{ seed: 4 }, { seed: 11 }],
  r1_1: [{ seed: 7 }, { seed: 8 }],
  r1_2: [{ seed: 5 }, { seed: 10 }],
  r1_3: [{ seed: 6 }, { seed: 9 }],
  qf_0: [{ seed: 0 }, { win: 'r1_0' }],
  qf_1: [{ seed: 3 }, { win: 'r1_1' }],
  qf_2: [{ seed: 2 }, { win: 'r1_2' }],
  qf_3: [{ seed: 1 }, { win: 'r1_3' }],
  sf_0: [{ win: 'qf_0' }, { win: 'qf_1' }],
  sf_1: [{ win: 'qf_2' }, { win: 'qf_3' }],
  final: [{ win: 'sf_0' }, { win: 'sf_1' }],
};
const PRED_GAME_ORDER = ['r1_0', 'r1_1', 'r1_2', 'r1_3', 'qf_0', 'qf_1', 'qf_2', 'qf_3', 'sf_0', 'sf_1', 'final'];
const GAME_LABEL = {
  r1_0: '5 vs 12', r1_1: '8 vs 9', r1_2: '6 vs 11', r1_3: '7 vs 10',
  qf_0: 'Quarterfinal', qf_1: 'Quarterfinal', qf_2: 'Quarterfinal', qf_3: 'Quarterfinal',
  sf_0: 'Semifinal', sf_1: 'Semifinal', final: 'National Championship',
};

let myPrediction = emptyPrediction();
let predLocked = false;
let predLockTs = null;
let serverOffset = 0; // add to Date.now() to approximate server time
let allPredictions = null; // populated once locked
let predSubmitted = []; // names of who's locked in (never their contents)
let lastSavedPredJSON = null;
// True from the moment you touch a pick until the server confirms it back.
// While it's set, nothing arriving from the server may overwrite what you're
// in the middle of doing.
let predDirty = false;
let lockTicker = null;

const PRED_SUBTABS = [
  { id: 'titles', label: '🏈 Conference Titles' },
  { id: 'playoff', label: '🏆 Playoff' },
  { id: 'heisman', label: '🥇 Heisman' },
];
let predSubTab = localStorage.getItem('tnt-predtab') || 'titles';
if (!PRED_SUBTABS.some((t) => t.id === predSubTab)) predSubTab = 'titles';

function emptyPrediction() {
  return { confChamps: {}, playoff: { seeds: new Array(12).fill(null), winners: {} }, heisman: null };
}

function normalizePrediction(p) {
  const out = emptyPrediction();
  if (!p || typeof p !== 'object') return out;
  out.heisman = p.heisman || null;
  if (p.confChamps && typeof p.confChamps === 'object') {
    for (const conf of TITLE_CONFS) {
      const c = p.confChamps[conf];
      if (c && typeof c === 'object') out.confChamps[conf] = { a: c.a || null, b: c.b || null, winner: c.winner || null };
    }
  }
  if (p.playoff && Array.isArray(p.playoff.seeds)) {
    for (let i = 0; i < 12; i++) out.playoff.seeds[i] = p.playoff.seeds[i] || null;
  }
  if (p.playoff && p.playoff.winners && typeof p.playoff.winners === 'object') {
    out.playoff.winners = { ...p.playoff.winners };
  }
  return out;
}

// Walk the bracket in dependency order: fill each game's two participants, and
// drop any advanced winner that's no longer one of its game's participants
// (so changing an early pick cleanly clears everything downstream of it).
function resolveBracket(seeds, winners) {
  const w = { ...winners };
  const part = {};
  for (const key of PRED_GAME_ORDER) {
    const [f1, f2] = PRED_GAMES[key];
    const side = (f) => {
      if (f.seed !== undefined) return seeds[f.seed] || null;
      const pair = part[f.win];
      const won = w[f.win];
      return won && pair && (pair[0] === won || pair[1] === won) ? won : null;
    };
    const a = side(f1);
    const b = side(f2);
    part[key] = [a, b];
    if (w[key] && w[key] !== a && w[key] !== b) delete w[key];
  }
  const fp = part.final;
  const champ = w.final && fp && (fp[0] === w.final || fp[1] === w.final) ? w.final : null;
  return { part, winners: w, champ };
}

let savePredTimer = null;
function schedulePredSave() {
  if (predLocked || !me) return;
  predDirty = true;
  $('#predSave').textContent = 'Saving…';
  $('#predSave').classList.add('saving');
  clearTimeout(savePredTimer);
  savePredTimer = setTimeout(() => {
    // Normalized, so it compares like-for-like against the server's echo.
    lastSavedPredJSON = JSON.stringify(normalizePrediction(myPrediction));
    socket.emit('savePrediction', { user: me, prediction: myPrediction });
  }, 400);
}

/* ---- lock bar / countdown ---- */

function serverNow() {
  return Date.now() + serverOffset;
}

function renderLockBar() {
  const bar = $('#predLockBar');
  if (!predLockTs) { bar.innerHTML = ''; return; }
  if (predLocked || serverNow() >= predLockTs) {
    bar.className = 'lock-bar locked';
    bar.innerHTML = `<span class="lock-ico">🔓</span> Predictions are <b>locked</b> — everyone's picks are revealed below.`;
    return;
  }
  const ms = predLockTs - serverNow();
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const parts = [];
  if (d) parts.push(`${d}d`);
  parts.push(`${h}h`, `${m}m`, `${sec}s`);
  const who = predSubmitted.length
    ? ` · <span class="lock-who">Locked in: ${predSubmitted.map((u) => esc(u) + (u === me ? ' (you)' : '')).join(', ')}</span>`
    : '';
  bar.className = 'lock-bar';
  bar.innerHTML = `<span class="lock-ico">🔒</span> Picks are private & editable until kickoff — they lock in <b class="lock-clock">${parts.join(' ')}</b> (Aug 29).${who}`;
}

function startLockTicker() {
  clearInterval(lockTicker);
  if (predLocked || !predLockTs) return;
  lockTicker = setInterval(() => {
    if (serverNow() >= predLockTs && !predLocked) {
      // Reached kickoff — pull the now-public picks from the server.
      clearInterval(lockTicker);
      if (me) socket.emit('identify', { user: me });
    }
    renderLockBar();
  }, 1000);
}

/* ---- editor ---- */

function confTeams(conf) {
  return TEAMS.filter((t) => t.conf === conf).sort((a, b) => a.school.localeCompare(b.school));
}

function ccSelect(conf, slot, chosen, other) {
  const opts = ['<option value="">— pick team —</option>']
    .concat(
      confTeams(conf).map((t) => {
        const dis = t.id === other ? ' disabled' : '';
        const sel = t.id === chosen ? ' selected' : '';
        return `<option value="${t.id}"${sel}${dis}>${t.school}</option>`;
      })
    )
    .join('');
  return `<select class="cc-team" data-conf="${conf}" data-slot="${slot}">${opts}</select>`;
}

function ccWinnerBtn(conf, team, isWinner) {
  return `<button class="cc-win-btn${isWinner ? ' picked' : ''}" data-conf="${conf}" data-team="${team.id}">
    ${helmetSVG(team, 30)}<span>${team.school}</span>${isWinner ? '<span class="win-tag">🏆</span>' : ''}
  </button>`;
}

function renderConfChampEditor() {
  return `<div class="predict-section">
    <h3 class="predict-h">🏟️ Conference Championships</h3>
    <p class="predict-sub">Pick the two teams you think meet in each title game, then tap the one you think wins.</p>
    <div class="cc-grid">
      ${TITLE_CONFS.map((conf) => {
        const c = myPrediction.confChamps[conf] || {};
        let winnerRow = '<div class="cc-winner empty">Pick both teams to choose a winner</div>';
        if (c.a && c.b) {
          winnerRow = `<div class="cc-winner">
            ${ccWinnerBtn(conf, TEAM_MAP[c.a], c.winner === c.a)}
            ${ccWinnerBtn(conf, TEAM_MAP[c.b], c.winner === c.b)}
          </div>`;
        }
        return `<div class="cc-card">
          <div class="cc-conf">${conf}</div>
          <div class="cc-picks">
            ${ccSelect(conf, 'a', c.a, c.b)}
            <span class="cc-vs">vs</span>
            ${ccSelect(conf, 'b', c.b, c.a)}
          </div>
          ${winnerRow}
        </div>`;
      }).join('')}
    </div>
  </div>`;
}

function seedSelect(i) {
  const chosen = myPrediction.playoff.seeds[i];
  const used = new Set(myPrediction.playoff.seeds.filter((id, j) => id && j !== i));
  const groups = CONFS.filter((c) => c !== 'All')
    .map((conf) => {
      const opts = confTeams(conf)
        .map((t) => {
          const dis = used.has(t.id) ? ' disabled' : '';
          const sel = t.id === chosen ? ' selected' : '';
          return `<option value="${t.id}"${sel}${dis}>${t.school}</option>`;
        })
        .join('');
      return `<optgroup label="${conf}">${opts}</optgroup>`;
    })
    .join('');
  return `<select class="seed-team" data-seed="${i}"><option value="">— pick team —</option>${groups}</select>`;
}

function predSlot(id, opts = {}) {
  if (!id || !TEAM_MAP[id]) {
    return `<div class="slot tbd"><span class="seed">${opts.seed || ''}</span><span class="pending">${opts.label || 'TBD'}</span></div>`;
  }
  const t = TEAM_MAP[id];
  const cls = 'slot' + (opts.pickable ? ' pickable' : '') + (opts.picked ? ' picked' : '');
  const data = opts.pickable ? ` data-game="${opts.game}" data-team="${id}"` : '';
  return `<div class="${cls}"${data}>
    <span class="seed">${opts.seed || ''}</span>
    ${helmetSVG(t, 30)}
    <div class="slot-name"><b>${t.school}</b><span>${t.mascot}</span></div>
    ${opts.bye ? '<div class="slot-tags"><span class="bye-chip">BYE</span></div>' : ''}
    ${opts.picked ? '<span class="advance-tag">▶</span>' : ''}
  </div>`;
}

function seedNoFor(id, seeds) {
  const idx = seeds.indexOf(id);
  return idx >= 0 ? idx + 1 : '';
}

function renderPredBracket(seeds, res, editable) {
  const { part, winners, champ } = res;
  const seedNo = (id) => seedNoFor(id, seeds);

  const gameHTML = (key, byePair) => {
    const [a, b] = part[key];
    const both = a && b;
    const label = key.startsWith('r1') ? 'First Round · ' + GAME_LABEL[key]
      : key.startsWith('qf') ? 'Quarterfinal'
      : key.startsWith('sf') ? 'Semifinal'
      : 'National Championship';
    const feederLabel = (f) => {
      if (f.seed !== undefined) return `Seed ${f.seed + 1}`;
      const g = f.win;
      return 'Winner ' + (g.startsWith('r1') ? GAME_LABEL[g] : g.startsWith('qf') ? 'QF' : 'SF');
    };
    const [f1, f2] = PRED_GAMES[key];
    const slotFor = (id, feeder) => predSlot(id, {
      seed: seedNo(id),
      label: feederLabel(feeder),
      pickable: editable && both,
      picked: winners[key] === id,
      game: key,
    });
    return `<div class="matchup ${key === 'final' ? 'champ' : ''}">
      <div class="matchup-label">${label}</div>
      ${slotFor(a, f1)}${slotFor(b, f2)}
    </div>`;
  };

  const byeSlot = (i) => predSlot(seeds[i], { seed: i + 1, bye: true, label: `Seed ${i + 1}` });

  return `
    <div class="round"><div class="round-title">Byes (1–4)</div>
      ${byeSlot(0)}${byeSlot(1)}${byeSlot(2)}${byeSlot(3)}
    </div>
    <div class="round"><div class="round-title">First Round</div>
      ${gameHTML('r1_0')}${gameHTML('r1_1')}${gameHTML('r1_2')}${gameHTML('r1_3')}
    </div>
    <div class="round"><div class="round-title">Quarterfinals</div>
      ${gameHTML('qf_0')}${gameHTML('qf_1')}${gameHTML('qf_2')}${gameHTML('qf_3')}
    </div>
    <div class="round"><div class="round-title">Semifinals</div>
      ${gameHTML('sf_0')}${gameHTML('sf_1')}
    </div>
    <div class="round"><div class="round-title">Title Game</div>
      <div class="champ-trophy">🏆</div>
      ${gameHTML('final')}
      <div class="champ-pick">${champ ? `${helmetSVG(TEAM_MAP[champ], 40)}<b>${TEAM_MAP[champ].school}</b><span>your champion</span>` : '<span class="pending">Pick your champion</span>'}</div>
    </div>`;
}

function renderPlayoffEditor() {
  const seeds = myPrediction.playoff.seeds;
  const filled = seeds.filter(Boolean).length;
  const res = resolveBracket(seeds, myPrediction.playoff.winners);
  myPrediction.playoff.winners = res.winners; // keep pruned winners in sync

  const seedRows = seeds
    .map((id, i) => `<div class="seed-row">
      <span class="seed-no${i < 4 ? ' bye' : ''}">${i + 1}${i < 4 ? '<em>bye</em>' : ''}</span>
      ${seedSelect(i)}
    </div>`)
    .join('');

  const bracket = filled === 12
    ? `<div class="bracket">${renderPredBracket(seeds, res, true)}</div>`
    : `<div class="poll-empty">Fill all 12 seeds to build your bracket — ${filled}/12 set.<br>Seeds 1–4 get a first-round bye. 🏈</div>`;

  return `<div class="predict-section">
    <h3 class="predict-h">🏆 Playoff Prediction</h3>
    <p class="predict-sub">Seed your 12-team field (1 is the top seed), then tap a team in each game to advance them to the title.</p>
    <div class="seed-grid">${seedRows}</div>
    ${bracket}
  </div>`;
}

/* ---------- Heisman ---------- */

function heismanRow(p, i, opts = {}) {
  const t = p.team && TEAM_MAP[p.team];
  const picked = myPrediction.heisman === p.id;
  return `<button type="button" class="heis-row${picked ? ' picked' : ''}" data-heisman="${p.id}"${
    opts.static ? ' disabled' : ''
  }>
    <span class="heis-no">${i + 1}</span>
    <span class="heis-helmet">${t ? helmetSVG(t, 38) : '<span class="heis-nohelmet">🏈</span>'}</span>
    <span class="heis-name">
      <b>${p.name}</b>
      <span>${[p.pos, t ? t.school : ''].filter(Boolean).join(' · ') || 'Team TBD'}</span>
    </span>
    <span class="heis-odds">${p.odds}</span>
    ${picked ? '<span class="heis-check">✓</span>' : ''}
  </button>`;
}

function renderHeismanEditor() {
  const pick = myPrediction.heisman && HEISMAN_MAP[myPrediction.heisman];
  const t = pick && pick.team && TEAM_MAP[pick.team];
  return `<section class="predict-section">
    <h3 class="predict-h">🥇 Heisman Trophy</h3>
    <p class="predict-sub">Pick who wins it. Odds are the preseason board, longest
      shots last — tap a name to pick, tap it again to clear.</p>
    <div class="heis-pick">${
      pick
        ? `${t ? helmetSVG(t, 40) : '<span class="heis-nohelmet big">🏈</span>'}
           <div><b>${pick.name}</b><span>your pick · ${pick.odds}</span></div>`
        : '<span class="rv-none">No pick yet</span>'
    }</div>
    <div class="heis-list">${HEISMAN_ODDS.map((p, i) => heismanRow(p, i)).join('')}</div>
  </section>`;
}

function renderPredSubTabs() {
  $('#predSubTabs').innerHTML = PRED_SUBTABS.map(
    (t) =>
      `<button type="button" class="sub-tab${t.id === predSubTab ? ' active' : ''}" data-subtab="${t.id}">${t.label}</button>`
  ).join('');
}

function renderPredEditor() {
  renderPredSubTabs();
  const panes = {
    titles: renderConfChampEditor,
    playoff: renderPlayoffEditor,
    heisman: renderHeismanEditor,
  };
  $('#predEditor').innerHTML = (panes[predSubTab] || panes.titles)();
}

$('#predSubTabs').addEventListener('click', (e) => {
  const btn = e.target.closest('.sub-tab');
  if (!btn) return;
  predSubTab = btn.dataset.subtab;
  localStorage.setItem('tnt-predtab', predSubTab);
  renderPredEditor();
});

/* ---- reveal (locked) ---- */

function revealCard(user, pred) {
  const p = normalizePrediction(pred);
  const ccItems = TITLE_CONFS.map((conf) => {
    const c = p.confChamps[conf] || {};
    const win = c.winner && TEAM_MAP[c.winner];
    const inner = win
      ? `${helmetSVG(win, 26)}<span class="rv-team">${win.school}</span>`
      : '<span class="rv-none">—</span>';
    return `<div class="rv-cc"><span class="rv-conf">${conf}</span>${inner}</div>`;
  }).join('');

  const seeds = p.playoff.seeds;
  const res = resolveBracket(seeds, p.playoff.winners);
  const champ = res.champ && TEAM_MAP[res.champ];
  const finalPair = res.part.final.map((id) => (id && TEAM_MAP[id] ? id : null));
  const finalists = finalPair
    .map((id) => (id ? `${helmetSVG(TEAM_MAP[id], 24)}<span>${TEAM_MAP[id].school}</span>` : ''))
    .filter(Boolean)
    .join('<span class="rv-vs">vs</span>');
  const field = seeds
    .map((id, i) => (id && TEAM_MAP[id] ? `<span class="rv-seed" title="${TEAM_MAP[id].school}"><b>${i + 1}</b>${helmetSVG(TEAM_MAP[id], 22)}</span>` : ''))
    .join('');

  const heis = p.heisman && HEISMAN_MAP[p.heisman];
  const heisTeam = heis && heis.team && TEAM_MAP[heis.team];

  return `<div class="reveal-card${user === me ? ' mine' : ''}">
    <h3>${esc(user)}${user === me ? ' (you)' : ''}</h3>
    <div class="rv-sec">
      <h4>Heisman</h4>
      <div class="rv-champ">${
        heis
          ? `${heisTeam ? helmetSVG(heisTeam, 34) : '<span class="heis-nohelmet">🏈</span>'}<b>${heis.name}</b><span class="rv-odds">${heis.odds}</span>`
          : '<span class="rv-none">No pick</span>'
      }</div>
    </div>
    <div class="rv-sec">
      <h4>Conference Champions</h4>
      <div class="rv-cc-grid">${ccItems}</div>
    </div>
    <div class="rv-sec">
      <h4>Playoff Champion</h4>
      <div class="rv-champ">${champ ? `${helmetSVG(champ, 44)}<b>${champ.school}</b>` : '<span class="rv-none">No pick</span>'}</div>
      ${finalists ? `<div class="rv-final"><span class="rv-label">Title game</span>${finalists}</div>` : ''}
      ${field ? `<div class="rv-field"><span class="rv-label">Field</span><div class="rv-field-row">${field}</div></div>` : ''}
    </div>
  </div>`;
}

function renderPredReveal() {
  const wrap = $('#predReveal');
  const users = Object.keys(allPredictions || {})
    .filter((u) => allPredictions[u])
    .sort((a, b) => (a === me ? -1 : b === me ? 1 : a.localeCompare(b)));
  if (!users.length) {
    wrap.innerHTML = '<div class="poll-empty">The picks are unlocked, but nobody submitted any preseason predictions.</div>';
    return;
  }
  wrap.innerHTML = `<div class="reveal-grid">${users.map((u) => revealCard(u, allPredictions[u])).join('')}</div>`;
}

/* ---- top-level ---- */

function renderPredictions() {
  renderLockBar();
  const loginEl = $('#predLogin');
  const editorEl = $('#predEditor');
  const revealEl = $('#predReveal');
  const saveEl = $('#predSave');

  const subTabsEl = $('#predSubTabs');

  if (predLocked) {
    loginEl.classList.add('hidden');
    editorEl.innerHTML = '';
    subTabsEl.innerHTML = '';
    saveEl.textContent = '';
    renderPredReveal();
    return;
  }

  revealEl.innerHTML = '';
  if (!me) {
    loginEl.classList.remove('hidden');
    editorEl.innerHTML = '';
    subTabsEl.innerHTML = '';
    saveEl.textContent = '';
    return;
  }
  loginEl.classList.add('hidden');
  renderPredEditor();
}

/* ---- editor events (delegated) ---- */

$('#predEditor').addEventListener('change', (e) => {
  const ccSel = e.target.closest('.cc-team');
  if (ccSel) {
    const conf = ccSel.dataset.conf;
    const slot = ccSel.dataset.slot;
    const c = (myPrediction.confChamps[conf] = myPrediction.confChamps[conf] || { a: null, b: null, winner: null });
    c[slot] = ccSel.value || null;
    if (c.winner && c.winner !== c.a && c.winner !== c.b) c.winner = null;
    if (!c.a && !c.b) delete myPrediction.confChamps[conf];
    schedulePredSave();
    renderPredEditor();
    return;
  }
  const seedSel = e.target.closest('.seed-team');
  if (seedSel) {
    const i = Number(seedSel.dataset.seed);
    const val = seedSel.value || null;
    // A team can hold only one seed — clear it from any other slot.
    if (val) {
      const prev = myPrediction.playoff.seeds.indexOf(val);
      if (prev >= 0 && prev !== i) myPrediction.playoff.seeds[prev] = null;
    }
    myPrediction.playoff.seeds[i] = val;
    schedulePredSave();
    renderPredEditor();
  }
});

$('#predEditor').addEventListener('click', (e) => {
  const ccBtn = e.target.closest('.cc-win-btn');
  if (ccBtn) {
    const conf = ccBtn.dataset.conf;
    const c = myPrediction.confChamps[conf];
    if (c) {
      c.winner = c.winner === ccBtn.dataset.team ? null : ccBtn.dataset.team;
      schedulePredSave();
      renderPredEditor();
    }
    return;
  }
  const heis = e.target.closest('.heis-row');
  if (heis) {
    myPrediction.heisman = myPrediction.heisman === heis.dataset.heisman ? null : heis.dataset.heisman;
    schedulePredSave();
    renderPredEditor();
    return;
  }
  const slot = e.target.closest('.slot.pickable');
  if (slot) {
    const game = slot.dataset.game;
    const team = slot.dataset.team;
    const w = myPrediction.playoff.winners;
    w[game] = w[game] === team ? undefined : team;
    if (w[game] === undefined) delete w[game];
    schedulePredSave();
    renderPredEditor();
  }
});

/* ============ weeks ============ */

function renderWeekSelect() {
  const sel = $('#weekSelect');
  sel.innerHTML = '';
  for (const w of WEEKS) {
    const opt = document.createElement('option');
    opt.value = w;
    opt.textContent = isWeekLocked(w) ? `${w} 🔒` : w;
    if (w === viewWeek) opt.selected = true;
    sel.appendChild(opt);
  }
}

// The latest week that already has ballots — where the group currently is.
// Falls back to the first week (Preseason) before anyone has ranked anything.
function latestActiveWeek() {
  for (let i = WEEKS.length - 1; i >= 0; i--) {
    const b = state.ballots[WEEKS[i]];
    if (b && Object.values(b).some((r) => r.length)) return WEEKS[i];
  }
  return WEEKS[0];
}

// The week to open on: whatever you were last looking at, otherwise the
// group's current (latest active) week. No button, no manual step.
function defaultWeek() {
  const saved = localStorage.getItem('tnt-week');
  return WEEKS.includes(saved) ? saved : latestActiveWeek();
}

function switchWeek(week) {
  viewWeek = week;
  localStorage.setItem('tnt-week', week);
  // A different week is a different ballot; nothing is pending for this one.
  ballotDirty = false;
  lastSavedJSON = null;
  renderWeekSelect();
  renderEditor();
  renderPoll();
  renderNationalPoll();
  renderPlayoff();
  renderBallotsGrid();
}

/* ============ login ============ */

function renderKnownUsers() {
  const wrap = $('#knownUsers');
  wrap.innerHTML = '';
  for (const u of allKnownUsers().sort()) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = u;
    b.addEventListener('click', () => loginAs(u));
    wrap.appendChild(b);
  }
}

function loginAs(name) {
  me = name.trim();
  if (!me) return;
  localStorage.setItem('tnt-user', me);
  $('#userName').textContent = me;
  $('#loginOverlay').classList.add('hidden');
  lastSavedJSON = null;
  ballotDirty = false; // different person — nothing of theirs is pending
  lastSavedPredJSON = null;
  predDirty = false;
  myPrediction = emptyPrediction();
  socket.emit('identify', { user: me });
  renderEditor();
  renderPoll();
  renderNationalPoll();
  renderPlayoff();
  renderBallotsGrid();
  renderPredictions();
}

/* ============ socket ============ */

socket.on('init', ({ weeks, state: s, lockTs, now, weekLocks: wl }) => {
  if (wl && typeof wl === 'object') weekLocks = wl;
  const firstLoad = state === null;
  WEEKS = weeks;
  state = s;
  if (typeof lockTs === 'number') predLockTs = lockTs;
  if (typeof now === 'number') serverOffset = now - Date.now();
  if (firstLoad) {
    viewWeek = defaultWeek();
    renderConfChips();
    initSortables();
    if (me) {
      $('#userName').textContent = me;
    } else {
      renderKnownUsers();
      $('#loginOverlay').classList.remove('hidden');
    }
    switchWeek(viewWeek);
  } else {
    // Reconnect: refresh everything from server state.
    switchWeek(WEEKS.includes(viewWeek) ? viewWeek : defaultWeek());
  }
  if (me) socket.emit('identify', { user: me });
  startLockTicker();
  renderPredictions();
});

// Prediction data: either just mine (private) or everyone's (once locked).
socket.on('predictions', ({ locked, lockTs, mine, all, submittedUsers }) => {
  predLocked = !!locked;
  if (typeof lockTs === 'number') predLockTs = lockTs;
  if (Array.isArray(submittedUsers)) predSubmitted = submittedUsers;
  if (locked) {
    allPredictions = all || {};
  } else if (mine !== undefined) {
    const incoming = JSON.stringify(mine ? normalizePrediction(mine) : emptyPrediction());
    if (
      incoming === lastSavedPredJSON &&
      incoming === JSON.stringify(normalizePrediction(myPrediction))
    ) {
      // The server, my last save and my working copy all agree — nothing
      // pending. (Checking the working copy too matters: without it, an echo
      // of an earlier save would clear the flag while a newer edit was still
      // sitting in the debounce, and the next poll would undo it.)
      predDirty = false;
    } else if (!predDirty) {
      // Nothing pending locally, so adopt whatever the server has (a reload,
      // or me editing from my phone).
      myPrediction = mine ? normalizePrediction(mine) : emptyPrediction();
      lastSavedPredJSON = incoming;
    }
  }
  if (predLocked) clearInterval(lockTicker);
  else startLockTicker();
  renderPredictions();
});

// A light nudge that the roster of who's-locked-in changed (no contents).
socket.on('predStatus', ({ locked, submittedUsers }) => {
  if (locked && !predLocked && me) { socket.emit('identify', { user: me }); return; }
  if (Array.isArray(submittedUsers)) predSubmitted = submittedUsers;
  renderLockBar();
});

// The transport tells us whether a save actually reached the server, so the
// status line can stop guessing.
socket.on('saveResult', ({ what, ok, reason }) => {
  const el = what === 'prediction' ? $('#predSave') : $('#saveStatus');
  if (!el) return;
  el.classList.remove('saving');
  el.classList.toggle('failed', !ok);
  const shut = reason === 'week-locked' || reason === 'locked';
  el.textContent = ok ? 'Saved ✓' : shut ? 'Closed 🔒' : 'Not saved ✕';
  if (ok) return;

  if (reason === 'week-locked') {
    // The deadline passed while this tab was open. Repaint as final.
    showToast(`${viewWeek} closed — that ballot is final now.`, 6000);
    renderWeekSelect();
    renderEditor();
    return;
  }
  if (reason === 'locked') {
    // Kickoff arrived mid-edit; predictions are public now.
    showToast("Kickoff — predictions are locked and everyone's picks are in.", 6000);
    if (me) socket.emit('identify', { user: me });
    return;
  }
  if (reason === 'no-user') {
    showToast('Pick your name first (top right) — nothing was saved.', 6000);
    return;
  }
  showToast(
    what === 'prediction'
      ? "Couldn't save your predictions — check your connection."
      : "Couldn't save your ballot — check your connection. Don't close this tab.",
    6000
  );
});

socket.on('state', (s) => {
  state = s;
  renderPoll();
  renderNationalPoll();
  renderPlayoff();
  renderBallotsGrid();
  renderKnownUsers();
  const mine = JSON.stringify(myBallotOnScreen());
  const onScreen = JSON.stringify(editorRanking());
  if (mine === lastSavedJSON && mine === onScreen) {
    // The server, my last save and the screen all agree — nothing pending.
    ballotDirty = false;
  } else if (!ballotDirty && !editorBusy() && mine !== onScreen) {
    // Nothing of mine is in flight, so this is a real change from elsewhere
    // (I edited from my phone, say) and the editor should adopt it.
    renderEditor();
  }
});

/* ============ theme ============ */

function applyTheme(theme) {
  const light = theme === 'light';
  document.body.classList.toggle('light', light);
  $('#themeBtn').textContent = light ? '🌙' : '☀️';
  $('#themeBtn').title = light ? 'Switch to dark mode' : 'Switch to light mode';
  localStorage.setItem('tnt-theme', theme);
}

// Apply saved theme immediately so there's no flash of the wrong mode.
applyTheme(localStorage.getItem('tnt-theme') || 'dark');

$('#themeBtn').addEventListener('click', () => {
  applyTheme(document.body.classList.contains('light') ? 'dark' : 'light');
});

/* ============ UI events ============ */

document.querySelectorAll('.tab').forEach((tab) => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach((t) => t.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach((p) => p.classList.remove('active'));
    tab.classList.add('active');
    $(`#tab-${tab.dataset.tab}`).classList.add('active');
  });
});

$('#weekSelect').addEventListener('change', (e) => switchWeek(e.target.value));

$('#poolSearch').addEventListener('input', applyPoolFilters);

$('#loginForm').addEventListener('submit', (e) => {
  e.preventDefault();
  loginAs($('#loginName').value);
});

$('#switchUserBtn').addEventListener('click', () => {
  renderKnownUsers();
  $('#loginName').value = '';
  $('#loginOverlay').classList.remove('hidden');
});

// Move a ranked team back to the pool.
function removeRanked(li) {
  const card = makeTeamCard(TEAM_MAP[li.dataset.id]);
  li.remove();
  teamPool.appendChild(card);
  insertCardAlphabetically(card);
  applyPoolFilters();
  afterEditorChange();
}

// Handle the ✕ (remove) and ▲/▼ (reorder) buttons on ranked rows.
rankingList.addEventListener('click', (e) => {
  const li = e.target.closest('.ranked-item');
  if (!li || isWeekLocked()) return;

  if (e.target.closest('.remove-btn')) {
    removeRanked(li);
    return;
  }
  if (e.target.closest('.move-up')) {
    const prev = li.previousElementSibling;
    if (prev) {
      li.parentNode.insertBefore(li, prev);
      afterEditorChange();
    }
    return;
  }
  if (e.target.closest('.move-down')) {
    const next = li.nextElementSibling;
    if (next) {
      li.parentNode.insertBefore(next, li);
      afterEditorChange();
    }
  }
});

// Tap a pool helmet to add it to the next open spot. The guard ignores the
// click that browsers fire at the end of a drag so it never double-adds.
teamPool.addEventListener('click', (e) => {
  const card = e.target.closest('.team-card');
  if (!card || isWeekLocked()) return;
  if (Date.now() - lastDragEnd < 250) return;
  if (rankingList.children.length >= 25) {
    showToast('Your ballot is full — remove a team first (max 25)');
    return;
  }
  const team = TEAM_MAP[card.dataset.id];
  card.remove();
  rankingList.appendChild(makeRankedItem(team));
  applyPoolFilters();
  afterEditorChange();
});

$('#copyPrevBtn').addEventListener('click', () => {
  if (isWeekLocked()) return showToast(`${viewWeek} is final — its ballots are closed.`);
  const idx = WEEKS.indexOf(viewWeek);
  if (idx <= 0) return;
  const prev = WEEKS[idx - 1];
  const prevRanking = (state.ballots[prev] && state.ballots[prev][me]) || [];
  if (!prevRanking.length) {
    showToast(`You have no ballot for ${prev}`);
    return;
  }
  if (
    editorRanking().length &&
    !confirm(`Replace your ${viewWeek} ballot with your ${prev} ballot?`)
  )
    return;
  if (!state.ballots[viewWeek]) state.ballots[viewWeek] = {};
  state.ballots[viewWeek][me] = [...prevRanking];
  renderEditor();
  scheduleSave();
  showToast(`Copied your ${prev} ballot ✓`);
});

$('#clearBtn').addEventListener('click', () => {
  if (isWeekLocked()) return showToast(`${viewWeek} is final — its ballots are closed.`);
  if (!editorRanking().length) return;
  if (!confirm(`Clear your entire ${viewWeek} ballot?`)) return;
  if (state.ballots[viewWeek]) delete state.ballots[viewWeek][me];
  renderEditor();
  scheduleSave();
});

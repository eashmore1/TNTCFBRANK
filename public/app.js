/* TNT CFB Rankings - client */

const socket = io();

let WEEKS = [];
let state = null; // { currentWeek, ballots: { [week]: { [user]: [teamId] } } }
let me = localStorage.getItem('tnt-user') || null;
let viewWeek = null;
let activeConf = 'All';
let lastSavedJSON = null;

const $ = (sel) => document.querySelector(sel);
const rankingList = $('#rankingList');
const teamPool = $('#teamPool');

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

function allKnownUsers() {
  const users = new Set();
  for (const week of Object.keys(state.ballots)) {
    for (const u of Object.keys(state.ballots[week])) users.add(u);
  }
  return [...users];
}

function showToast(msg, ms = 2600) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.remove('hidden');
  clearTimeout(showToast._timer);
  showToast._timer = setTimeout(() => t.classList.add('hidden'), ms);
}

/* ============ saving ============ */

let saveTimer = null;
function scheduleSave() {
  $('#saveStatus').textContent = 'Saving…';
  $('#saveStatus').classList.add('saving');
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    const ranking = editorRanking();
    lastSavedJSON = JSON.stringify(ranking);
    socket.emit('saveBallot', { week: viewWeek, user: me, ranking });
    $('#saveStatus').textContent = 'Saved ✓';
    $('#saveStatus').classList.remove('saving');
  }, 350);
}

/* ============ ballot editor rendering ============ */

function rankedItemHTML(team) {
  return `
    ${helmetSVG(team, 46)}
    <div class="ranked-info">
      <div class="school">${team.school}</div>
      <div class="mascot">${team.mascot}</div>
    </div>
    <button class="remove-btn" title="Remove">✕</button>`;
}

function makeRankedItem(team) {
  const li = document.createElement('li');
  li.className = 'ranked-item';
  li.dataset.id = team.id;
  li.innerHTML = rankedItemHTML(team);
  return li;
}

function makeTeamCard(team) {
  const div = document.createElement('div');
  div.className = 'team-card';
  div.dataset.id = team.id;
  div.dataset.conf = team.conf;
  div.innerHTML = `
    ${helmetSVG(team, 66)}
    <div class="school">${team.school}</div>
    <div class="mascot">${team.mascot}</div>`;
  return div;
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
    n === 0 ? 'Drop your #1 team here 🏈' : '';
  $('#copyPrevBtn').classList.toggle('hidden', WEEKS.indexOf(viewWeek) === 0);
}

function renderEditor() {
  const ranking = myBallot();
  rankingList.innerHTML = '';
  teamPool.innerHTML = '';

  for (const id of ranking) {
    if (TEAM_MAP[id]) rankingList.appendChild(makeRankedItem(TEAM_MAP[id]));
  }
  const rankedSet = new Set(ranking);
  const rest = TEAMS.filter((t) => !rankedSet.has(t.id)).sort((a, b) =>
    a.school.localeCompare(b.school)
  );
  for (const t of rest) teamPool.appendChild(makeTeamCard(t));

  lastSavedJSON = JSON.stringify(ranking);
  applyPoolFilters();
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
    touchStartThreshold: 4,
  };

  Sortable.create(rankingList, {
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

  Sortable.create(teamPool, {
    ...shared,
    sort: false, // pool stays alphabetical
    onAdd(evt) {
      const card = morphToCard(evt.item);
      insertCardAlphabetically(card);
      afterEditorChange();
    },
  });
}

function afterEditorChange() {
  updateEditorMeta();
  scheduleSave();
  renderPoll();
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

/* ============ playoff bracket ============ */

// Build the 12-team field the way the real CFP does it: 5 automatic bids to
// the highest-ranked conference champions (guaranteeing a Group of Five team),
// 7 at-large bids, then everyone seeded straight by TNT rank. We have no game
// results, so a conference's "champion" is proxied by its highest-ranked team.
function computePlayoffField(rows) {
  const ranked = rows.map((r, i) => ({
    team: TEAM_MAP[r.id],
    rank: i + 1,
    conf: TEAM_MAP[r.id].conf,
  }));

  // Highest-ranked team in each conference = that conference's "champion."
  // Independents (Notre Dame, UConn) have no conference title, so no auto bid.
  const champByConf = {};
  for (const e of ranked) {
    if (e.conf === 'Ind') continue;
    if (!champByConf[e.conf]) champByConf[e.conf] = e; // first seen = best rank
  }
  const champions = Object.values(champByConf).sort((a, b) => a.rank - b.rank);

  // 5 automatic bids to the 5 highest-ranked conference champions.
  const auto = champions.slice(0, 5);
  auto.forEach((e) => (e.champOf = e.conf));
  const autoIds = new Set(auto.map((e) => e.team.id));

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
      ? `<span class="champ-badge" title="${seed.champOf} champion — automatic bid">🏆 ${confBadge(
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
      <h3>${user === me ? `${user} (you)` : user}
        <span class="count">${ballots[user].length}/25</span></h3>
      <ol>${items}</ol>`;
    grid.appendChild(card);
  }
}

/* ============ weeks ============ */

function renderWeekSelect() {
  const sel = $('#weekSelect');
  sel.innerHTML = '';
  for (const w of WEEKS) {
    const opt = document.createElement('option');
    opt.value = w;
    opt.textContent = w === state.currentWeek ? `${w} ★` : w;
    if (w === viewWeek) opt.selected = true;
    sel.appendChild(opt);
  }
  $('#setWeekBtn').classList.toggle('hidden', viewWeek === state.currentWeek);
}

function switchWeek(week) {
  viewWeek = week;
  renderWeekSelect();
  renderEditor();
  renderPoll();
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
  renderEditor();
  renderPoll();
  renderPlayoff();
  renderBallotsGrid();
}

/* ============ socket ============ */

socket.on('init', ({ weeks, state: s }) => {
  const firstLoad = state === null;
  WEEKS = weeks;
  state = s;
  if (firstLoad) {
    viewWeek = state.currentWeek;
    renderConfChips();
    initSortables();
    if (me) {
      $('#userName').textContent = me;
      switchWeek(viewWeek);
    } else {
      renderKnownUsers();
      $('#loginOverlay').classList.remove('hidden');
      switchWeek(viewWeek);
    }
  } else {
    // Reconnect: refresh everything from server state.
    switchWeek(WEEKS.includes(viewWeek) ? viewWeek : state.currentWeek);
  }
});

socket.on('state', (s) => {
  const prevCurrent = state.currentWeek;
  state = s;
  renderWeekSelect();
  renderPoll();
  renderPlayoff();
  renderBallotsGrid();
  renderKnownUsers();
  if (state.currentWeek !== prevCurrent) {
    showToast(`Group week is now ${state.currentWeek} ★`);
  }
  // Only rebuild my editor if my saved ballot changed somewhere else
  // (e.g. I edited from my phone) — never clobber an in-progress drag here.
  const mine = JSON.stringify(myBallot());
  if (mine !== lastSavedJSON && mine !== JSON.stringify(editorRanking())) {
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

$('#setWeekBtn').addEventListener('click', () => {
  socket.emit('setCurrentWeek', viewWeek);
});

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

// Remove a ranked team via its ✕ button.
rankingList.addEventListener('click', (e) => {
  const btn = e.target.closest('.remove-btn');
  if (!btn) return;
  const li = btn.closest('.ranked-item');
  const card = makeTeamCard(TEAM_MAP[li.dataset.id]);
  li.remove();
  teamPool.appendChild(card);
  insertCardAlphabetically(card);
  applyPoolFilters();
  afterEditorChange();
});

// Double-click a pool helmet to add it to the next open spot.
teamPool.addEventListener('dblclick', (e) => {
  const card = e.target.closest('.team-card');
  if (!card) return;
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
  if (!editorRanking().length) return;
  if (!confirm(`Clear your entire ${viewWeek} ballot?`)) return;
  if (state.ballots[viewWeek]) delete state.ballots[viewWeek][me];
  renderEditor();
  scheduleSave();
});

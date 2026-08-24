/* ==========================================================================
   ui.js — screens, map rendering, campaign interface, election night
   ========================================================================== */

const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
function el(tag, cls, html) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (html != null) n.innerHTML = html;
  return n;
}
const esc = (s) => String(s).replace(/[&<>"]/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' }[c]));
const pct = (v, d = 1) => (v * 100).toFixed(d) + '%';

/* hex helpers for the choropleth */
function hex2rgb(h) { const n = parseInt(h.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
function rgb2hex(r) { return '#' + r.map(v => Math.round(clamp(v, 0, 255)).toString(16).padStart(2, '0')).join(''); }
function mix(a, b, t) { const A = hex2rgb(a), B = hex2rgb(b); return rgb2hex(A.map((v, i) => v + (B[i] - v) * t)); }

const MAP_BG = '#232b37';
const VIEWBOX = '0 0 1050 610';

/* ==========================================================================
   UI STATE
   ========================================================================== */
const UI = {
  G: null,
  setup: {
    n: 2, rounds: 5, funding: 'flat', indiv: 1.4, seed: '',
    cands: []
  },
  humanQueue: [],      // setup: which human candidates still need bio/stances
  humanIdx: 0,
  turnIdx: 0,          // whose turn it is this round
  sel: { actionId: null, state: null, states: [], focusAge: null, focusGender: null,
         intensity: 1, mode: 'pro', targetIdx: null, topicIndex: 0, direction: 1, celeb: null, corp: null },
  mapMode: 'poll',
  currentPoll: null,
  mapBuilt: false,
  hoverLock: false,
  pendingAfterHandoff: null,
  inspect: null,        // state being examined in the sidebar
  skipFinal: false,
  finalTimer: null,
  finalStep: null
};

/* Whose point of view the crosstabs are written from: the player taking the
   current turn, or failing that the first human in the field. */
function viewerIdx() {
  const G = UI.G;
  if (!G) return 0;
  const c = G.candidates[UI.turnIdx];
  if (c && c.isHuman) return UI.turnIdx;
  const h = G.candidates.findIndex(x => x.isHuman);
  return h >= 0 ? h : 0;
}

/* ==========================================================================
   SCREEN PLUMBING
   ========================================================================== */
function show(id) {
  $$('.screen').forEach(s => s.classList.toggle('active', s.id === id));
  window.scrollTo(0, 0);
}
function openModal(html) { $('#modal-body').innerHTML = html; $('#modal').hidden = false; }
function closeModal() { $('#modal').hidden = true; $('#modal-body').innerHTML = ''; }
$('#modal-x').addEventListener('click', closeModal);
$('#modal').addEventListener('click', e => { if (e.target.id === 'modal') closeModal(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });
$$('[data-back]').forEach(b => b.addEventListener('click', () => show(b.dataset.back)));

/* ==========================================================================
   TITLE
   ========================================================================== */
$('#btn-start').addEventListener('click', () => { buildRaceScreen(); show('screen-race'); });
$('#btn-how').addEventListener('click', () => openModal(methodologyHTML(null)));

/* ==========================================================================
   SETUP — RACE
   ========================================================================== */
function buildRaceScreen() {
  const segN = $('#seg-ncand'); segN.innerHTML = '';
  for (let i = 2; i <= 6; i++) {
    const b = el('button', UI.setup.n === i ? 'on' : '', String(i));
    b.addEventListener('click', () => { UI.setup.n = i; buildRaceScreen(); });
    segN.appendChild(b);
  }
  const segR = $('#seg-rounds'); segR.innerHTML = '';
  for (const r of [3, 4, 5, 6, 8]) {
    const b = el('button', UI.setup.rounds === r ? 'on' : '', String(r));
    b.addEventListener('click', () => { UI.setup.rounds = r; buildRaceScreen(); });
    segR.appendChild(b);
  }
  $$('#opt-funding .opt').forEach(o => {
    o.classList.toggle('on', o.dataset.v === UI.setup.funding);
    o.onclick = () => { UI.setup.funding = o.dataset.v; buildRaceScreen(); };
  });
  $$('#opt-indiv .opt').forEach(o => {
    o.classList.toggle('on', Number(o.dataset.v) === UI.setup.indiv);
    o.onclick = () => { UI.setup.indiv = Number(o.dataset.v); buildRaceScreen(); };
  });
  $('#inp-seed').value = UI.setup.seed;
}
$('#btn-race-next').addEventListener('click', () => {
  UI.setup.seed = $('#inp-seed').value.trim();
  buildFieldScreen();
  show('screen-field');
});

/* ==========================================================================
   SETUP — FIELD
   ========================================================================== */
/* A plausible name for slot 1 so the write-ups read as prose rather than
   "You wins". Players overwrite it; the rest of the field is fixed so a seed
   always produces the same opponents. */
const OPPONENT_NAMES = ['Marcus Whitaker', 'Deborah Ferro', 'Ellis Castellan', 'Junia Okonjo', 'Tobias Brandt'];
const MY_NAME = (() => {
  const taken = OPPONENT_NAMES.join(' ');
  for (let i = 0; i < 40; i++) {
    const f = AI_FIRST[Math.floor(Math.random() * AI_FIRST.length)];
    const l = AI_LAST[Math.floor(Math.random() * AI_LAST.length)];
    if (!taken.includes(f) && !taken.includes(l)) return f + ' ' + l;
  }
  return 'Alex Reyner';
})();
const DEFAULT_NAMES = [MY_NAME].concat(OPPONENT_NAMES);

function buildFieldScreen() {
  const S = UI.setup;
  // grow / shrink the roster to match n
  while (S.cands.length < S.n) {
    const i = S.cands.length;
    S.cands.push({
      name: DEFAULT_NAMES[i] || ('Candidate ' + (i + 1)),
      party: PARTY_NAMES[i % PARTY_NAMES.length],
      color: CANDIDATE_COLORS[i % CANDIDATE_COLORS.length].hex,
      isHuman: i === 0, bio: '', stances: null, bioAnalysis: null
    });
  }
  S.cands.length = S.n;

  const list = $('#field-list'); list.innerHTML = '';
  S.cands.forEach((c, i) => {
    const row = el('div', 'cand-row');

    const sw = el('button', 'swatch');
    sw.style.background = c.color;
    sw.title = 'Change colour';
    sw.addEventListener('click', () => {
      const used = S.cands.map(x => x.color);
      const avail = CANDIDATE_COLORS.filter(cc => !used.includes(cc.hex) || cc.hex === c.color);
      const cur = avail.findIndex(cc => cc.hex === c.color);
      c.color = avail[(cur + 1) % avail.length].hex;
      buildFieldScreen();
    });
    row.appendChild(sw);

    const nm = el('input'); nm.type = 'text'; nm.value = c.name;
    nm.placeholder = c.isHuman ? 'Your name' : 'Name';
    nm.addEventListener('input', () => { c.name = nm.value; });
    row.appendChild(nm);

    const pt = el('input'); pt.type = 'text'; pt.value = c.party; pt.placeholder = 'Party';
    pt.addEventListener('input', () => { c.party = pt.value; });
    row.appendChild(pt);

    const tog = el('div', 'who-toggle');
    const bYou = el('button', c.isHuman ? 'on' : '', 'You');
    const bAI  = el('button', !c.isHuman ? 'on' : '', 'Computer');
    bYou.addEventListener('click', () => { c.isHuman = true; buildFieldScreen(); });
    bAI.addEventListener('click',  () => { c.isHuman = false; buildFieldScreen(); });
    tog.appendChild(bYou); tog.appendChild(bAI);
    row.appendChild(tog);

    if (!c.isHuman) {
      row.appendChild(el('div', 'persona-note',
        'The computer writes its own biography and platform.'));
    }
    list.appendChild(row);
  });
}

$('#btn-field-next').addEventListener('click', () => {
  const S = UI.setup;
  const humans = S.cands.map((c, i) => c.isHuman ? i : -1).filter(i => i >= 0);
  if (!humans.length) {
    if (!confirm('No human candidates. Watch the computers fight it out?')) return;
  }
  // build the world now so the topics exist for the stance screens
  UI.G = newGame({
    seed: S.seed || undefined,
    rounds: S.rounds,
    fundingMode: S.funding,
    indivSd: S.indiv,
    candidates: S.cands.map(c => ({ name: c.name || 'Unnamed', party: c.party || 'Independent',
                                    color: c.color, isHuman: c.isHuman, bio: '' }))
  });
  UI.humanQueue = humans;
  UI.humanIdx = 0;
  if (!humans.length) { startGame(); return; }
  nextHumanSetup();
});

/* Walk each human candidate through bio then platform. */
function nextHumanSetup() {
  if (UI.humanIdx >= UI.humanQueue.length) { finishSetup(); return; }
  const ci = UI.humanQueue[UI.humanIdx];
  const cand = UI.G.candidates[ci];
  if (UI.humanQueue.length > 1) {
    handoff(cand.name, 'Your biography and platform are next. Keep them to yourself.',
            () => openBioScreen(ci), cand.color);
  } else {
    openBioScreen(ci);
  }
}

function handoff(title, sub, then, color) {
  $('#handoff-title').textContent = title;
  $('#handoff-sub').textContent = sub;
  $('#handoff-dot').style.background = color || 'var(--line2)';
  UI.pendingAfterHandoff = then;
  show('screen-handoff');
}
$('#btn-handoff').addEventListener('click', () => {
  const f = UI.pendingAfterHandoff; UI.pendingAfterHandoff = null; if (f) f();
});

/* ==========================================================================
   SETUP — BIO
   ========================================================================== */
let bioCurrent = 0;
const EXAMPLE_BIOS = [
  'Two tours in Iraq with the Marine Corps, then twenty-two years running a hardware store in Dayton, Ohio. I have signed four hundred paychecks and I have laid off eleven people, and I remember every one of their names. Married thirty-one years. Three kids, one grandkid, one very old dog.',
  'I am twenty-nine. I organized fast-food workers in Phoenix, Arizona for six years and ran a mutual aid network through the pandemic. I have never held office and I am not going to pretend that is a weakness. The people who broke this country are still running it.',
  'Emergency room nurse for twelve years at a county hospital in Illinois, then a doctorate in public health. I have held two hundred people while they died because a form was filled out wrong. I am not running to be interesting. I am running to fix the form.',
  'I founded a software company in Seattle, Washington with two people and a credit card, sold it for $1.4 billion, and spent the next six years watching exactly what that money could buy in this country. It can buy almost anything. That is the problem.',
  'Third-generation farmer from Nebraska. My grandfather planted these acres in 1948 and my daughter will plant them in 2041 if anybody in Washington remembers we exist. Forty years in a union combine seat gives you opinions.'
];

function openBioScreen(ci) {
  bioCurrent = ci;
  const cand = UI.G.candidates[ci];
  $('#bio-who').textContent = `${cand.name} · ${cand.party}`;
  $('#inp-bio').value = cand.bio || '';
  $('#bio-report').innerHTML = '';
  $('#btn-bio-next').disabled = true;
  updateWordCount();
  show('screen-bio');
}
function updateWordCount() {
  const w = $('#inp-bio').value.trim().split(/\s+/).filter(Boolean).length;
  $('#bio-count').textContent = w + (w === 1 ? ' word' : ' words');
}
$('#inp-bio').addEventListener('input', () => { updateWordCount(); $('#btn-bio-next').disabled = true; });
$('#btn-bio-example').addEventListener('click', () => {
  $('#inp-bio').value = EXAMPLE_BIOS[Math.floor(Math.random() * EXAMPLE_BIOS.length)];
  updateWordCount(); $('#btn-bio-next').disabled = true;
});

$('#btn-bio-analyze').addEventListener('click', () => {
  const text = $('#inp-bio').value;
  const box = $('#bio-report');
  box.innerHTML = `<div class="report-box"><h4>Analyst</h4><p><span class="spinner"></span>Reading…</p></div>`;
  setTimeout(() => {
    const cand = UI.G.candidates[bioCurrent];
    cand.bio = text;
    const a = analyzeBio(text, UI.G.rng);
    cand.bioAnalysis = a;
    box.innerHTML = renderBioReport(a);
    $('#btn-bio-next').disabled = false;
  }, 420);
});

function renderBioReport(a) {
  const bar = (label, v, lo, hi, fmt) => {
    const t = clamp((v - lo) / (hi - lo), 0, 1);
    return `<div class="bio-bar"><span class="lbl">${label}</span>
      <span class="track"><span class="fill${v < 0 ? ' neg' : ''}" style="width:${(t * 100).toFixed(0)}%"></span></span>
      <span class="val">${fmt}</span></div>`;
  };
  let grid = `<div class="grid-affinity"><div class="hd"></div>` +
    GENDERS.map(g => `<div class="hd">${GENDER_LABEL[g]}</div>`).join('');
  for (const ag of AGES) {
    grid += `<div class="hd" style="text-align:left">${AGE_SHORT[ag]}</div>`;
    for (const g of GENDERS) {
      const v = a.seed[ag + '|' + g];
      const c = v > 0.02 ? mix('#2b3140', '#4ec98a', clamp(v / 0.7, 0, 1))
              : v < -0.02 ? mix('#2b3140', '#e2565c', clamp(-v / 0.7, 0, 1)) : '#2b3140';
      grid += `<div style="background:${c}">${v >= 0 ? '+' : ''}${v.toFixed(2)}</div>`;
    }
  }
  grid += `</div>`;

  return `<div class="report-box">
    <h4>Biography analysis</h4>
    <p class="disclaim">Offline analyst: a lexicon-and-heuristics reader, not a language model — this page
      ships as static files with no server to call.</p>
    ${a.narrative}
    <div class="bio-bars">
      ${bar('Foundational appeal', a.substance, 0, 1, Math.round(a.substance * 100))}
      ${bar('Charisma', a.charisma, 0.7, 1.35, a.charisma.toFixed(2) + '×')}
      ${bar('Discipline', a.discipline, -0.35, 0.75, a.discipline.toFixed(2))}
      ${bar('Fundraising', a.warChest, 0.6, 1.75, a.warChest.toFixed(2) + '×')}
    </div>
    <p style="margin-top:14px"><strong>Opening favourability by demographic</strong> — where every voter in the
      country starts with you, before a single dollar is spent:</p>
    ${grid}
  </div>`;
}

$('#btn-bio-next').addEventListener('click', () => {
  const ci = bioCurrent;
  const cand = UI.G.candidates[ci];
  cand.traits.charisma = cand.bioAnalysis.charisma;
  cand.traits.discipline = cand.bioAnalysis.discipline;
  cand.traits.warChest = cand.bioAnalysis.warChest;
  applyBioSeed(UI.G, ci);
  allocateFunding(UI.G);            // war chest feeds the budget
  openStanceScreen(ci);
});

/* ==========================================================================
   SETUP — STANCES
   ========================================================================== */
let stanceCurrent = 0;
function openStanceScreen(ci) {
  stanceCurrent = ci;
  const G = UI.G, cand = G.candidates[ci];
  $('#stance-who').textContent = `${cand.name} · ${cand.party}`;
  const list = $('#stance-list'); list.innerHTML = '';

  G.topics.forEach((t, i) => {
    const row = el('div', 'stance-row');
    row.appendChild(el('h4', null, esc(t.name)));
    row.appendChild(el('div', 'stance-poles',
      `<span class="neg">&minus;3 · ${esc(t.con)}</span><span class="pos">${esc(t.pro)} · +3</span>`));
    const sc = el('div', 'scale');
    for (let v = -3; v <= 3; v++) {
      const b = el('button', cand.stances[i] === v ? 'on' : '', v > 0 ? '+' + v : v < 0 ? '\u2212' + (-v) : '0');
      b.addEventListener('click', () => { cand.stances[i] = v; openStanceScreen(ci); });
      sc.appendChild(b);
    }
    row.appendChild(sc);
    row.appendChild(el('div', 'stance-read', stanceReadout(G, i, cand.stances[i])));
    list.appendChild(row);
  });
  show('screen-stance');
}

/* Where the country sits on this topic, and how far you are from it. */
function stanceReadout(G, i, v) {
  const t = G.topics[i];
  let sum = 0, n = 0, tot = 0;
  for (const ab of STATE_IDS) {
    const w = STATES[ab].pop;
    let s = 0; for (const vo of G.states[ab].voters) s += vo.t[i];
    sum += (s / 100) * w; tot += w; n++;
  }
  let mean = sum / tot;
  if (Math.abs(mean) < 0.005) mean = 0;
  const d = Math.abs(v - mean);
  const where = mean > 0.35 ? 'leans toward "' + t.pro + '"' : mean < -0.35 ? 'leans toward "' + t.con + '"' : 'is split down the middle';
  const dist = d < 0.6 ? 'you are close to it' : d < 1.6 ? 'you are somewhat outside it' : 'you are a long way from it';
  return `Average voter: ${mean >= 0 ? '+' : ''}${mean.toFixed(2)} — the country ${where}. At ${v > 0 ? '+' : ''}${v}, ${dist}.`;
}

$('#btn-stance-back').addEventListener('click', () => openBioScreen(stanceCurrent));
$('#btn-stance-next').addEventListener('click', () => { UI.humanIdx++; nextHumanSetup(); });

function finishSetup() {
  UI.G.baseline = simulate(UI.G);
  startGame();
}

/* ==========================================================================
   GAME START
   ========================================================================== */
function startGame() {
  const G = UI.G;
  G.round = 1;
  G.phase = 'campaign';
  UI.turnIdx = -1;
  UI.mapBuilt = false;
  // a pre-campaign poll so the map has something on it
  UI.currentPoll = pollFrom(simulate(G), G.rng, 0.025);
  buildMap($('#usmap'), $('#maptip'), true);
  renderAll();
  show('screen-game');
  beginRound(G);
  addFeed(null, 'flat', `The race begins. ${G.candidates.length} candidates, ${G.settings.rounds} rounds of campaigning, ` +
    `and five issues: ${G.topics.map(t => t.name).join(', ')}.`);
  advanceTurn();
}

/* ==========================================================================
   MAP
   ========================================================================== */
function buildMap(svg, tip, interactive) {
  svg.setAttribute('viewBox', VIEWBOX);
  svg.innerHTML = '';
  const gStates = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  const gLead   = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  const gLabels = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  svg.appendChild(gStates); svg.appendChild(gLead); svg.appendChild(gLabels);

  for (const ab of STATE_IDS) {
    const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    p.setAttribute('d', STATES[ab].d);
    p.setAttribute('class', 'st');
    p.setAttribute('fill', MAP_BG);
    p.dataset.ab = ab;
    gStates.appendChild(p);
  }

  /* Big states get a label at their centroid; the crowded north-east and
     anything with a tiny footprint gets a tag in a strip down the right,
     joined to the state by a leader line. Bounding boxes are precomputed in
     mapdata.js because getBBox() returns zeros while the map is off-screen. */
  const side = [];
  for (const ab of STATE_IDS) {
    const bb = STATES[ab].b, c = STATES[ab].c;
    const b = { width: bb[2], height: bb[3] };
    if (b.width >= 30 && b.height >= 20 && SMALL_STATES.indexOf(ab) < 0) {
      const t = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      t.setAttribute('class', 'stlabel');
      t.setAttribute('x', c[0]); t.setAttribute('y', c[1] + 3);
      t.textContent = ab;
      gLabels.appendChild(t);
      if (b.width >= 46 && b.height >= 34) {
        const e2 = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        e2.setAttribute('class', 'evlabel');
        e2.setAttribute('x', c[0]); e2.setAttribute('y', c[1] + 13);
        e2.textContent = STATES[ab].ev;
        gLabels.appendChild(e2);
      }
    } else {
      side.push(ab);
    }
  }
  // Stack the side tags in vertical order, nudged apart so they never collide.
  side.sort((a, b) => STATES[a].c[1] - STATES[b].c[1]);
  let y = 108;
  for (const ab of side) {
    y = Math.max(y, STATES[ab].c[1]);
    const x = 972;
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('class', 'leader');
    line.setAttribute('x1', STATES[ab].c[0]); line.setAttribute('y1', STATES[ab].c[1]);
    line.setAttribute('x2', x - 3); line.setAttribute('y2', y - 4);
    gLead.appendChild(line);

    const r = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    r.setAttribute('x', x); r.setAttribute('y', y - 14); r.setAttribute('width', 30); r.setAttribute('height', 19);
    r.setAttribute('rx', 3); r.setAttribute('class', 'st'); r.setAttribute('fill', MAP_BG);
    r.dataset.ab = ab;
    gStates.appendChild(r);

    const t = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    t.setAttribute('class', 'stlabel');
    t.setAttribute('x', x + 15); t.setAttribute('y', y);
    t.textContent = ab;
    gLabels.appendChild(t);
    y += 23;
  }

  if (interactive) {
    svg.addEventListener('mousemove', (e) => {
      const ab = e.target.dataset && e.target.dataset.ab;
      if (!ab) { tip.hidden = true; return; }
      tip.innerHTML = tooltipHTML(ab);
      tip.hidden = false;
      const wrap = svg.parentElement.getBoundingClientRect();
      let x = e.clientX - wrap.left + 14, ty = e.clientY - wrap.top + 14;
      if (x + 230 > wrap.width) x = wrap.width - 235;
      if (ty + 190 > wrap.height) ty = Math.max(4, ty - 200);
      tip.style.left = x + 'px'; tip.style.top = ty + 'px';
    });
    svg.addEventListener('mouseleave', () => { tip.hidden = true; });
    svg.addEventListener('click', (e) => {
      const ab = e.target.dataset && e.target.dataset.ab;
      if (ab) onStateClick(ab);
    });
  }
  UI.mapBuilt = true;
}

function paintMap(svg, data, mode) {
  const G = UI.G;
  $$('path.st, rect.st', svg).forEach(node => {
    const ab = node.dataset.ab;
    const d = data[ab];
    if (!d) { node.setAttribute('fill', MAP_BG); return; }
    const shares = d.shares || d.counts.map(c => c / 100);
    const w = d.winner;
    const sorted = shares.slice().sort((a, b) => b - a);
    const margin = sorted[0] - (sorted[1] || 0);
    const strength = 0.42 + 0.58 * Math.min(1, margin / 0.30);
    node.setAttribute('fill', mix(MAP_BG, G.candidates[w].color, strength));
    node.classList.toggle('sel', UI.sel.states.includes(ab) || UI.sel.state === ab || UI.inspect === ab);
  });
}

function tooltipHTML(ab) {
  const G = UI.G, st = STATES[ab];
  const src = UI.mapMode === 'truth' && G.phase !== 'campaign' ? null : UI.currentPoll;
  const d = (UI.mapData && UI.mapData[ab]) || null;
  const shares = d ? (d.shares || d.counts.map(c => c / 100)) : G.candidates.map(() => 0);
  const order = shares.map((s, k) => ({ s, k })).sort((a, b) => b.s - a.s);
  const dm = G.states[ab].demo;
  let rows = order.map(o => `<div class="trow"><span class="d" style="background:${G.candidates[o.k].color}"></span>
      <span class="nm">${esc(G.candidates[o.k].name)}</span><span class="pc">${(o.s * 100).toFixed(0)}%</span></div>`).join('');
  return `<h5>${esc(st.name)}</h5>
    <div class="tev">${st.ev} electoral votes · ${st.pop.toFixed(1)}M people</div>
    ${rows}
    <div class="tdemo">
      Age &nbsp;${AGES.map(a => `${AGE_SHORT[a][0]}${Math.round(dm.age[a] * 100)}`).join(' · ')}<br>
      Gender &nbsp;${GENDERS.map(g => `${g[0].toUpperCase()}${Math.round(dm.gender[g] * 100)}`).join(' · ')}
    </div>`;
}

function onStateClick(ab) {
  const a = UI.sel.actionId ? ACTION_BY_ID[UI.sel.actionId] : null;
  // With no campaign action armed, a click is a question rather than an order:
  // open the state up in the sidebar.
  if (!a || (a.targeting !== 'state' && a.targeting !== 'multi-state')) {
    UI.inspect = (UI.inspect === ab) ? null : ab;
    renderCrossPane();
    if (UI.inspect) goTab('cross');
    refreshMap();
    return;
  }
  if (a.targeting === 'state') { UI.sel.state = ab; UI.sel.states = [ab]; }
  else {
    const i = UI.sel.states.indexOf(ab);
    if (i >= 0) UI.sel.states.splice(i, 1);
    else if (UI.sel.states.length < 4) UI.sel.states.push(ab);
    UI.sel.state = UI.sel.states[0] || null;
  }
  UI.inspect = ab;
  renderActionPane();
  renderCrossPane();
  refreshMap();
}

function refreshMap() {
  const G = UI.G;
  UI.mapData = UI.currentPoll.byState;
  paintMap($('#usmap'), UI.mapData, UI.mapMode);
  renderEVBar($('#evbar'), UI.currentPoll.ev, 538);
  const r = G.settings.rounds;
  const done = G.polls.length;
  $('#map-sub').textContent = G.phase === 'final-push'
    ? `Final polling average · national margin of error ±${UI.currentPoll.moe.toFixed(1)} pts`
    : done === 0
      ? `Pre-campaign polling · national margin of error ±${UI.currentPoll.moe.toFixed(1)} pts`
      : `Polling average after round ${done} of ${r} · national margin of error ±${UI.currentPoll.moe.toFixed(1)} pts`;
  renderLegend();
}

function renderEVBar(node, ev, total) {
  const G = UI.G;
  node.innerHTML = '';
  const order = ev.map((v, k) => ({ v, k })).sort((a, b) => b.v - a.v);
  for (const o of order) {
    if (o.v <= 0) continue;
    const d = el('div', 'seg-ev');
    d.style.width = (o.v / total * 100) + '%';
    d.style.background = G.candidates[o.k].color;
    d.textContent = o.v >= 24 ? o.v : '';
    d.title = `${G.candidates[o.k].name}: ${o.v}`;
    node.appendChild(d);
  }
  const m = el('div', 'mark270'); node.appendChild(m);
}

function renderLegend() {
  const G = UI.G;
  const lg = $('#legend'); lg.innerHTML = '';
  const ev = UI.currentPoll.ev;
  G.candidates.forEach((c, k) => {
    const won = STATE_IDS.filter(ab => UI.currentPoll.byState[ab].winner === k).length;
    lg.appendChild(el('div', 'lg',
      `<span class="d" style="background:${c.color}"></span>
       <span>${esc(c.name)}${c.isHuman ? '<span class="you-tag">YOU</span>' : ''}</span>
       <b>${ev[k]} EV</b><span class="muted">${won} states</span>`));
  });
}

/* ==========================================================================
   TURN FLOW
   ========================================================================== */
function advanceTurn() {
  const G = UI.G;
  UI.turnIdx++;
  if (UI.turnIdx >= G.candidates.length) { finishRound(); return; }
  const cand = G.candidates[UI.turnIdx];
  resetSelection();
  // Baseline for the "this turn" deltas in the state inspector.
  G.turnStart = simulate(G);

  if (cand.isHuman) {
    const multi = G.candidates.filter(c => c.isHuman).length > 1;
    // A new turn starts on the Campaign tab — you should never come back from
    // studying a state to find the spending controls hidden.
    const go = () => { renderAll(); goTab('act'); show('screen-game'); };
    if (multi) handoff(cand.name,
      `${G.phase === 'final-push' ? 'The final push' : 'Round ' + G.round + ' of ' + G.settings.rounds}. ` +
      `Your turn to spend. $${Math.round(cand.cash)}M on hand.`, go, cand.color);
    else go();
  } else {
    renderAll();
    runAITurn(UI.turnIdx);
  }
}

function runAITurn(ci) {
  const G = UI.G, cand = G.candidates[ci];
  $('#tb-phase').textContent = `${cand.name} is campaigning`;
  const reports = aiTakeTurn(G, ci);
  // Reveal the whole turn in roughly two seconds however busy it was, so a
  // six-candidate field does not turn into a minute of watching.
  const gap = clamp(2000 / Math.max(1, reports.length), 70, 240);
  let i = 0;
  const drip = () => {
    if (i >= reports.length) {
      setTimeout(() => { refreshMap(); advanceTurn(); }, 220);
      return;
    }
    pushReport(reports[i]); i++;
    setTimeout(drip, gap);
  };
  setTimeout(drip, 160);
}

function finishRound() {
  const G = UI.G;
  if (G.phase === 'final-push') { goToElection(); return; }

  const poll = endRound(G);
  UI.currentPoll = poll;
  refreshMap();
  renderAll();
  showRoundModal(poll);
}

function showRoundModal(poll) {
  const G = UI.G;
  const order = poll.nat.map((v, k) => ({ v, k })).sort((a, b) => b.v - a.v);
  let rows = order.map(o => {
    const c = G.candidates[o.k];
    const prev = G.polls.length > 1 ? G.polls[G.polls.length - 2].poll.nat[o.k] : null;
    const dz = prev == null ? '' : ((o.v - prev) >= 0 ? '+' : '') + ((o.v - prev) * 100).toFixed(1);
    return `<tr><td><span class="dotname"><span class="d" style="background:${c.color}"></span>${esc(c.name)}${c.isHuman ? '<span class="you-tag">YOU</span>' : ''}</span></td>
      <td class="num">${(o.v * 100).toFixed(1)}%</td>
      <td class="num" style="color:${!dz ? 'var(--ink3)' : parseFloat(dz) >= 0 ? 'var(--good)' : 'var(--bad)'}">${dz || '—'}</td>
      <td class="num">${poll.ev[o.k]}</td></tr>`;
  }).join('');

  const last = G.round >= G.settings.rounds;
  openModal(`<h3>Polling after round ${G.round}</h3>
    <p class="muted">National survey of likely voters. Margin of error ±${poll.moe.toFixed(1)} points on the national
      number, wider in individual states. These are estimates, not the count.</p>
    <table class="tbl"><thead><tr><th>Candidate</th><th class="num">Poll</th><th class="num">Change</th><th class="num">Proj. EV</th></tr></thead>
    <tbody>${rows}</tbody></table>
    ${last ? `<h4>Next</h4><p>Campaigning is over. What is left in the accounts can still be spent in the last
      forty-eight hours — then the country votes.</p>` : ''}
    <div class="row-actions center"><button class="btn" id="btn-round-go">${last ? 'The final push' : 'Round ' + (G.round + 1)}</button></div>`);
  $('#btn-round-go').addEventListener('click', () => {
    closeModal();
    if (last) startFinalPush(); else nextRound();
  });
}

function nextRound() {
  const G = UI.G;
  G.round++;
  beginRound(G);
  UI.turnIdx = -1;
  renderAll();
  advanceTurn();
}

function startFinalPush() {
  const G = UI.G;
  G.phase = 'final-push';
  UI.turnIdx = -1;
  G.candidates.forEach(c => { c.momentum = c.nextMomentum || 1; });
  addFeed(null, 'flat', 'Forty-eight hours left. No more money is coming in — whatever is in the account is what there is.');
  renderAll();
  advanceTurn();
}

/* ==========================================================================
   REPORTS / FEED
   ========================================================================== */
function pushReport(rep) {
  const G = UI.G, c = G.candidates[rep.ci];
  for (const h of rep.headlines) addFeed(rep.ci, rep.cls, h, rep);
}

function addFeed(ci, cls, text, rep) {
  const G = UI.G;
  const feed = $('#feed');
  const item = el('div', 'feed-item ' + (cls || 'flat'));
  const who = ci == null ? 'Wire' : G.candidates[ci].name;
  const col = ci == null ? 'var(--ink3)' : G.candidates[ci].color;
  let tag = '';
  if (rep) {
    const bits = [];
    if (rep.cost) bits.push(`$${rep.cost}M`);
    if (rep.cash) bits.push(`raised $${Math.round(rep.cash)}M`);
    if (Math.abs(rep.move || 0) > 0.0005) bits.push(moveWord(rep.move).word);
    if (bits.length) tag = `<div class="tagline-move">${bits.join(' · ')}</div>`;
  }
  item.innerHTML = `<div class="fw"><span class="nm" style="color:${col}">${esc(who)}</span>
      <span class="rd">${G.phase === 'final-push' ? 'Final push' : 'Round ' + G.round}</span></div>
    <div>${text}</div>${tag}`;
  feed.insertBefore(item, feed.firstChild);
  while (feed.children.length > 60) feed.removeChild(feed.lastChild);
  G.log.push({ round: G.round, ci, cls, text });
}

/* ==========================================================================
   RENDER — everything
   ========================================================================== */
function renderAll() {
  const G = UI.G;
  $('#tb-round').textContent = G.phase === 'final-push' ? 'Final push' : `Round ${G.round} of ${G.settings.rounds}`;
  $('#tb-phase').textContent = G.phase === 'final-push' ? 'Last 48 hours' : 'Campaigning';
  const cand = G.candidates[Math.max(0, UI.turnIdx)];
  $('#tb-turn').innerHTML = cand
    ? `<span class="turn-chip"><span class="dot" style="background:${cand.color}"></span>
        <span>${esc(cand.name)}</span><span class="cash">$${Math.round(cand.cash)}M</span></span>`
    : '';
  refreshMap();
  renderActionPane();
  renderPollPane();
  renderCrossPane();
  renderPlatPane();
}

/* ---------- tabs ---------- */
$$('#tabs .tab').forEach(t => t.addEventListener('click', () => {
  $$('#tabs .tab').forEach(x => x.classList.remove('active'));
  t.classList.add('active');
  $$('.tabpane').forEach(p => p.classList.remove('active'));
  $('#pane-' + t.dataset.tab).classList.add('active');
}));
function goTab(name) {
  const t = $(`#tabs .tab[data-tab="${name}"]`); if (t) t.click();
}

/* ---------- action pane ---------- */
function resetSelection() {
  UI.sel = { actionId: null, state: null, states: [], focusAge: null, focusGender: null,
             intensity: 1, mode: 'pro', targetIdx: null, topicIndex: 0, direction: 1, celeb: null, corp: null };
}

function renderActionPane() {
  const G = UI.G;
  const pane = $('#pane-act');
  const ci = UI.turnIdx;
  const cand = G.candidates[ci];
  if (!cand) { pane.innerHTML = ''; return; }

  if (!cand.isHuman) {
    pane.innerHTML = `<div class="cash-line"><span class="lb">${esc(cand.name)} is deciding</span>
      <span class="amt">$${Math.round(cand.cash)}M</span></div>
      <p class="muted">${esc(cand.persona ? cand.persona.name + ' — ' + cand.persona.desc : '')}</p>
      <p class="muted">Watch the wire.</p>`;
    return;
  }

  const avail = ACTIONS.filter(a => !a.gated || (a.gated === 'corp' && G.settings.fundingMode === 'corporate' && !cand.corp && G.corpOffers[ci] && G.corpOffers[ci].length));
  let html = `<div class="cash-line"><span class="lb">War chest</span><span class="amt">$${Math.round(cand.cash)}M</span></div>`;
  html += `<div class="actgrid">` + avail.map(a => {
    const dis = a.cost > cand.cash;
    return `<button class="actbtn${UI.sel.actionId === a.id ? ' on' : ''}" data-a="${a.id}" ${dis ? 'disabled' : ''}>
      <span class="ic">${a.icon}</span><span class="nm">${a.name}</span>
      <span class="cst">${a.cost ? '$' + a.cost + 'M' : 'free'}</span></button>`;
  }).join('') + `</div>`;

  html += `<div id="cfg-slot"></div>`;
  html += `<div class="endturn">
    <button class="btn secondary" id="btn-endturn">End ${G.phase === 'final-push' ? 'final push' : 'turn'}${G.candidates.filter(c=>c.isHuman).length>1?' — '+esc(cand.name):''}</button>
  </div>`;
  pane.innerHTML = html;

  $$('.actbtn', pane).forEach(b => b.addEventListener('click', () => {
    UI.sel.actionId = UI.sel.actionId === b.dataset.a ? null : b.dataset.a;
    UI.sel.state = null; UI.sel.states = []; UI.sel.focusAge = null; UI.sel.focusGender = null;
    UI.sel.intensity = 1; UI.sel.mode = 'pro';
    UI.sel.targetIdx = G.candidates.findIndex((c, k) => k !== ci);
    renderActionPane(); refreshMap();
  }));
  $('#btn-endturn').addEventListener('click', () => { resetSelection(); refreshMap(); advanceTurn(); });

  if (UI.sel.actionId) renderActionConfig($('#cfg-slot'), ci);
}

function renderActionConfig(slot, ci) {
  const G = UI.G, cand = G.candidates[ci];
  const a = ACTION_BY_ID[UI.sel.actionId];
  const others = G.candidates.map((c, k) => ({ c, k })).filter(o => o.k !== ci);

  // A stance already pinned at ±3 can only move one way — preselect that way
  // rather than offering a checked-but-dead button.
  if (a.targeting === 'topic') {
    const cur = cand.stances[UI.sel.topicIndex];
    if (cur >= 3 && UI.sel.direction > 0) UI.sel.direction = -1;
    if (cur <= -3 && UI.sel.direction < 0) UI.sel.direction = 1;
  }

  let h = `<div class="cfg"><h4>${a.icon} ${a.name}</h4><p class="blurb">${esc(a.blurb)}</p>`;

  /* --- targeting --- */
  if (a.targeting === 'state' || a.targeting === 'multi-state') {
    const multi = a.targeting === 'multi-state';
    h += `<div class="cfg-field"><label>${multi ? 'Stops (click up to 4 states on the map)' : 'Target state (click the map)'}</label>
      <select id="cfg-state"><option value="">— choose a state —</option>` +
      STATE_IDS.slice().sort((x, y) => STATES[x].name.localeCompare(STATES[y].name))
        .map(ab => `<option value="${ab}" ${UI.sel.states.includes(ab) ? 'selected' : ''}>${STATES[ab].name} (${STATES[ab].ev})</option>`).join('') +
      `</select>`;
    if (multi) {
      h += `<div class="targ-hint">${UI.sel.states.length ? UI.sel.states.join(' · ') : 'no stops yet'} — splitting the tour dilutes every stop</div>`;
    }
    h += `</div>`;
  }

  if (a.ageWeight) {
    h += `<div class="cfg-field"><label>Narrow the audience (optional)</label><div class="chiprow">`;
    h += `<button class="chip${!UI.sel.focusAge ? ' on' : ''}" data-fa="">All ages</button>`;
    for (const ag of AGES) h += `<button class="chip${UI.sel.focusAge === ag ? ' on' : ''}" data-fa="${ag}">${AGE_SHORT[ag]}</button>`;
    h += `</div><div class="chiprow" style="margin-top:5px">`;
    h += `<button class="chip${!UI.sel.focusGender ? ' on' : ''}" data-fg="">All genders</button>`;
    for (const g of GENDERS) h += `<button class="chip${UI.sel.focusGender === g ? ' on' : ''}" data-fg="${g}">${GENDER_LABEL[g]}</button>`;
    h += `</div><div class="targ-hint">Narrowing multiplies your effect on that slice and mostly wastes the rest.</div></div>`;
  }

  if (a.canAttack && a.targeting !== 'opponent-national') {
    h += `<div class="cfg-field"><label>Message</label><div class="chiprow">
      <button class="chip${UI.sel.mode === 'pro' ? ' on' : ''}" data-mode="pro">Positive — about you</button>
      <button class="chip${UI.sel.mode === 'anti' ? ' on' : ''}" data-mode="anti">Attack an opponent</button></div>`;
    if (UI.sel.mode === 'anti') {
      h += `<div class="chiprow" style="margin-top:5px">` + others.map(o =>
        `<button class="chip${UI.sel.targetIdx === o.k ? ' on' : ''}" data-tgt="${o.k}">${esc(o.c.name)}</button>`).join('') + `</div>`;
    }
    h += `</div>`;
  }

  if (a.targeting === 'opponent-national') {
    h += `<div class="cfg-field"><label>Target</label><div class="chiprow">` + others.map(o =>
      `<button class="chip${UI.sel.targetIdx === o.k ? ' on' : ''}" data-tgt="${o.k}">${esc(o.c.name)}</button>`).join('') + `</div></div>`;
  }

  if (a.targeting === 'topic') {
    h += `<div class="cfg-field"><label>Which position moves</label>
      <select id="cfg-topic">` + G.topics.map((t, i) =>
        `<option value="${i}" ${UI.sel.topicIndex === i ? 'selected' : ''}>${esc(t.name)} — you are at ${cand.stances[i] > 0 ? '+' : ''}${cand.stances[i]}</option>`).join('') +
      `</select><div class="chiprow" style="margin-top:7px">
        <button class="chip${UI.sel.direction === -1 ? ' on' : ''}" data-dir="-1" ${cand.stances[UI.sel.topicIndex] <= -3 ? 'disabled' : ''}>Move &minus;1 (toward "${esc(G.topics[UI.sel.topicIndex].con)}")</button>
        <button class="chip${UI.sel.direction === 1 ? ' on' : ''}" data-dir="1" ${cand.stances[UI.sel.topicIndex] >= 3 ? 'disabled' : ''}>Move +1 (toward "${esc(G.topics[UI.sel.topicIndex].pro)}")</button>
      </div><div class="targ-hint">${stanceReadout(G, UI.sel.topicIndex, cand.stances[UI.sel.topicIndex])}<br>
      Flip-flop cost rises every time you do this. You have moved ${cand.flips} time${cand.flips === 1 ? '' : 's'}.</div></div>`;
  }

  if (a.id === 'celeb') {
    const pool = CELEBRITIES.filter(c => !G.usedCelebs.has(c.name));
    if (!pool.length) h += `<p class="muted">Every celebrity in America is already spoken for.</p>`;
    else {
      if (!UI.sel.celeb || !pool.includes(UI.sel.celeb)) UI.sel.celeb = pool[0];
      h += `<div class="cfg-field"><label>Who is endorsing you</label>
        <select id="cfg-celeb">` + pool.map((c, i) =>
          `<option value="${i}" ${UI.sel.celeb === c ? 'selected' : ''}>${esc(c.name)} — ${esc(c.desc)}</option>`).join('') +
        `</select><div class="targ-hint">Reaches ${AGE_LABEL[UI.sel.celeb.age].toLowerCase()}${UI.sel.celeb.gender ? ' · ' + GENDER_LABEL[UI.sel.celeb.gender].toLowerCase() : ''} hardest. Everyone else notices.</div></div>`;
    }
  }

  if (a.id === 'corp') {
    const offers = G.corpOffers[ci] || [];
    if (!UI.sel.corp) UI.sel.corp = offers[0];
    h += `<div class="cfg-field"><label>The cheque on the table</label><div class="chiprow">` +
      offers.map((o, i) => `<button class="chip${UI.sel.corp === o ? ' on' : ''}" data-corp="${i}">${esc(o.name)} · $${o.cash}M</button>`).join('') +
      `</div><div class="targ-hint">${UI.sel.corp ? esc(UI.sel.corp.name) + ' will expect ' + esc(UI.sel.corp.favour) + '.' : ''}<br>
      Taking it costs you immediately with young voters and with women, and the story can resurface at any time.</div></div>`;
  }

  /* --- intensity --- */
  if (a.cost > 0) {
    h += `<div class="cfg-field"><label>How hard</label><div class="chiprow">` +
      [[1, 'Modest'], [2, 'Serious'], [3, 'Blitz']].map(([v, lbl]) => {
        const c = a.cost * v;
        return `<button class="chip${UI.sel.intensity === v ? ' on' : ''}" data-int="${v}" ${c > cand.cash ? 'disabled' : ''}>${lbl} · $${c}M</button>`;
      }).join('') + `</div><div class="targ-hint">Spending more in one go helps, but less than proportionally.</div></div>`;
  }

  const price = a.cost * UI.sel.intensity;
  const ready = actionReady(a);
  h += `<div class="cfg-go"><span class="price">${a.cost ? '$' + price + 'M' : 'No cost'}</span>
    <button class="btn" id="btn-do" ${ready && price <= cand.cash ? '' : 'disabled'}>Do it</button></div></div>`;

  slot.innerHTML = h;

  const st = $('#cfg-state', slot);
  if (st) st.addEventListener('change', () => {
    const ab = st.value;
    if (!ab) return;
    if (a.targeting === 'multi-state') { if (!UI.sel.states.includes(ab) && UI.sel.states.length < 4) UI.sel.states.push(ab); }
    else { UI.sel.states = [ab]; }
    UI.sel.state = UI.sel.states[0];
    renderActionPane(); renderCrossPane(); refreshMap();
  });
  const tp = $('#cfg-topic', slot);
  if (tp) tp.addEventListener('change', () => {
    UI.sel.topicIndex = Number(tp.value);
    const cur = cand.stances[UI.sel.topicIndex];
    if (cur >= 3) UI.sel.direction = -1;
    if (cur <= -3) UI.sel.direction = 1;
    renderActionPane();
  });
  const cb = $('#cfg-celeb', slot);
  if (cb) cb.addEventListener('change', () => {
    const pool = CELEBRITIES.filter(c => !G.usedCelebs.has(c.name));
    UI.sel.celeb = pool[Number(cb.value)]; renderActionPane();
  });
  $$('[data-fa]', slot).forEach(b => b.addEventListener('click', () => { UI.sel.focusAge = b.dataset.fa || null; renderActionPane(); }));
  $$('[data-fg]', slot).forEach(b => b.addEventListener('click', () => { UI.sel.focusGender = b.dataset.fg || null; renderActionPane(); }));
  $$('[data-mode]', slot).forEach(b => b.addEventListener('click', () => { UI.sel.mode = b.dataset.mode; renderActionPane(); }));
  $$('[data-tgt]', slot).forEach(b => b.addEventListener('click', () => { UI.sel.targetIdx = Number(b.dataset.tgt); renderActionPane(); }));
  $$('[data-dir]', slot).forEach(b => b.addEventListener('click', () => { UI.sel.direction = Number(b.dataset.dir); renderActionPane(); }));
  $$('[data-int]', slot).forEach(b => b.addEventListener('click', () => { UI.sel.intensity = Number(b.dataset.int); renderActionPane(); }));
  $$('[data-corp]', slot).forEach(b => b.addEventListener('click', () => { UI.sel.corp = (G.corpOffers[ci] || [])[Number(b.dataset.corp)]; renderActionPane(); }));
  const go = $('#btn-do', slot);
  if (go) go.addEventListener('click', () => doAction(ci));
}

function actionReady(a) {
  if (a.targeting === 'topic') {
    const cur = UI.G.candidates[UI.turnIdx].stances[UI.sel.topicIndex];
    return clamp(cur + UI.sel.direction, -3, 3) !== cur;
  }
  if (a.targeting === 'state') return !!UI.sel.state;
  if (a.targeting === 'multi-state') return UI.sel.states.length > 0;
  if (a.targeting === 'opponent-national') return UI.sel.targetIdx != null;
  if (a.id === 'celeb') return !!UI.sel.celeb;
  if (a.id === 'corp') return !!UI.sel.corp;
  if (UI.sel.mode === 'anti') return UI.sel.targetIdx != null;
  return true;
}

function doAction(ci) {
  const G = UI.G;
  const spec = {
    actionId: UI.sel.actionId,
    intensity: UI.sel.intensity,
    state: UI.sel.state,
    states: UI.sel.states.slice(),
    focusAge: UI.sel.focusAge,
    focusGender: UI.sel.focusGender,
    mode: UI.sel.mode,
    targetIdx: UI.sel.targetIdx,
    topicIndex: UI.sel.topicIndex,
    direction: UI.sel.direction,
    celeb: UI.sel.celeb,
    corp: UI.sel.corp
  };
  const rep = runAction(G, ci, spec);
  if (!rep.ok) {
    const slot = $('#cfg-slot');
    if (slot) {
      const warn = el('div', 'targ-hint', `<span style="color:var(--bad)">${esc(rep.msg)}</span>`);
      const go = $('.cfg-go', slot);
      if (go) go.parentNode.insertBefore(warn, go);
    }
    return;
  }
  pushReport(rep);
  const keep = UI.sel.actionId;
  resetSelection();
  UI.sel.actionId = keep;
  UI.sel.targetIdx = G.candidates.findIndex((c, k) => k !== ci);
  renderAll();
}

/* ---------- standings ---------- */
function renderPollPane() {
  const G = UI.G, pane = $('#pane-poll');
  const poll = UI.currentPoll;
  const order = poll.nat.map((v, k) => ({ v, k })).sort((a, b) => b.v - a.v);
  let h = `<div class="sec-h">National poll · ±${poll.moe.toFixed(1)} pts</div>
    <table class="tbl"><thead><tr><th>Candidate</th><th class="num">Poll</th><th class="num">EV</th><th class="num">Cash</th></tr></thead><tbody>`;
  for (const o of order) {
    const c = G.candidates[o.k];
    h += `<tr><td><span class="dotname"><span class="d" style="background:${c.color}"></span>${esc(c.name)}${c.isHuman ? '<span class="you-tag">YOU</span>' : ''}</span></td>
      <td class="num">${(o.v * 100).toFixed(1)}</td><td class="num">${poll.ev[o.k]}</td>
      <td class="num">$${Math.round(c.cash)}M</td></tr>`;
  }
  h += `</tbody></table>`;

  if (G.polls.length) {
    h += `<div class="sec-h">Projected EV by round</div><table class="tbl"><thead><tr><th>Rd</th>` +
      G.candidates.map(c => `<th class="num"><span class="d" style="display:inline-block;width:9px;height:9px;border-radius:2px;background:${c.color}"></span></th>`).join('') +
      `</tr></thead><tbody>`;
    for (const p of G.polls) {
      h += `<tr><td class="num">${p.round}</td>` + p.poll.ev.map(v => `<td class="num">${v}</td>`).join('') + `</tr>`;
    }
    h += `</tbody></table>`;
  }

  h += `<div class="sec-h">Closest states in the polling</div><table class="tbl"><tbody>`;
  const close = STATE_IDS.map(ab => ({ ab, m: poll.byState[ab].margin, w: poll.byState[ab].winner }))
    .sort((a, b) => a.m - b.m).slice(0, 10);
  for (const s of close) {
    h += `<tr><td><span class="dotname"><span class="d" style="background:${G.candidates[s.w].color}"></span>${STATES[s.ab].name}</span></td>
      <td class="num">${STATES[s.ab].ev} EV</td><td class="num">+${(s.m * 100).toFixed(1)}</td></tr>`;
  }
  h += `</tbody></table>`;
  pane.innerHTML = h;
}

/* ---------- crosstabs ---------- */
function renderCrossPane() {
  const G = UI.G, pane = $('#pane-cross');
  const truth = simulate(G);
  const tot = demoTotals(truth);
  const me = viewerIdx();
  const bar = (shares) => `<div class="sharebar">` + shares.map((sh, k) =>
    `<div style="width:${(sh * 100).toFixed(2)}%;background:${G.candidates[k].color}" title="${esc(G.candidates[k].name)} ${(sh*100).toFixed(0)}%"></div>`).join('') + `</div>`;

  let h = `<div class="sec-h">Nationally · by age</div>`;
  const grand = AGES.reduce((a, g) => a + tot.age[g].total, 0);
  for (const ag of AGES) {
    const t = tot.age[ag];
    h += `<div class="crossrow"><div class="cl"><span>${AGE_LABEL[ag]}</span>
      <span class="pop">${(t.total / grand * 100).toFixed(0)}% of voters</span></div>${bar(t.shares)}</div>`;
  }
  h += `<div class="sec-h">Nationally · by gender</div>`;
  const grandG = GENDERS.reduce((a, g) => a + tot.gender[g].total, 0);
  for (const g of GENDERS) {
    const t = tot.gender[g];
    h += `<div class="crossrow"><div class="cl"><span>${GENDER_LABEL[g]}</span>
      <span class="pop">${(t.total / grandG * 100).toFixed(1)}% of voters</span></div>${bar(t.shares)}</div>`;
  }

  const ab = UI.inspect || UI.sel.state || (UI.sel.states && UI.sel.states[0]);
  h += ab ? stateInspectorHTML(G, truth, ab, me, bar)
          : `<p class="muted" style="margin-top:16px;font-size:12.5px">Click any state on the map to break it
             down by age and gender, and to see what your last actions did there.</p>`;
  pane.innerHTML = h;

  const clr = $('#btn-clear-state', pane);
  if (clr) clr.addEventListener('click', () => { UI.inspect = null; renderCrossPane(); refreshMap(); });
}

/* The per-state breakdown, with each cell's movement since this turn began —
   which, on your own turn, is exactly what your last actions bought you. */
function stateInspectorHTML(G, truth, ab, me, bar) {
  const st = truth.byState[ab];
  const prev = G.turnStart ? G.turnStart.byState[ab] : null;
  const dm = G.states[ab].demo;
  const cand = G.candidates[me];
  const order = st.counts.map((c, k) => ({ c, k })).sort((a, b) => b.c - a.c);

  // Mean bias toward the viewer inside each demographic slice: the residue of
  // every ad, visit and endorsement aimed at these people.
  const press = { age: {}, gender: {} };
  const cnt = { age: {}, gender: {} };
  for (const a of AGES) { press.age[a] = 0; cnt.age[a] = 0; }
  for (const g of GENDERS) { press.gender[g] = 0; cnt.gender[g] = 0; }
  for (const v of G.states[ab].voters) {
    press.age[v.age] += v.bias[me]; cnt.age[v.age]++;
    press.gender[v.gender] += v.bias[me]; cnt.gender[v.gender]++;
  }

  const chip = (now, before) => {
    if (before == null) return '';
    const d = now - before;
    if (Math.abs(d) < 0.5) return `<span class="delta flat">—</span>`;
    return `<span class="delta ${d > 0 ? 'up' : 'down'}">${d > 0 ? '▲' : '▼'}${Math.abs(d).toFixed(0)}pt</span>`;
  };
  const pressTag = (sum, n) => {
    if (!n) return '';
    const v = sum / n;
    const cls = v > 0.03 ? 'up' : v < -0.03 ? 'down' : 'flat';
    return `<span class="press ${cls}">${v >= 0 ? '+' : '−'}${Math.abs(v).toFixed(2)}</span>`;
  };
  /* counts are voters inside this slice of this state, not percentages — the
     group is only as big as its share of the hundred, so everything shown has
     to be normalised against the group total. */
  const row = (label, counts, before, popShare, sum, n) => {
    const tot = counts.reduce((x, y) => x + y, 0) || 1;
    const mine = counts[me] / tot * 100;
    const was = before ? before[me] / (before.reduce((x, y) => x + y, 0) || 1) * 100 : null;
    return `<div class="crossrow"><div class="cl"><span>${label}</span>
        <span class="pop">${popShare}</span></div>
      ${bar(counts.map(c => c / tot))}
      <div class="cl mine"><span><span class="d" style="background:${cand.color}"></span>${esc(cand.name)}
        ${mine.toFixed(0)}%${chip(mine, was)}</span>
        <span class="pop">ad pressure ${pressTag(sum, n)}</span></div></div>`;
  };

  let h = `<div class="sec-h insp-h">${STATES[ab].name}
      <button class="btn tiny ghost" id="btn-clear-state">Clear</button></div>
    <div class="insp-meta">${STATES[ab].ev} electoral votes · ${STATES[ab].pop.toFixed(1)}M people ·
      leading ${esc(G.candidates[order[0].k].name)} by ${order[0].c - (order[1] ? order[1].c : 0)}</div>`;

  h += `<div class="insp-sub">By age</div>`;
  for (const a of AGES) {
    h += row(AGE_LABEL[a], st.cross.age[a], prev ? prev.cross.age[a] : null,
             `${Math.round(dm.age[a] * 100)}% of the state`, press.age[a], cnt.age[a]);
  }
  h += `<div class="insp-sub">By gender</div>`;
  for (const g of GENDERS) {
    if (!cnt.gender[g]) continue;
    h += row(GENDER_LABEL[g], st.cross.gender[g], prev ? prev.cross.gender[g] : null,
             `${(dm.gender[g] * 100).toFixed(1)}% of the state`, press.gender[g], cnt.gender[g]);
  }
  h += `<div class="insp-foot">▲▼ is the change in ${esc(cand.name)}'s share of that group, in points, since
    this turn began.
    <em>Ad pressure</em> is the average bias those voters now carry toward ${esc(cand.name)} — everything your
    advertising, visits and endorsements have left behind, on the −${'' + BIAS_CAP.toFixed(1)}…+${BIAS_CAP.toFixed(1)} scale the vote is computed on.</div>`;
  return h;
}

/* ---------- platforms ---------- */
function renderPlatPane() {
  const G = UI.G, pane = $('#pane-plat');
  let h = `<div class="sec-h">The five issues</div><div class="platgrid">`;
  G.topics.forEach((t, i) => {
    h += `<div style="padding:9px 0;border-bottom:1px solid var(--line)">
      <div style="font-family:var(--serif);font-size:16px;margin-bottom:2px">${esc(t.name)}</div>
      <div style="font-size:11.5px;color:var(--ink3);margin-bottom:7px">
        &minus;3 ${esc(t.con)} &nbsp;→&nbsp; +3 ${esc(t.pro)}</div>`;
    for (const c of G.candidates) {
      h += `<div class="prow"><span class="dotname"><span class="d" style="background:${c.color}"></span>${esc(c.name)}${c.isHuman ? '<span class="you-tag">YOU</span>' : ''}</span>
        <span class="stancepill" style="color:${c.color}">${c.stances[i] > 0 ? '+' : ''}${c.stances[i]}</span></div>`;
    }
    h += `<div style="font-size:11.5px;color:var(--ink3);margin-top:5px">${stanceReadout(G, i, 0).split('—')[0]}</div></div>`;
  });
  h += `</div><div class="sec-h">The field</div>`;
  for (const c of G.candidates) {
    h += `<div style="margin-bottom:11px;padding-bottom:10px;border-bottom:1px solid var(--line)">
      <div class="dotname" style="margin-bottom:4px"><span class="d" style="background:${c.color}"></span>
        <strong>${esc(c.name)}</strong> <span class="muted">· ${esc(c.party)}</span></div>
      ${c.persona ? `<div style="font-size:11.5px;color:var(--ink3);font-family:var(--mono)">${esc(c.persona.name)} — ${esc(c.persona.desc)}</div>` : ''}
      ${c.corp ? `<div style="font-size:12px;color:#f0b9b9;margin-top:3px">Backed by ${esc(c.corp.name)}</div>` : ''}
      <div style="font-size:12.5px;color:var(--ink2);margin-top:5px">${esc(c.bio) || '<span class="muted">No biography.</span>'}</div></div>`;
  }
  pane.innerHTML = h;
}

/* ==========================================================================
   ELECTION NIGHT
   ========================================================================== */

/* Reveal pacing. Safe states come in quickly and in clumps; the closer the
   race gets to the end of the board, the longer the network sits on each
   call. Crossing 270 buys an extra beat. */
function revealPace(i, total) {
  const left = total - i;
  if (left > 27) return { batch: 3, delay: 420 };
  if (left > 12) return { batch: 1, delay: 660 };
  if (left > 4)  return { batch: 1, delay: 1050 };
  return { batch: 1, delay: 1500 };
}

function goToElection() {
  const G = UI.G;
  const F = runElection(G);
  show('screen-final');
  buildMap($('#finalmap'), $('#finaltip'), false);
  $$('path.st, rect.st', $('#finalmap')).forEach(n => n.classList.add('uncalled'));
  $('#final-title').textContent = 'Election Night';
  $('#final-sub').textContent = 'Polls are closing across the country.';
  $('#callbox').innerHTML = `<h4>Calls</h4><div id="calls"></div>`;
  $('#final-scoreboard').innerHTML = '';
  $('#final-epilogue').hidden = true;
  $('#final-actions').hidden = true;
  $('#btn-skip').hidden = false;
  UI.skipFinal = false;

  const running = G.candidates.map(() => 0);
  const crossed = G.candidates.map(() => false);
  renderEVBar($('#final-evbar'), running, 538);

  const seq = F.order.slice();
  let i = 0;

  const callState = (ab) => {
    const d = F.res.byState[ab];
    $$(`[data-ab="${ab}"]`, $('#finalmap')).forEach(n => {
      n.classList.remove('uncalled');
      const strength = 0.42 + 0.58 * Math.min(1, d.margin / 0.30);
      n.setAttribute('fill', mix(MAP_BG, G.candidates[d.winner].color, strength));
    });
    running[d.winner] += STATES[ab].ev;
    const c = el('div', 'call', `<span class="d" style="background:${G.candidates[d.winner].color}"></span>
      <span>${STATES[ab].name} — ${esc(G.candidates[d.winner].name)}</span>
      <span class="ev">${STATES[ab].ev} EV · +${(d.margin * 100).toFixed(1)}</span>`);
    const calls = $('#calls');
    calls.insertBefore(c, calls.firstChild);
    while (calls.children.length > 14) calls.removeChild(calls.lastChild);
  };

  const step = () => {
    if (UI.skipFinal) {
      while (i < seq.length) callState(seq[i++]);
      renderEVBar($('#final-evbar'), running, 538);
      $('#btn-skip').hidden = true;
      concludeElection(F);
      return;
    }
    if (i >= seq.length) {
      $('#btn-skip').hidden = true;
      UI.finalTimer = setTimeout(() => concludeElection(F), 900);
      return;
    }
    const pace = revealPace(i, seq.length);
    let justCrossed = -1;
    for (let b = 0; b < pace.batch && i < seq.length; b++, i++) {
      callState(seq[i]);
      const w = F.res.byState[seq[i]].winner;
      if (!crossed[w] && running[w] >= 270) { crossed[w] = true; justCrossed = w; }
    }
    renderEVBar($('#final-evbar'), running, 538);

    const lead = running.map((v, k) => ({ v, k })).sort((a, b) => b.v - a.v)[0];
    if (justCrossed >= 0) {
      $('#final-sub').innerHTML = `<strong style="color:${G.candidates[justCrossed].color}">` +
        `${esc(G.candidates[justCrossed].name)} has crossed 270.</strong>`;
    } else {
      $('#final-sub').textContent = `${seq.length - i} state${seq.length - i === 1 ? '' : 's'} still out. ` +
        `${G.candidates[lead.k].name} leads with ${lead.v}.`;
    }
    UI.finalTimer = setTimeout(step, pace.delay + (justCrossed >= 0 ? 1400 : 0));
  };
  UI.finalStep = step;
  UI.finalTimer = setTimeout(step, 1100);
}

/* ==========================================================================
   CONFETTI
   ========================================================================== */
const Confetti = (() => {
  let cv, ctx, parts = [], raf = null, stopAt = 0;

  const resize = () => {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = Math.floor(innerWidth * dpr);
    cv.height = Math.floor(innerHeight * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };

  const spawn = (x, y, vx, vy, colors) => {
    for (let n = 0; n < 1; n++) {
      parts.push({
        x, y, vx, vy,
        w: 6 + Math.random() * 7,
        h: 4 + Math.random() * 6,
        rot: Math.random() * Math.PI * 2,
        vr: (Math.random() - 0.5) * 0.34,
        tilt: Math.random() * Math.PI,
        vt: 0.06 + Math.random() * 0.12,
        col: colors[Math.floor(Math.random() * colors.length)],
        life: 1
      });
    }
  };

  const frame = () => {
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    for (const p of parts) {
      p.vy += 0.17;            // gravity
      p.vx *= 0.992;
      p.vy *= 0.996;
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.vr;
      p.tilt += p.vt;
      if (p.y > innerHeight + 40) p.life = 0;
      if (p.life <= 0) continue;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      // squash horizontally to fake a fluttering ribbon
      ctx.scale(Math.cos(p.tilt), 1);
      ctx.fillStyle = p.col;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    }
    parts = parts.filter(p => p.life > 0);
    if (parts.length || performance.now() < stopAt) {
      raf = requestAnimationFrame(frame);
    } else {
      cv.classList.remove('on');
      ctx.clearRect(0, 0, innerWidth, innerHeight);
      raf = null;
    }
  };

  return {
    fire(colors) {
      if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      cv = $('#confetti');
      ctx = cv.getContext('2d');
      cv.classList.add('on');
      resize();
      addEventListener('resize', resize);
      const W = innerWidth, H = innerHeight;

      // two cannons from the bottom corners, angled inward and up
      for (let n = 0; n < 90; n++) {
        const s = 15 + Math.random() * 11;
        const a = -Math.PI / 2.5 + (Math.random() - 0.5) * 0.55;
        spawn(-10, H + 10, Math.cos(a) * s * -1 + s * 1.15, Math.sin(a) * s, colors);
      }
      for (let n = 0; n < 90; n++) {
        const s = 15 + Math.random() * 11;
        const a = -Math.PI / 2.5 + (Math.random() - 0.5) * 0.55;
        spawn(W + 10, H + 10, -(Math.cos(a) * s * -1 + s * 1.15), Math.sin(a) * s, colors);
      }
      // and a slow drift from above for the next few seconds
      stopAt = performance.now() + 3400;
      const rain = setInterval(() => {
        if (performance.now() > stopAt) { clearInterval(rain); return; }
        for (let n = 0; n < 5; n++) {
          spawn(Math.random() * W, -20, (Math.random() - 0.5) * 2.4, 2 + Math.random() * 3, colors);
        }
      }, 90);

      if (!raf) raf = requestAnimationFrame(frame);
    }
  };
})();

/* Lighten a colour toward white, for confetti variety. */
function tint(hex, t) { return mix(hex, '#ffffff', t); }

function concludeElection(F) {
  const G = UI.G;
  const w = G.candidates[F.winner];
  $('#final-title').innerHTML = F.contingent
    ? `No majority`
    : `${esc(w.name)} wins`;
  $('#final-sub').textContent = F.contingent
    ? `Nobody reached 270. The election goes to the House of Representatives.`
    : `${F.res.ev[F.winner]} electoral votes · ${(F.res.pvShare[F.winner] * 100).toFixed(1)}% of the popular vote`;

  // scoreboard
  const order = F.res.ev.map((v, k) => ({ v, k })).sort((a, b) => b.v - a.v);
  let h = `<div class="sec-h">Final result</div><table class="tbl"><thead><tr><th>Candidate</th>
    <th class="num">EV</th><th class="num">States</th><th class="num">Pop. vote</th></tr></thead><tbody>`;
  for (const o of order) {
    const c = G.candidates[o.k];
    const states = STATE_IDS.filter(ab => F.res.byState[ab].winner === o.k).length;
    h += `<tr><td><span class="dotname"><span class="d" style="background:${c.color}"></span>${esc(c.name)}${c.isHuman ? '<span class="you-tag">YOU</span>' : ''}</span></td>
      <td class="num">${o.v}</td><td class="num">${states}</td><td class="num">${(F.res.pvShare[o.k] * 100).toFixed(1)}%</td></tr>`;
  }
  h += `</tbody></table>`;

  // final poll vs result — how wrong were the polls?
  if (G.polls.length) {
    const last = G.polls[G.polls.length - 1].poll;
    h += `<div class="sec-h">Final poll vs. count</div><table class="tbl"><tbody>`;
    for (const o of order) {
      const err = (F.res.pvShare[o.k] - last.nat[o.k]) * 100;
      h += `<tr><td><span class="dotname"><span class="d" style="background:${G.candidates[o.k].color}"></span>${esc(G.candidates[o.k].name)}</span></td>
        <td class="num">${(last.nat[o.k] * 100).toFixed(1)} → ${(F.res.pvShare[o.k] * 100).toFixed(1)}</td>
        <td class="num" style="color:${Math.abs(err) < 1.5 ? 'var(--ink3)' : err > 0 ? 'var(--good)' : 'var(--bad)'}">${err >= 0 ? '+' : ''}${err.toFixed(1)}</td></tr>`;
    }
    h += `</tbody></table>`;
  }
  $('#final-scoreboard').innerHTML = h;

  // epilogue
  const ep = $('#final-epilogue');
  let e = `<h3>${F.contingent ? 'A deadlocked map' : esc(w.name) + ' is elected President'}</h3>`;
  if (F.contingent) {
    e += `<p>With ${G.candidates.length} names on the ballot the electoral college fractured. ${esc(w.name)} finished
      first with ${F.res.ev[F.winner]} votes — short of the 270 required — and under the Twelfth Amendment the
      decision passes to the House, where each state delegation casts a single vote.</p>`;
  } else {
    const margin = F.res.ev[F.winner] - order[1].v;
    e += `<p>${esc(w.name)} of the ${esc(w.party)} carried ${STATE_IDS.filter(ab => F.res.byState[ab].winner === F.winner).length}
      states and ${F.res.ev[F.winner]} electoral votes, ${margin > 150 ? 'a decisive victory' : margin > 60 ? 'a comfortable win' : 'a narrow win'}
      over ${esc(G.candidates[order[1].k].name)}.</p>`;
  }
  if (F.splitDecision) {
    e += `<p><strong>Split decision.</strong> ${esc(G.candidates[F.pvWinner].name)} won the popular vote with
      ${(F.res.pvShare[F.pvWinner] * 100).toFixed(1)}% and lost the election. Expect that number to be quoted for
      the next four years.</p>`;
  }
  // the corporate reveal
  if (w.corp) {
    e += `<div class="corp-line"><strong>${esc(w.name)} won while backed by ${esc(w.corp.name)}</strong>, who has
      achieved additional power through ${esc(w.corp.favour)}.</div>`;
  }
  const otherCorp = G.candidates.filter((c, k) => c.corp && k !== F.winner);
  if (otherCorp.length) {
    e += `<p class="muted" style="font-size:13px;margin-top:12px">Also bought and did not win:
      ${otherCorp.map(c => `${esc(c.corp.name)} (${esc(c.name)})`).join(', ')}.</p>`;
  }
  // closest state
  const closest = STATE_IDS.map(ab => ({ ab, m: F.res.byState[ab].margin })).sort((a, b) => a.m - b.m)[0];
  e += `<p class="muted" style="font-size:13px">Closest state: ${STATES[closest.ab].name}, decided by
    ${(closest.m * 100).toFixed(2)} points. Turnout jitter alone was worth about ±2.8 points per state.</p>`;
  ep.innerHTML = e;
  ep.hidden = false;
  $('#final-actions').hidden = false;

  const wc = w.color;
  Confetti.fire([wc, tint(wc, 0.45), '#f2c14e', '#ffffff', tint(wc, 0.2)]);
}

$('#btn-skip').addEventListener('click', () => {
  UI.skipFinal = true;
  if (UI.finalTimer) { clearTimeout(UI.finalTimer); UI.finalTimer = null; }
  $('#btn-skip').hidden = true;
  if (UI.finalStep) UI.finalStep();     // drains the rest of the board at once
});

$('#btn-again').addEventListener('click', () => location.reload());
$('#btn-final-method').addEventListener('click', () => openModal(methodologyHTML(UI.G)));
$('#btn-method').addEventListener('click', () => openModal(methodologyHTML(UI.G)));
$('#btn-quit').addEventListener('click', () => { if (confirm('Abandon the campaign?')) location.reload(); });

/* map mode buttons */
(function buildMapModes() {
  const box = $('#map-modes');
  const b = el('button', 'on', 'Polling');
  box.appendChild(b);
})();

/* ==========================================================================
   METHODOLOGY
   ========================================================================== */
function methodologyHTML(G) {
  const seedLine = G ? `<p class="muted">This election's seed: <code>${esc(G.seed)}</code> — reuse it to replay the
    same country.</p>` : '';
  return `<h3>How this works</h3>
  ${seedLine}
  <h4>The electorate</h4>
  <p>Every state gets <strong>100 simulated voters</strong>, 5,100 in all. Each voter is assigned an age bucket
  (young 18–34, middle 35–64, older 65+) and a gender (male, female, nonbinary) by quota, so the hundred voters
  match that state's demographic mix. States differ: Utah is young, Maine is old.</p>

  <h4>Positions</h4>
  <p>Five issues are drawn from a pool at the start of each election. Every <em>state</em>, every <em>age
  bucket</em> and every <em>gender</em> holds a position on each issue from &minus;3 to +3. A voter's own position
  is the average of their three:</p>
  <div class="eqn">position(voter, issue) = ( state + age + gender ) / 3</div>
  <p>State positions are driven by that state's partisan lean, so Wyoming and Vermont pull hard in opposite
  directions. Under <strong>Realistic</strong> individuality each voter also deviates from their group by a normal
  draw (σ = 1.4), which is what produces state margins in the same range as real American elections. Under
  <strong>Lockstep</strong> that term is zero and the model runs exactly as specified — blocky and merciless.</p>
  <p>Each issue is then recentred on the national electorate, so the average American sits near zero and the
  geography of the map is driven by how states differ from each other rather than by whether the idea happens
  to be popular. A small residual tilt survives, so taking the popular side still helps.</p>

  <h4>Who a voter votes for</h4>
  <p>Each voter carries a <strong>bias</strong> toward every candidate, starting at whatever their biography earned
  and moved by campaigning. The voter's vector is their five positions followed by their bias toward each
  candidate. A candidate's vector is their five stances followed by <code>+3</code> in their own slot and
  <code>&minus;3</code> in everyone else's. The voter picks the highest cosine similarity:</p>
  <div class="eqn">voter&nbsp; = [ p₁ … p₅ , b₁ … b<sub>N</sub> ]
candidate k = [ s₁ … s₅ , &minus;3 … <b>+3</b> … &minus;3 ]

vote = argmax<sub>k</sub>  (voter · candidate<sub>k</sub>) / (‖voter‖ ‖candidate<sub>k</sub>‖)</div>
  <p>Because the identity block is ±3, a bias of even half a point is worth roughly as much as a full step on an
  issue. Advertising is powerful — that is the point of the game.</p>

  <h4>Campaigning</h4>
  <ul>
    <li>Each action touches voters with a weight set by its <em>reach profile</em>: print mail barely reaches
      anyone under 35; an internet blitz barely reaches anyone over 65.</li>
    <li>Narrowing the audience multiplies your effect on that slice roughly 1.85× and cuts everyone else to 0.18×.</li>
    <li><strong>Diminishing returns</strong> apply per action <em>and per target</em>. The second identical TV buy in
      Ohio is worth about three-quarters of the first; the fifth is worth about a third.</li>
    <li>Spending harder in one go scales as intensity<sup>0.75</sup> — a blitz is better than a modest buy, but not
      three times better.</li>
    <li>Every action can <strong>backfire</strong>, at a rate reduced by the message discipline your biography
      earned. Internet advertising and opposition research are the most volatile.</li>
    <li>Splitting a tour across several states divides its force by stops<sup>0.62</sup>.</li>
    <li>The result copy alludes to how far the numbers moved. It never prints the number.</li>
  </ul>

  <h4>Polling</h4>
  <p>What the map shows during the campaign is <em>a poll</em>, not the truth: the real state shares plus a normal
  error, renormalised. State polls are noisier than the national number, and every poll gets sharper as election
  day approaches. Your projected electoral vote can be wrong, and often is.</p>

  <h4>Election night</h4>
  <p>The count is the true simulation with a final turnout jitter (σ ≈ 2.8 points per state) layered on. States
  are winner-take-all — including Maine and Nebraska, which the real system splits. 538 electoral votes,
  270 to win; if the field fragments and nobody gets there, the election goes to the House.</p>

  <h4>About the "AI" analyst</h4>
  <p>The biography reader is a local lexicon-and-heuristics model, not a language model. This page is static
  files with no backend and no API key, so nothing you type leaves your browser. It looks for occupational
  signals, place names, numbers and proper nouns, empty campaign filler and volunteered liabilities, and turns
  them into a starting favourability across the nine age × gender cells.</p>`;
}

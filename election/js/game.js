/* ==========================================================================
   game.js: game construction and round flow
   ========================================================================== */

const BASE_START_CASH  = 85;
const BASE_ROUND_CASH  = 40;

function newGame(settings) {
  const seed = settings.seed || String(Math.floor(Math.random() * 1e9));
  const rng = makeRNG(seed);

  const G = {
    seed, rng, settings,
    round: 1,
    phase: 'campaign',
    topics: generateTopics(rng),
    candidates: [],
    states: {},
    log: [],
    usedCelebs: new Set(),
    corpOffers: {},
    polls: [],
    history: [],
    final: null
  };

  /* --- candidates --- */
  const n = settings.candidates.length;
  const personaPool = rng.shuffle(AI_PERSONAS);
  settings.candidates.forEach((c, i) => {
    const cand = {
      idx: i,
      name: c.name,
      party: c.party,
      color: c.color,
      isHuman: c.isHuman,
      persona: c.isHuman ? null : personaPool[i % personaPool.length],
      bio: c.bio || '',
      bioAnalysis: null,
      stances: c.stances ? c.stances.slice() : new Array(5).fill(0),
      cash: 0,
      income: 0,
      corp: null,
      uses: {},
      flips: 0,
      traits: { charisma: 1, discipline: 0, warChest: 1 }
    };
    G.candidates.push(cand);
  });

  /* --- the electorate --- */
  for (const ab of STATE_IDS) {
    const built = buildStateVoters(rng, ab, G.topics, n, settings.indivSd);
    built.tiebreak = rng.shuffle(G.candidates.map((_, k) => k));
    G.states[ab] = built;
  }

  /* --- AI candidates: bios, stances, personas --- */
  const anchors = spreadAnchors(rng, n);
  G.candidates.forEach((cand, i) => {
    if (cand.isHuman) return;
    const home = rng.pick(STATE_IDS);
    cand.bio = makeAIBio(rng, cand.persona, home);
    aiPickStances(G, i, rng, anchors[i]);
  });

  /* --- biography analysis. Human candidates write theirs on the setup screen
         and are seeded there instead, so we leave them alone here. --- */
  G.candidates.forEach((cand, i) => {
    if (cand.isHuman) return;
    cand.bioAnalysis = analyzeBio(cand.bio, rng);
    cand.traits.charisma  = cand.bioAnalysis.charisma;
    cand.traits.discipline = cand.bioAnalysis.discipline;
    cand.traits.warChest  = cand.bioAnalysis.warChest;
    applyBioSeed(G, i);
  });

  /* --- money --- */
  allocateFunding(G);

  /* --- corporate offers ---
     Nobody is approached in the first round. Interested parties turn up from
     round two onward, once there is a race worth buying into. */
  G.corpTaken = new Set();
  G.corpOfferRound = 0;

  G.baseline = simulate(G);
  return G;
}

/* Budgets. The random multiplier is drawn once per candidate and kept, so
   re-running this (which the setup screen does after each biography is
   analysed) never reshuffles anyone else's money. */
function allocateFunding(G) {
  const rng = G.rng;
  const mode = G.settings.fundingMode;
  G.candidates.forEach((c) => {
    if (c.fundingMult == null) {
      c.fundingMult = (mode === 'random' || mode === 'corporate') ? rng.range(0.6, 1.45) : 1;
    }
    const mult = c.fundingMult;
    // The biography's fundraising bonus is damped so it cannot compound with
    // an already-lucky draw into an unanswerable war chest.
    const wc = Math.pow(c.traits.warChest, 0.6);
    c.cash   = Math.round(BASE_START_CASH * mult * wc);
    c.income = Math.round(BASE_ROUND_CASH * mult * (0.65 + wc * 0.35));
  });
}

/* --- round bookkeeping ------------------------------------------------- */

/* Put a fresh pair of named corporations in front of every candidate who has
   not already signed with one. Anything already accepted is off the table. */
function dealCorpOffers(G) {
  if (G.settings.fundingMode !== 'corporate') return;
  const pool = G.rng.shuffle(CORPORATIONS.filter(c => !G.corpTaken.has(c.name)));
  let i = 0;
  G.candidates.forEach((c) => {
    if (c.corp) { G.corpOffers[c.idx] = []; return; }
    const offers = [];
    while (offers.length < 2 && i < pool.length) offers.push(pool[i++]);
    G.corpOffers[c.idx] = offers;
  });
  G.corpOfferRound = G.round;
}

function beginRound(G) {
  // From round two on, the money comes looking for you.
  if (G.round > 1) dealCorpOffers(G);
  G.candidates.forEach((c) => {
    if (G.round > 1) c.cash += c.income;
    // A corporate patron keeps paying, and keeps costing.
    if (c.corp) {
      c.cash += Math.round(c.corp.cash * 0.10);
      if (G.rng.chance(0.28)) {
        const m = pushBias(G, {
          action: { ageWeight: { young: 1.5, middle: 1.0, old: 0.7 }, genderWeight: { male: 0.9, female: 1.2, nonbinary: 1.4 } },
          statesList: STATE_IDS, focus: null, targetIdx: c.idx, sign: -1, magnitude: 0.13, spillMag: 0
        });
        G.log.push({ round: G.round, ci: c.idx, cls: 'bad', move: m,
          text: `A reporter connects ${c.corp.name}'s donation to a line in ${c.name}'s platform. The campaign declines to comment.` });
      }
    }
  });
}

function endRound(G) {
  const truth = simulate(G);
  // Polls get sharper as the election approaches.
  const t = G.round / Math.max(1, G.settings.rounds);
  const sd = 0.024 - 0.011 * t;    // national sampling error, tightening toward election day
  const poll = pollFrom(truth, G.rng, sd);
  G.polls.push({ round: G.round, poll, truthEv: truth.ev.slice() });
  G.history.push({ round: G.round, ev: truth.ev.slice(), pv: truth.pvShare.slice() });
  return poll;
}

/* --- election night ----------------------------------------------------- */

function runElection(G) {
  const res = finalTally(G, G.rng, 0.028);
  const n = G.candidates.length;

  let winner = 0;
  for (let k = 1; k < n; k++) if (res.ev[k] > res.ev[winner]) winner = k;
  const needed = 270;
  const contingent = res.ev[winner] < needed;

  // Reveal order: safe states first, tossups last, for the drama.
  const order = STATE_IDS.slice().sort((a, b) => res.byState[b].margin - res.byState[a].margin);

  let pvWinner = 0;
  for (let k = 1; k < n; k++) if (res.pv[k] > res.pv[pvWinner]) pvWinner = k;

  G.final = { res, winner, contingent, order, pvWinner, needed,
              splitDecision: pvWinner !== winner };
  G.phase = 'results';
  return G.final;
}

/* --- helpers used by the UI -------------------------------------------- */

function cheapestAction(G, cand) {
  let m = Infinity;
  for (const a of ACTIONS) { if (a.gated) continue; if (a.cost < m) m = a.cost; }
  return m;
}

function actionCost(actionId, intensity) {
  return ACTION_BY_ID[actionId].cost * intensity;
}

/* National share of each demographic bucket, for the crosstab panel. */
function demoTotals(result) {
  const out = { age: {}, gender: {} };
  for (const a of AGES) {
    const row = result.cross.age[a];
    const tot = row.reduce((x, y) => x + y, 0) || 1;
    out.age[a] = { shares: row.map(v => v / tot), total: tot };
  }
  for (const g of GENDERS) {
    const row = result.cross.gender[g];
    const tot = row.reduce((x, y) => x + y, 0) || 1;
    out.gender[g] = { shares: row.map(v => v / tot), total: tot };
  }
  return out;
}

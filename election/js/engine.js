/* ==========================================================================
   engine.js: deterministic RNG, world generation, voter model, simulation
   ========================================================================== */

/* ---------- deterministic RNG (mulberry32 over an xmur3 seed) ---------- */
function hashSeed(str) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return (h ^ (h >>> 16)) >>> 0;
}

function makeRNG(seed) {
  let a = typeof seed === 'number' ? seed >>> 0 : hashSeed(String(seed));
  const next = () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const rng = {
    float: next,
    range: (lo, hi) => lo + next() * (hi - lo),
    int: (n) => Math.floor(next() * n),
    pick: (arr) => arr[Math.floor(next() * arr.length)],
    chance: (p) => next() < p,
    gauss(mu = 0, sd = 1) {
      // Box-Muller
      let u = 0, v = 0;
      while (u === 0) u = next();
      while (v === 0) v = next();
      return mu + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    },
    shuffle(arr) {
      const a2 = arr.slice();
      for (let i = a2.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1));
        [a2[i], a2[j]] = [a2[j], a2[i]];
      }
      return a2;
    },
    sample(arr, n) { return rng.shuffle(arr).slice(0, n); }
  };
  return rng;
}

const clamp = (v, lo, hi) => v < lo ? lo : v > hi ? hi : v;
const round1 = (v) => Math.round(v * 10) / 10;

/* ==========================================================================
   WORLD GENERATION
   ========================================================================== */

/* Pick five topics and give every state / age / gender a stance on each one.
   A stance is a real number in [-3, +3]. */
function generateTopics(rng) {
  const chosen = rng.sample(TOPIC_POOL, 5);
  return chosen.map((t) => {
    // Per-game jitter so the same topic is not identical every election.
    const partisan = t.partisan * rng.range(0.75, 1.25);
    const agev     = t.agev     * rng.range(0.7, 1.3);
    const genderv  = t.genderv  * rng.range(0.7, 1.3);
    const base     = t.base + rng.gauss(0, 0.45);

    const topic = { ...t, partisan, agev, genderv, base,
                    stateStance: {}, ageStance: {}, genderStance: {} };

    // States: partisan lean drives the stance, with local idiosyncrasy on top.
    for (const ab of STATE_IDS) {
      const st = STATES[ab];
      const v = base + partisan * st.lean * 4.1 + rng.gauss(0, 0.45);
      topic.stateStance[ab] = clamp(v, -3, 3);
    }
    // Age buckets: young = +1 on the age axis, old = -1.
    const ageAxis = { young: 1, middle: 0, old: -1 };
    for (const a of AGES) {
      const v = base + agev * ageAxis[a] * 2.4 + rng.gauss(0, 0.4);
      topic.ageStance[a] = clamp(v, -3, 3);
    }
    // Gender: women +1, nonbinary +1.6 (further along the same axis), men -1.
    const genderAxis = { male: -1, female: 1, nonbinary: 1.6 };
    for (const g of GENDERS) {
      const v = base + genderv * genderAxis[g] * 1.9 + rng.gauss(0, 0.4);
      topic.genderStance[g] = clamp(v, -3, 3);
    }

    /* Recentre the topic on the national electorate.

       Without this step almost every issue polls net-positive (people like
       free things), the median voter sits well away from zero on all five
       axes, and whichever candidate happens to be nearer that point sweeps
       fifty states. Recentring expresses each stance RELATIVE to the average
       American voter, keeping only a small residual national tilt, so the
       geography of the map is driven by how states differ from each other. */
    const tilt = base * 0.26;                     // residual "this idea is popular" signal
    const mean = nationalMean(topic);
    const shift = 3 * (tilt - mean);
    for (const ab of STATE_IDS) topic.stateStance[ab] = clamp(topic.stateStance[ab] + shift, -3.6, 3.6);
    topic.nationalTilt = tilt;
    return topic;
  });
}

/* Population-weighted mean position of the electorate on a topic, using the
   national demographic baseline. Voter position is the mean of three stances,
   so the national mean is the mean of the three component means. */
function nationalMean(topic) {
  let popTotal = 0, stateSum = 0;
  for (const ab of STATE_IDS) { popTotal += STATES[ab].pop; stateSum += topic.stateStance[ab] * STATES[ab].pop; }
  const sMean = stateSum / popTotal;
  let aMean = 0; for (const a of AGES)    aMean += topic.ageStance[a]    * AGE_BASE[a];
  let gMean = 0; for (const g of GENDERS) gMean += topic.genderStance[g] * GENDER_BASE[g];
  return (sMean + aMean + gMean) / 3;
}

/* Demographic mix for a state: age skewed by the state's ageSkew, gender
   near-national with mild variation. Returns fractions summing to 1. */
function stateDemographics(rng, ab) {
  const skew = STATES[ab].ageSkew;
  let young  = AGE_BASE.young  - skew * 0.11 + rng.gauss(0, 0.015);
  let old    = AGE_BASE.old    + skew * 0.10 + rng.gauss(0, 0.015);
  young = clamp(young, 0.13, 0.46);
  old   = clamp(old,   0.09, 0.40);
  let middle = 1 - young - old;
  if (middle < 0.25) { const need = 0.25 - middle; young -= need * 0.5; old -= need * 0.5; middle = 0.25; }

  let female = clamp(GENDER_BASE.female + rng.gauss(0, 0.012), 0.46, 0.55);
  let nb     = clamp(GENDER_BASE.nonbinary * rng.range(0.5, 2.2) - skew * 0.004, 0.002, 0.035);
  let male   = 1 - female - nb;

  return { age: { young, middle, old }, gender: { male, female, nonbinary: nb } };
}

/* Build 100 synthetic voters for a state by quota-filling the demographic mix,
   then computing each voter's position on each topic. */
function buildStateVoters(rng, ab, topics, nCand, indivSd) {
  const demo = stateDemographics(rng, ab);

  // Largest-remainder quota fill so the 100 voters match the percentages.
  const quota = (mix, keys) => {
    const raw = keys.map(k => mix[k] * 100);
    const base = raw.map(Math.floor);
    let left = 100 - base.reduce((a, b) => a + b, 0);
    const order = keys.map((k, i) => i).sort((x, y) => (raw[y] - base[y]) - (raw[x] - base[x]));
    for (let i = 0; i < left; i++) base[order[i % order.length]]++;
    const out = [];
    keys.forEach((k, i) => { for (let j = 0; j < base[i]; j++) out.push(k); });
    return out;
  };

  const ageList    = rng.shuffle(quota(demo.age, AGES));
  const genderList = rng.shuffle(quota(demo.gender, GENDERS));

  const voters = [];
  for (let i = 0; i < 100; i++) {
    const age = ageList[i], gender = genderList[i];
    const tvec = topics.map((t) => {
      // A voter's position is the mean of their state, age and gender stances.
      let v = (t.stateStance[ab] + t.ageStance[age] + t.genderStance[gender]) / 3;
      if (indivSd > 0) v += rng.gauss(0, indivSd);   // personal idiosyncrasy
      return clamp(v, -3, 3);
    });
    voters.push({
      age, gender,
      t: tvec,
      bias: new Array(nCand).fill(0),
      eps: Array.from({ length: nCand }, () => rng.gauss(0, 0.004))  // tiebreak grain
    });
  }
  return { demo, voters };
}

/* ==========================================================================
   VOTING
   Voter vector  = [ topic positions (5) , candidate biases (N) ]
   Candidate k   = [ their stances    (5) , +3 at k, -3 elsewhere ]
   The voter picks whichever candidate gives the highest cosine similarity.
   ========================================================================== */
function candidateVector(cand, k, nCand) {
  const v = cand.stances.slice();
  for (let j = 0; j < nCand; j++) v.push(j === k ? 3 : -3);
  return v;
}

function precomputeCandidateVectors(candidates) {
  const n = candidates.length;
  return candidates.map((c, k) => {
    const v = candidateVector(c, k, n);
    let s = 0; for (const x of v) s += x * x;
    return { v, norm: Math.sqrt(s) || 1e-9 };
  });
}

function voteFor(voter, cvecs) {
  const n = voter.bias.length;
  const nt = voter.t.length;
  let vnorm = 0;
  for (let i = 0; i < nt; i++) vnorm += voter.t[i] * voter.t[i];
  for (let i = 0; i < n; i++) vnorm += voter.bias[i] * voter.bias[i];
  vnorm = Math.sqrt(vnorm) || 1e-9;

  let best = -Infinity, bestK = 0;
  for (let k = 0; k < n; k++) {
    const cv = cvecs[k];
    let dot = 0;
    for (let i = 0; i < nt; i++) dot += voter.t[i] * cv.v[i];
    for (let i = 0; i < n; i++) dot += voter.bias[i] * cv.v[nt + i];
    const cos = dot / (vnorm * cv.norm) + voter.eps[k];
    if (cos > best) { best = cos; bestK = k; }
  }
  return bestK;
}

/* Full national simulation. Returns per-state counts, EV totals, popular vote
   and a demographic crosstab. */
function simulate(G) {
  const cands = G.candidates;
  const n = cands.length;
  const cvecs = precomputeCandidateVectors(cands);

  const byState = {};
  const ev = new Array(n).fill(0);
  const pv = new Array(n).fill(0);
  let pvTotal = 0;

  // crosstabs[dimension][bucket][candidate] = weighted voters
  const cross = {
    age:    Object.fromEntries(AGES.map(a => [a, new Array(n).fill(0)])),
    gender: Object.fromEntries(GENDERS.map(g => [g, new Array(n).fill(0)]))
  };

  for (const ab of STATE_IDS) {
    const S = G.states[ab];
    const counts = new Array(n).fill(0);
    const stCross = {
      age:    Object.fromEntries(AGES.map(a => [a, new Array(n).fill(0)])),
      gender: Object.fromEntries(GENDERS.map(g => [g, new Array(n).fill(0)]))
    };
    for (const voter of S.voters) {
      const k = voteFor(voter, cvecs);
      counts[k]++;
      stCross.age[voter.age][k]++;
      stCross.gender[voter.gender][k]++;
    }
    const w = STATES[ab].pop / 100;          // each synthetic voter stands for pop/100 million
    for (let k = 0; k < n; k++) {
      pv[k] += counts[k] * w;
      cross.age.young[k]  += stCross.age.young[k]  * w;
      cross.age.middle[k] += stCross.age.middle[k] * w;
      cross.age.old[k]    += stCross.age.old[k]    * w;
      cross.gender.male[k]      += stCross.gender.male[k]      * w;
      cross.gender.female[k]    += stCross.gender.female[k]    * w;
      cross.gender.nonbinary[k] += stCross.gender.nonbinary[k] * w;
    }
    pvTotal += 100 * w;

    // Winner-take-all. Ties resolved by a fixed per-state ordering drawn at
    // world generation, so the same board always yields the same answer.
    let winner = -1, top = -1;
    for (const k of S.tiebreak) {
      if (counts[k] > top) { top = counts[k]; winner = k; }
    }
    const sorted = counts.map((c, k) => ({ c, k })).sort((a, b) => b.c - a.c);
    const margin = sorted[0].c - (sorted[1] ? sorted[1].c : 0);
    byState[ab] = { counts, winner, margin, cross: stCross };
    ev[winner] += STATES[ab].ev;
  }

  return { byState, ev, pv, pvTotal, cross,
           pvShare: pv.map(v => pvTotal ? v / pvTotal : 0) };
}

/* A poll is the truth plus sampling error. State polls are noisier than the
   national number because the samples are smaller. */
function pollFrom(result, rng, sd) {
  const n = result.ev.length;
  const noisy = (shares, s) => {
    const raw = shares.map(v => Math.max(0.0005, v + rng.gauss(0, s)));
    const tot = raw.reduce((a, b) => a + b, 0);
    return raw.map(v => v / tot);
  };
  const byState = {};
  const ev = new Array(n).fill(0);
  for (const ab of STATE_IDS) {
    const shares = result.byState[ab].counts.map(c => c / 100);
    const p = noisy(shares, sd * 2.1);      // state samples are much smaller
    let winner = 0;
    for (let k = 1; k < n; k++) if (p[k] > p[winner]) winner = k;
    const sorted = p.slice().sort((a, b) => b - a);
    byState[ab] = { shares: p, winner, margin: sorted[0] - (sorted[1] || 0) };
    ev[winner] += STATES[ab].ev;
  }
  const nat = noisy(result.pvShare, sd);
  return { byState, ev, nat, moe: Math.round(sd * 1.96 * 1000) / 10 };
}

/* Election night: nudge each state's counts by a little turnout noise, then
   award the electoral votes on the jittered numbers. */
function finalTally(G, rng, jitter) {
  const truth = simulate(G);
  const n = G.candidates.length;
  const byState = {};
  const ev = new Array(n).fill(0);
  const pv = new Array(n).fill(0);
  let pvTotal = 0;

  for (const ab of STATE_IDS) {
    const base = truth.byState[ab].counts;
    const raw = base.map(c => Math.max(0, c + rng.gauss(0, jitter * 100)));
    const tot = raw.reduce((a, b) => a + b, 0) || 1;
    const counts = raw.map(v => (v / tot) * 100);
    let winner = -1, top = -1;
    for (const k of G.states[ab].tiebreak) if (counts[k] > top) { top = counts[k]; winner = k; }
    const sorted = counts.slice().sort((a, b) => b - a);
    byState[ab] = { counts, winner, margin: (sorted[0] - (sorted[1] || 0)) / 100,
                    shares: counts.map(c => c / 100), cross: truth.byState[ab].cross };
    ev[winner] += STATES[ab].ev;
    const w = STATES[ab].pop / 100;
    for (let k = 0; k < n; k++) pv[k] += counts[k] * w;
    pvTotal += 100 * w;
  }
  return { byState, ev, pv, pvTotal, pvShare: pv.map(v => v / pvTotal), cross: truth.cross, truth };
}

/* ==========================================================================
   CAMPAIGN EFFECTS
   ========================================================================== */

/* How strongly a given action touches a given voter. */
function reachWeight(action, voter, focus) {
  let w = 1;
  if (action.ageWeight)    w *= action.ageWeight[voter.age];
  if (action.genderWeight) w *= action.genderWeight[voter.gender];
  if (focus) {
    if (focus.age    && focus.age    !== voter.age)    w *= 0.18;
    if (focus.gender && focus.gender !== voter.gender) w *= 0.18;
    if (focus.age    && focus.age    === voter.age)    w *= 1.85;
    if (focus.gender && focus.gender === voter.gender) w *= 1.85;
  }
  return w;
}

/* Apply a bias push. Returns the average signed movement actually delivered,
   which is what the result copy is written from. */
/* Global calibration of how much one dollar of campaigning is worth. Tuned so
   that a single standard buy in one state moves it a couple of points, and a
   whole campaign can decide a close state but cannot save a hopeless one. */
let BIAS_SCALE = 0.034;
let BIAS_CAP = 1.15;

function pushBias(G, opts) {
  const { action, statesList, focus, targetIdx, sign, magnitude, spillMag } = opts;
  const inSet = new Set(statesList);
  let sum = 0, wsum = 0;

  for (const ab of STATE_IDS) {
    const primary = inSet.has(ab);
    const mag = primary ? magnitude : spillMag;
    if (!mag) continue;
    for (const voter of G.states[ab].voters) {
      const w = reachWeight(action, voter, focus);
      if (w <= 0) continue;
      const d = sign * mag * w * BIAS_SCALE;
      voter.bias[targetIdx] = clamp(voter.bias[targetIdx] + d, -BIAS_CAP, BIAS_CAP);
      // Weight the reported movement by reach, so a buy narrowed to one group
      // is described by what it did to THAT group rather than diluted across
      // the four fifths of the state it deliberately ignored.
      if (primary) { sum += d * w; wsum += w; }
    }
  }
  return wsum ? sum / wsum : 0;
}

/* Thresholds are set from the measured distribution of delivered movement at
   the current BIAS_SCALE, roughly the 95th, 75th, 50th and 25th percentiles
   of a successful buy. Retune these whenever BIAS_SCALE moves, or every
   result will read as "essentially nothing". */
const MOVE_WORDS = [
  { min: 0.090,  word: 'a decisive surge',      cls: 'huge' },
  { min: 0.048,  word: 'a strong move',         cls: 'strong' },
  { min: 0.027,  word: 'a solid gain',          cls: 'solid' },
  { min: 0.011,  word: 'a modest bump',         cls: 'modest' },
  { min: -0.006, word: 'essentially nothing',   cls: 'flat' },
  { min: -0.030, word: 'a small setback',       cls: 'bad' },
  { min: -999,   word: 'a real backfire',       cls: 'awful' }
];
function moveWord(v) { return MOVE_WORDS.find(m => v >= m.min) || MOVE_WORDS[MOVE_WORDS.length - 1]; }

/* Diminishing returns: every repeat of the same action on the same target
   multiplies the effect by the action's decay factor. */
function decayFor(cand, key, action) {
  const uses = cand.uses[key] || 0;
  return Math.pow(action.decay, uses);
}
function noteUse(cand, key) { cand.uses[key] = (cand.uses[key] || 0) + 1; }

/* Execute one campaign action. Mutates G, returns a report object. */
function runAction(G, ci, spec) {
  const cand = G.candidates[ci];
  const action = ACTION_BY_ID[spec.actionId];
  const rng = G.rng;
  const intensity = spec.intensity || 1;
  const cost = action.cost * intensity;

  if (cost > cand.cash + 1e-9) return { ok: false, msg: 'Not enough funds.' };
  cand.cash -= cost;

  const rep = { ok: true, ci, actionId: action.id, cost, intensity, headlines: [], move: 0, cls: 'flat' };
  const charisma = cand.traits.charisma;                    // 0.75 .. 1.3
  const disciplineBonus = 1 - cand.traits.discipline * 0.5; // reduces backfire odds

  /* ---- corporate money ---- */
  if (action.id === 'corp') {
    const corp = spec.corp;
    cand.corp = corp;
    if (G.corpTaken) G.corpTaken.add(corp.name);
    G.corpOffers[ci] = [];
    cand.cash += corp.cash;
    rep.cash = corp.cash;
    rep.cls = 'solid';
    // The check is huge; the association costs you with the young and with women.
    const m = pushBias(G, {
      action: { ageWeight: { young: 1.7, middle: 1.0, old: 0.55 }, genderWeight: { male: 0.85, female: 1.2, nonbinary: 1.6 } },
      statesList: STATE_IDS, focus: null, targetIdx: ci, sign: -1, magnitude: 0.15, spillMag: 0
    });
    rep.move = m;
    rep.headlines.push(`${corp.name} wires $${corp.cash}M to the ${cand.name} campaign. The filing is public within the hour.`);
    return rep;
  }

  /* ---- policy change ---- */
  if (action.id === 'policy') {
    const ti = spec.topicIndex, dir = spec.direction;
    const old = cand.stances[ti];
    const nv = clamp(old + dir, -3, 3);
    if (nv === old) { cand.cash += cost; return { ok: false, msg: 'That stance is already at the limit.' }; }
    cand.stances[ti] = nv;
    cand.flips++;
    const topic = G.topics[ti];
    const key = 'policy|' + ti;
    const d = decayFor(cand, key, action);
    noteUse(cand, key);
    // Flip-flop cost grows with the number of times you have done this.
    const penalty = 0.055 * cand.flips * (2 - d) * (rng.chance(action.backfire) ? 2.1 : 1);
    const m = pushBias(G, {
      action: { ageWeight: { young: 1.0, middle: 1.1, old: 1.2 }, genderWeight: { male: 1, female: 1, nonbinary: 1 } },
      statesList: STATE_IDS, focus: null, targetIdx: ci, sign: -1, magnitude: penalty, spillMag: 0
    });
    rep.move = m;
    rep.cls = 'modest';
    rep.policy = { ti, old, nv };
    rep.headlines.push(`${cand.name} now scores ${nv > 0 ? '+' : ''}${nv} on ${topic.name}, a step ${dir > 0 ? 'toward "' + topic.pro + '"' : 'toward "' + topic.con + '"'}. ${cand.flips > 1 ? 'The word "flip-flop" appears in ' + cand.flips + ' separate columns.' : 'One columnist calls it "an evolution."'}`);
    return rep;
  }

  /* ---- celebrity ---- */
  if (action.id === 'celeb') {
    const pool = CELEBRITIES.filter(c => !G.usedCelebs.has(c.name));
    if (!pool.length) { cand.cash += cost; return { ok: false, msg: 'Every celebrity in America is already spoken for.' }; }
    const celeb = spec.celeb && pool.includes(spec.celeb) ? spec.celeb : rng.pick(pool);
    G.usedCelebs.add(celeb.name);
    const key = 'celeb';
    const d = decayFor(cand, key, action);
    noteUse(cand, key);

    const aw = { young: 0.6, middle: 0.6, old: 0.6 }; aw[celeb.age] = celeb.mult;
    const gw = { male: 0.85, female: 0.85, nonbinary: 0.85 };
    if (celeb.gender) gw[celeb.gender] = celeb.mult * 0.85; else { gw.male = gw.female = gw.nonbinary = 1.0; }

    const back = rng.chance(action.backfire * disciplineBonus);
    let mag = Math.abs(rng.gauss(action.power * Math.pow(intensity, 0.75) * charisma * d, action.noise * intensity));
    if (back) mag = -mag * 0.75;
    const m = pushBias(G, { action: { ageWeight: aw, genderWeight: gw }, statesList: STATE_IDS,
      focus: null, targetIdx: ci, sign: 1, magnitude: mag, spillMag: 0 });
    rep.move = m; rep.cls = moveWord(m).cls;
    rep.headlines.push(back
      ? `${celeb.name}, ${celeb.desc}, endorses ${cand.name} and then spends nine minutes explaining a previous statement. The clip travels further than the endorsement.`
      : `${celeb.name}, ${celeb.desc}, endorses ${cand.name}. ${AGE_SHORT[celeb.age]} voters ${m > 0.25 ? 'lose it' : 'notice'}.`);
    return rep;
  }

  /* ---- opposition research ---- */
  if (action.id === 'oppo') {
    const ti = spec.targetIdx;
    const key = 'oppo|' + ti;
    const d = decayFor(cand, key, action);
    noteUse(cand, key);
    const back = rng.chance(action.backfire * disciplineBonus);
    let mag = Math.abs(rng.gauss(action.power * Math.pow(intensity, 0.75) * charisma * d, action.noise * intensity));
    const target = G.candidates[ti];
    if (back) {
      const m = pushBias(G, { action: { ageWeight:{young:1.1,middle:1,old:1}, genderWeight:{male:1,female:1.15,nonbinary:1.1} },
        statesList: STATE_IDS, focus: null, targetIdx: ci, sign: -1, magnitude: mag * 0.8, spillMag: 0 });
      rep.move = m; rep.cls = 'awful';
      rep.headlines.push(`The ${target.name} file leaks with ${cand.name}'s fingerprints on it. The story becomes the leak, not the file.`);
      return rep;
    }
    const m = pushBias(G, { action: { ageWeight:{young:1,middle:1.1,old:1.15}, genderWeight:{male:1,female:1,nonbinary:1} },
      statesList: STATE_IDS, focus: null, targetIdx: ti, sign: -1, magnitude: mag, spillMag: 0 });
    rep.move = -m; rep.cls = moveWord(-m).cls; rep.against = ti;
    rep.headlines.push(`A ${rng.pick(['1998 deposition','deleted blog','county zoning filing','leaked group chat','old campus newspaper column'])} surfaces about ${target.name}. ${cand.name}'s campaign says it had "no involvement."`);
    return rep;
  }

  /* ---- geographic ad / ground actions ---- */
  const statesList = spec.states && spec.states.length ? spec.states : [spec.state];
  const focus = (spec.focusAge || spec.focusGender)
    ? { age: spec.focusAge || null, gender: spec.focusGender || null } : null;
  const attack = spec.mode === 'anti';
  const targetIdx = attack ? spec.targetIdx : ci;

  // Splitting a visit across several states dilutes each stop.
  const spread = Math.pow(statesList.length, 0.62);
  const key = [action.id, statesList.slice().sort().join('+'),
               focus ? (focus.age || '*') + '/' + (focus.gender || '*') : '*',
               attack ? 'anti' + targetIdx : 'pro'].join('|');
  const d = decayFor(cand, key, action);
  noteUse(cand, key);

  const back = rng.chance(action.backfire * disciplineBonus * (attack ? 1.25 : 1));
  let mag = rng.gauss(action.power * Math.pow(intensity, 0.75) * charisma * d / spread,
                      action.noise * intensity);
  mag = Math.abs(mag);
  if (back) mag = -mag * 0.8;

  const spillMag = mag * (action.spill || 0);
  const m = pushBias(G, { action, statesList, focus, targetIdx,
                          sign: attack ? -1 : 1, magnitude: mag, spillMag });

  rep.move = attack ? -m : m;
  rep.cls = moveWord(rep.move).cls;
  rep.states = statesList;
  if (attack) rep.against = targetIdx;

  const where = statesList.length === 1 ? STATES[statesList[0]].name
              : statesList.length + ' states';
  const who = focus ? [focus.age ? AGE_SHORT[focus.age].toLowerCase() : null,
                       focus.gender ? GENDER_LABEL[focus.gender].toLowerCase() : null]
                      .filter(Boolean).join(' ') : null;
  rep.headlines.push(flavourFor(G, action, cand, {
    where, who, attack, target: attack ? G.candidates[targetIdx] : null, back, move: rep.move, intensity
  }));
  return rep;
}

/* Result copy. The wording alludes to the size of the movement without ever
   printing the raw number. The player has to read the room. */
function flavourFor(G, action, cand, ctx) {
  const rng = G.rng;
  const w = moveWord(ctx.move).word;
  const aud = ctx.who ? ` aimed at ${ctx.who} voters` : '';
  const T = {
    tv: ctx.attack
      ? `A 30-second spot against ${ctx.target.name} saturates ${ctx.where}${aud}. ${ctx.back ? 'Local anchors call it "a low blow" on air, and it turns into ' + w + ' for you.' : 'Focus groups call it "devastating." Overnight tracking shows ' + w + '.'}`
      : `Broadcast buy across ${ctx.where}${aud}. ${ctx.back ? 'The spot is mistimed against a beloved local broadcast and produces ' + w + '.' : 'The tag line tests well and the trackers move: ' + w + '.'}`,
    print: ctx.attack
      ? `Mailers hitting ${ctx.where}${aud} print ${ctx.target.name}'s worst quote at 48-point. ${ctx.back ? 'Two papers run corrections. ' + w[0].toUpperCase() + w.slice(1) + '.' : 'Steady, unglamorous, ' + w + '.'}`
      : `Direct mail and a full page in the ${rng.pick(['Herald','Gazette','Sentinel','Tribune','Register'])} across ${ctx.where}${aud}. ${ctx.back ? 'The photo they printed is unflattering. ' + w[0].toUpperCase() + w.slice(1) + '.' : 'Quiet and reliable: ' + w + '.'}`,
    internet: ctx.attack
      ? `An attack cut on ${ctx.target.name} is pushed hard through feeds in ${ctx.where}${aud}. ${ctx.back ? 'It gets community-noted within the hour. ' + w[0].toUpperCase() + w.slice(1) + '.' : 'It gets stitched, remixed and quote-posted into ' + w + '.'}`
      : `Short-form blitz across ${ctx.where}${aud}. ${ctx.back ? 'The agency uses a sound that is nine months stale and the comments are merciless: ' + w + '.' : 'The algorithm decides it likes you today: ' + w + '.'}`,
    visit: `${ctx.intensity > 1 ? 'A fleet of clones tours' : 'A clone of you tours'} ${ctx.where}${aud}. ${ctx.back ? 'A rope-line answer about ' + rng.pick(['the local team','a factory that closed in 2011','the price of a sandwich']) + ' plays badly on the evening news. ' + w[0].toUpperCase() + w.slice(1) + '.' : 'Rooms are full and the local coverage is warm: ' + w + '.'}`,
    ground: `Clones of you knock ${(3 + Math.round(rng.float() * 9))}0,000 doors in ${ctx.where}${aud}. ${ctx.back ? 'One of them argues with a homeowner on a doorbell camera. ' + w[0].toUpperCase() + w.slice(1) + '.' : 'Slow, cheap, and it adds up to ' + w + '.'}`
  };
  return T[action.id] || `${cand.name} campaigns in ${ctx.where}. Result: ${w}.`;
}

/* ==========================================================================
   IMPACT FORECAST
   What the campaign expects an action to do, before it is paid for. The
   numbers here are read off the same expressions runAction() uses, so the
   forecast cannot drift away from what actually happens.
   ========================================================================== */

/* Forecast adverbs are pinned to the same thresholds as MOVE_WORDS, so a
   promise of "strongly" is answered by a result reading "a strong move".
   Both are expressed in delivered-movement units. */
const MAG_WORDS = [
  { min: 0.090, word: 'very strongly' },
  { min: 0.048, word: 'strongly' },
  { min: 0.027, word: 'solidly' },
  { min: 0.011, word: 'modestly' },
  { min: -99,   word: 'slightly' }
];
const magWord = (m) => (MAG_WORDS.find(x => m >= x.min) || MAG_WORDS[MAG_WORDS.length - 1]).word;

/* The movement a push of this magnitude is expected to report. This is the same
   reach-weighted mean pushBias() computes, evaluated ahead of time. */
function expectedMove(G, action, statesList, focus, mag) {
  let sw = 0, sww = 0;
  for (const ab of statesList) {
    for (const v of G.states[ab].voters) {
      const w = reachWeight(action, v, focus);
      if (w <= 0) continue;
      sw += w; sww += w * w;
    }
  }
  return sw ? mag * BIAS_SCALE * (sww / sw) : 0;
}

/* Name the slice of the electorate an action actually lands on. */
function audienceOf(action, focus) {
  if (!action.ageWeight) {
    if (focus && focus.age) return AGE_LABEL[focus.age].toLowerCase() + ' voters';
    return 'voters generally';
  }
  const parts = [];
  if (focus && focus.age) parts.push(AGE_LABEL[focus.age].toLowerCase());
  else {
    const aw = action.ageWeight;
    const top = AGES.slice().sort((a, b) => aw[b] - aw[a]);
    if (aw[top[0]] >= aw[top[2]] * 1.6) parts.push(AGE_LABEL[top[0]].toLowerCase());
  }
  if (focus && focus.gender) parts.push(GENDER_LABEL[focus.gender].toLowerCase());
  else if (action.genderWeight) {
    const gw = action.genderWeight;
    const top = GENDERS.slice().sort((a, b) => gw[b] - gw[a]);
    if (gw[top[0]] >= gw[top[2]] * 1.5) parts.push(GENDER_LABEL[top[0]].toLowerCase());
  }
  if (!parts.length) return 'voters across the board';
  return parts.join(' ') + ' voters';
}

/* Share of a state's electorate the spend meaningfully touches. */
function reachShare(G, action, statesList, focus) {
  if (!action.ageWeight || !statesList || !statesList.length) return null;
  const ws = [];
  for (const ab of statesList) for (const v of G.states[ab].voters) ws.push(reachWeight(action, v, focus));
  if (!ws.length) return null;
  const max = Math.max(...ws);
  if (max <= 0) return null;
  // "Reached" means receiving at least half the push the best-reached voter gets.
  return ws.filter(w => w >= max * 0.5).length / ws.length;
}

function describeImpact(G, ci, spec) {
  const cand = G.candidates[ci];
  const action = ACTION_BY_ID[spec.actionId];
  const intensity = spec.intensity || 1;
  const charisma = cand.traits.charisma;
  const disciplineBonus = 1 - cand.traits.discipline * 0.5;
  const rows = [];
  let headline = '';

  const cost = action.cost * intensity;
  if (cost) rows.push({ label: 'Cost', value: '$' + cost + 'M of $' + Math.round(cand.cash) + 'M on hand' });

  /* ---- money actions ---- */
  if (action.id === 'corp') {
    const corp = spec.corp;
    if (!corp) return null;
    headline = `A cheque for <b>$${corp.cash}M</b> today, and a debt to ${esc2(corp.name)} that comes due the moment you win.`;
    rows.push({ label: 'Immediate cash', value: '$' + corp.cash + 'M, plus 10% every round' });
    rows.push({ label: 'Immediate cost', value: 'standing drops with young voters and women', warn: true });
    rows.push({ label: 'Ongoing risk', value: '28% chance per round the press connects it to you', warn: true });
    return { headline, rows };
  }

  /* ---- policy change ---- */
  if (action.id === 'policy') {
    const ti = spec.topicIndex, dir = spec.direction;
    const t = G.topics[ti];
    const nv = clamp(cand.stances[ti] + dir, -3, 3);
    const penalty = 0.055 * (cand.flips + 1);
    headline = `Moves you to <b>${nv > 0 ? '+' : ''}${nv}</b> on ${esc2(t.name)}. Closer to every voter who already ` +
               `agrees, and further from the ones who liked where you were.`;
    rows.push({ label: 'New position', value: (nv > 0 ? '+' : '') + nv + ' · ' + (dir > 0 ? t.pro : t.con) });
    rows.push({ label: 'Flip-flop cost', value: 'about ' + (penalty * 100).toFixed(1) + ' bias points nationwide', warn: true });
    rows.push({ label: 'Times you have moved', value: String(cand.flips) + (cand.flips >= 2 ? ', and the press has noticed' : '') });
    return { headline, rows };
  }

  /* ---- celebrity ---- */
  if (action.id === 'celeb') {
    const celeb = spec.celeb;
    if (!celeb) return null;
    const d = decayFor(cand, 'celeb', action);
    const raw = action.power * Math.pow(intensity, 0.75) * charisma * d;
    const aw = { young: 0.6, middle: 0.6, old: 0.6 }; aw[celeb.age] = celeb.mult;
    const gw = { male: 0.85, female: 0.85, nonbinary: 0.85 };
    if (celeb.gender) gw[celeb.gender] = celeb.mult * 0.85; else { gw.male = gw.female = gw.nonbinary = 1.0; }
    const mag = expectedMove(G, { ageWeight: aw, genderWeight: gw }, STATE_IDS, null, raw);
    const who = AGE_LABEL[celeb.age].toLowerCase() + (celeb.gender ? ' ' + GENDER_LABEL[celeb.gender].toLowerCase() : '') + ' voters';
    headline = `May <b>${magWord(mag)} increase</b> preference for you among ${who}, nationwide.`;
    rows.push({ label: 'Audience', value: who });
    rows.push({ label: 'Everyone else', value: 'mild drift away from you' });
    rows.push({ label: 'Risk', value: Math.round(action.backfire * disciplineBonus * 100) + '% chance it becomes the story', warn: true });
    return { headline, rows };
  }

  /* ---- opposition research ---- */
  if (action.id === 'oppo') {
    const ti = spec.targetIdx;
    if (ti == null) return null;
    const d = decayFor(cand, 'oppo|' + ti, action);
    const raw = action.power * Math.pow(intensity, 0.75) * charisma * d;
    const mag = expectedMove(G, { ageWeight:{young:1,middle:1.1,old:1.15}, genderWeight:{male:1,female:1,nonbinary:1} },
                             STATE_IDS, null, raw);
    headline = `May <b>${magWord(mag)} decrease</b> preference for <b>${esc2(G.candidates[ti].name)}</b> nationwide. ` +
               `It does not raise your own numbers.`;
    rows.push({ label: 'Target', value: G.candidates[ti].name });
    rows.push({ label: 'Reach', value: 'all fifty states and DC' });
    rows.push({ label: 'Risk', value: Math.round(action.backfire * disciplineBonus * 100) + '% chance it lands on you instead', warn: true });
    if (d < 0.95) rows.push({ label: 'Repeat use', value: Math.round(d * 100) + '% of full effect' });
    return { headline, rows };
  }

  /* ---- geographic ads and ground game ---- */
  const statesList = (spec.states && spec.states.length) ? spec.states : (spec.state ? [spec.state] : []);
  if (!statesList.length) return null;
  const focus = (spec.focusAge || spec.focusGender)
    ? { age: spec.focusAge || null, gender: spec.focusGender || null } : null;
  const attack = spec.mode === 'anti';
  const targetIdx = attack ? spec.targetIdx : ci;
  if (attack && targetIdx == null) return null;

  const spread = Math.pow(statesList.length, 0.62);
  const key = [action.id, statesList.slice().sort().join('+'),
               focus ? (focus.age || '*') + '/' + (focus.gender || '*') : '*',
               attack ? 'anti' + targetIdx : 'pro'].join('|');
  const d = decayFor(cand, key, action);
  const raw = action.power * Math.pow(intensity, 0.75) * charisma * d / spread;
  const mag = expectedMove(G, action, statesList, focus, raw);
  const aud = audienceOf(action, focus);
  const where = statesList.length === 1 ? STATES[statesList[0]].name : statesList.length + ' states';
  const ev = statesList.reduce((a, ab) => a + STATES[ab].ev, 0);

  headline = attack
    ? `May <b>${magWord(mag)} decrease</b> preference for <b>${esc2(G.candidates[targetIdx].name)}</b> among ${aud} in ${where}.`
    : `May <b>${magWord(mag)} increase</b> preference for you among ${aud} in ${where}.`;

  rows.push({ label: 'Electoral votes at stake', value: String(ev) });
  const share = reachShare(G, action, statesList, focus);
  if (share != null) rows.push({ label: 'Electorate reached', value: Math.round(share * 100) + '% of those states' });
  if (statesList.length > 1) {
    rows.push({ label: 'Split across stops', value: Math.round(100 / spread) + '% of full force each', warn: true });
  }
  const uses = cand.uses[key] || 0;
  if (uses > 0) {
    rows.push({ label: 'Repeat here', value: 'buy #' + (uses + 1) + ', ' + Math.round(d * 100) + '% of full effect', warn: d < 0.6 });
  }
  if (action.spill) rows.push({ label: 'National spillover', value: Math.round(action.spill * 100) + '% bleeds everywhere' });
  const bf = action.backfire * disciplineBonus * (attack ? 1.25 : 1);
  rows.push({ label: 'Risk of backfire', value: Math.round(bf * 100) + '%', warn: bf > 0.12 });
  return { headline, rows };
}

/* Local escape so the engine can build display strings without the UI. */
function esc2(x) { return String(x).replace(/[&<>"]/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' }[c])); }

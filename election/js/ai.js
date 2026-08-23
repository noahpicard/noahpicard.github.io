/* ==========================================================================
   ai.js — computer-controlled campaigns
   ========================================================================== */

/* How valuable is each state to candidate ci right now?
   Electoral votes, weighted by how close the state is to flipping. */
function stateValues(G, ci, result) {
  const vals = [];
  for (const ab of STATE_IDS) {
    const st = result.byState[ab];
    const mine = st.counts[ci];
    let bestOther = -1;
    for (let k = 0; k < st.counts.length; k++) if (k !== ci && st.counts[k] > bestOther) bestOther = st.counts[k];
    const gap = mine - bestOther;                 // >0 means winning here
    // Peak value when the gap is small; falls away fast once it is safe or hopeless.
    const closeness = Math.exp(-Math.pow(gap / 13, 2));
    vals.push({ ab, ev: STATES[ab].ev, gap, closeness, value: STATES[ab].ev * (0.25 + closeness) });
  }
  vals.sort((a, b) => b.value - a.value);
  return vals;
}

/* Which demographic slice is this candidate leaving on the table? */
function weakestDemo(G, ci, result) {
  let bestAge = null, bestAgeScore = Infinity;
  for (const a of AGES) {
    const row = result.cross.age[a];
    const tot = row.reduce((x, y) => x + y, 0) || 1;
    const share = row[ci] / tot;
    const size = tot;
    const score = share - size * 0.000002;         // prefer big groups where you're weak
    if (score < bestAgeScore) { bestAgeScore = score; bestAge = a; }
  }
  let bestGen = null, bestGenScore = Infinity;
  for (const g of GENDERS) {
    const row = result.cross.gender[g];
    const tot = row.reduce((x, y) => x + y, 0) || 1;
    if (tot < 1) continue;
    const share = row[ci] / tot;
    if (g === 'nonbinary') continue;               // too small to be worth a targeted buy
    if (share < bestGenScore) { bestGenScore = share; bestGen = g; }
  }
  return { age: bestAge, gender: bestGen };
}

/* The strongest rival, by electoral votes. */
function leadRival(G, ci, result) {
  let best = -1, bestEv = -Infinity;
  for (let k = 0; k < G.candidates.length; k++) {
    if (k === ci) continue;
    if (result.ev[k] > bestEv) { bestEv = result.ev[k]; best = k; }
  }
  return best;
}

/* Run one AI candidate's full round. Returns the list of action reports. */
function aiTakeTurn(G, ci) {
  const cand = G.candidates[ci];
  const rng = G.rng;
  const persona = cand.persona;
  const reports = [];
  let guard = 0;

  while (guard++ < 11) {
    const result = simulate(G);
    const myEv = result.ev[ci];
    const rival = leadRival(G, ci, result);
    const behind = result.ev[rival] - myEv;
    const desperate = behind > 90;
    const broke = cand.cash < 18;

    /* --- take the corporate cheque? Decided once, not re-rolled every buy. --- */
    if (G.settings.fundingMode === 'corporate' && !cand.corpDecided &&
        G.corpOffers[ci] && G.corpOffers[ci].length) {
      cand.corpDecided = true;
      const want = persona.corpTaste * 0.8 + (broke ? 0.18 : 0) + (desperate ? 0.15 : 0);
      if (rng.chance(want)) {
        const corp = rng.pick(G.corpOffers[ci]);
        const r = runAction(G, ci, { actionId: 'corp', corp });
        if (r.ok) { reports.push(r); G.corpOffers[ci] = []; continue; }
      }
    }

    /* --- build a weighted menu of affordable actions --- */
    const menu = [];
    for (const a of ACTIONS) {
      if (a.gated) continue;
      if (a.cost > cand.cash) continue;
      let w = persona.weights[a.id] || 0.5;
      if (a.id === 'vip') w *= broke ? 3.2 : 0.5;
      if (a.id === 'oppo') w *= (desperate ? 1.9 : 1) * (0.5 + persona.aggression);
      if (a.id === 'policy') w *= desperate ? 1.7 : 0.8;
      if (a.id === 'celeb' && CELEBRITIES.every(c => G.usedCelebs.has(c.name))) w = 0;
      if (a.id === 'debate' && G.round >= G.settings.rounds) w *= 0.2;
      // Late in the race, buy reach rather than infrastructure.
      if (G.round >= G.settings.rounds - 1 && (a.id === 'ground')) w *= 0.7;
      if (w > 0) menu.push({ a, w });
    }
    if (!menu.length) break;

    const total = menu.reduce((s, m) => s + m.w, 0);
    let roll = rng.float() * total, choice = menu[0];
    for (const m of menu) { roll -= m.w; if (roll <= 0) { choice = m; break; } }
    const action = choice.a;

    /* --- intensity: spend harder when rich, and always in the last round --- */
    let intensity = 1;
    const affordable = Math.floor(cand.cash / action.cost);
    if (affordable >= 3 && (cand.cash > 70 || G.round >= G.settings.rounds)) intensity = 3;
    else if (affordable >= 2 && cand.cash > 40) intensity = 2;
    intensity = Math.min(intensity, Math.max(1, affordable));

    const spec = { actionId: action.id, intensity };
    const vals = stateValues(G, ci, result);
    const weak = weakestDemo(G, ci, result);

    if (action.targeting === 'state') {
      // Pick from the top handful of contested states, with a little randomness.
      const pool = vals.slice(0, 8);
      spec.state = rng.pick(pool).ab;
      if (rng.chance(0.55)) { if (rng.chance(0.6)) spec.focusAge = weak.age; else spec.focusGender = weak.gender; }
      if (action.canAttack && rng.chance(persona.aggression * 0.45)) {
        spec.mode = 'anti'; spec.targetIdx = rival;
      }
    } else if (action.targeting === 'multi-state') {
      const nStops = 1 + rng.int(Math.min(3, 1 + Math.floor(cand.cash / 40)));
      spec.states = vals.slice(0, 6 + nStops).slice(0, nStops).map(v => v.ab);
      if (rng.chance(0.35)) spec.focusAge = weak.age;
    } else if (action.targeting === 'opponent-national') {
      spec.targetIdx = rival;
    } else if (action.targeting === 'topic') {
      // Move the stance that is furthest from the electorate in contested states.
      const swing = vals.slice(0, 12).map(v => v.ab);
      let bestI = 0, bestGain = -Infinity, bestDir = 1;
      for (let i = 0; i < G.topics.length; i++) {
        let sum = 0, n = 0;
        for (const ab of swing) for (const v of G.states[ab].voters) { sum += v.t[i]; n++; }
        const mean = sum / n;
        const diff = mean - cand.stances[i];
        if (Math.abs(diff) > bestGain) { bestGain = Math.abs(diff); bestI = i; bestDir = diff > 0 ? 1 : -1; }
      }
      if (bestGain < 0.6) { continue; }     // nothing worth flipping for; pick again
      spec.topicIndex = bestI; spec.direction = bestDir;
    }

    const r = runAction(G, ci, spec);
    if (r.ok) reports.push(r);
    if (cand.cash < 4) break;
  }

  return reports;
}

/* Give an AI candidate a starting platform: near the electorate it can win,
   nudged by its persona. */
function aiPickStances(G, ci, rng, anchorLean) {
  const cand = G.candidates[ci];
  const stances = [];
  cand.anchorLean = anchorLean;
  for (let i = 0; i < G.topics.length; i++) {
    const t = G.topics[i];
    let target = t.base + t.partisan * anchorLean * 3.0 + rng.gauss(0, 0.9);
    if (cand.persona.id === 'firebrand') target *= 1.45;       // extremists take big swings
    if (cand.persona.id === 'technocrat') target *= 0.75;      // hedgers cluster near zero
    stances.push(clamp(Math.round(target), -3, 3));
  }
  cand.stances = stances;
}

/* Spread the computer field across the spectrum instead of drawing each
   platform independently — otherwise two AIs routinely land on the same side
   of the median and the race is over before it starts. */
function spreadAnchors(rng, n) {
  if (n === 1) return [rng.range(-0.2, 0.2)];
  const step = 1.0 / (n - 1);
  const base = [];
  for (let i = 0; i < n; i++) base.push(-0.5 + i * step + rng.gauss(0, 0.07));
  return rng.shuffle(base);
}

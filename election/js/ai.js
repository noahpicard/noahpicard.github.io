/* ==========================================================================
   ai.js: computer-controlled campaigns
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
function aiTakeTurn(G, ci, maxActions) {
  const cand = G.candidates[ci];
  const rng = G.rng;
  const persona = cand.persona;
  const reports = [];
  let guard = 0;
  // maxActions lets the caller pull a single decision at a time, so opponents
  // can be played out gradually across a timed turn instead of all at once.
  const cap = Math.min(11, maxActions == null ? 11 : maxActions);

  while (guard++ < 11) {
    if (reports.length >= cap) break;
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
      if (a.id === 'oppo') w *= (desperate ? 1.9 : 1) * (0.5 + persona.aggression);
      if (a.id === 'policy') w *= desperate ? 1.7 : 0.8;
      if (a.id === 'celeb' && CELEBRITIES.every(c => G.usedCelebs.has(c.name))) w = 0;
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

/* Where the average American stands on each issue. A platform is a point
   measured out from here. */
function nationalVector(G) { return G.topics.map(t => nationalMean(t)); }

/* How the country would split between a set of platforms if the vote were held
   right now, before anyone has spent a dollar. This is the same comparison the
   ballot is decided by: a voter goes to whichever platform their own positions
   point most nearly toward. Every voter's bias block is still zero, so the
   result depends only on the platforms themselves and can be recomputed cheaply
   while they are being fitted. Sampled at every fifth voter and weighted by
   state population. */
function openingShares(G, plats) {
  const n = G.candidates.length;
  const norms = plats.map(p => {
    let s = 9 * n;                       // the identity block, the same size for everyone
    for (const x of p.stances) s += x * x;
    return Math.sqrt(s) || 1e-9;
  });
  const share = new Array(plats.length).fill(0);
  let pop = 0;

  for (const ab of STATE_IDS) {
    const voters = G.states[ab].voters;
    const local = new Array(plats.length).fill(0);
    let cnt = 0;
    for (let vi = 0; vi < voters.length; vi += 5) {
      const t = voters[vi].t;
      let best = -Infinity, bi = 0;
      for (let p = 0; p < plats.length; p++) {
        const st = plats[p].stances;
        let dot = 0;
        for (let i = 0; i < t.length; i++) dot += t[i] * st[i];
        const sc = dot / norms[p];       // the voter's own norm is shared, so it drops out
        if (sc > best) { best = sc; bi = p; }
      }
      local[bi]++; cnt++;
    }
    const w = STATES[ab].pop;
    for (let p = 0; p < plats.length; p++) share[p] += (local[p] / cnt) * w;
    pop += w;
  }
  return share.map(x => x / pop);
}

/* Draw the direction of one computer platform: its own lean, nudged by its
   persona, expressed as an offset from the average voter. */
function drawPlatform(G, cand, rng, anchorLean, nat) {
  const dev = G.topics.map((t, i) => {
    let target = t.base + t.partisan * anchorLean * 3.0 + rng.gauss(0, 0.9);
    if (cand.persona.id === 'firebrand') target *= 1.45;       // extremists take big swings
    if (cand.persona.id === 'technocrat') target *= 0.75;      // hedgers cluster near zero
    return target - nat[i];
  });
  if (dev.every(d => Math.abs(d) < 1e-6)) dev[rng.int(dev.length)] = anchorLean >= 0 ? 1 : -1;
  return dev;
}

/* Round a platform back to the whole-numbered stances the ballot carries,
   after moving it k times its own offset away from the average voter. */
function platformAt(nat, dev, k) {
  return dev.map((d, i) => clamp(Math.round(nat[i] + d * k), -3, 3));
}

/* Hand the computer field its platforms.

   Each opponent keeps a direction of its own, which is what makes them
   different from each other. What gets levelled is how far that direction is
   taken: each platform is pulled in toward the average voter or pushed out
   away from them until the computers would split the country evenly between
   themselves. Without this step one opponent routinely opens parked on the
   median while another is stranded at the edge, and the finishing order is
   settled before a dollar is spent. */
function aiPickField(G, rng, anchors) {
  const nat = nationalVector(G);
  const plats = [];
  G.candidates.forEach((cand, i) => {
    if (cand.isHuman) return;
    cand.anchorLean = anchors[i];
    const dev = drawPlatform(G, cand, rng, anchors[i], nat);
    plats.push({ cand, dev, stances: platformAt(nat, dev, 1) });
  });
  if (!plats.length) return;

  // A single computer has nobody to be levelled against, so it just takes the
  // platform it drew.
  if (plats.length > 1) {
    /* Fit one platform at a time against the rest of the field, a few times
       around, which is enough for the shares to settle. */
    const fair = 1 / plats.length;
    for (let pass = 0; pass < 3; pass++) {
      plats.forEach((p, pi) => {
        let best = null;
        for (let k = 0.1; k <= 4.0; k += 0.1) {
          p.stances = platformAt(nat, p.dev, k);
          const err = Math.abs(openingShares(G, plats)[pi] - fair);
          if (!best || err < best.err) best = { st: p.stances, err };
        }
        p.stances = best.st;
      });
    }
  }

  const shares = openingShares(G, plats);
  plats.forEach((p, i) => {
    p.cand.stances = p.stances;
    p.cand.openingShare = shares[i];
  });
}

/* Spread the computer field across the spectrum instead of drawing each
   platform independently, because otherwise two AIs routinely land on the same side
   of the median and the race is over before it starts. */
function spreadAnchors(rng, n) {
  if (n === 1) return [rng.range(-0.2, 0.2)];
  const step = 1.0 / (n - 1);
  const base = [];
  for (let i = 0; i < n; i++) base.push(-0.5 + i * step + rng.gauss(0, 0.07));
  return rng.shuffle(base);
}

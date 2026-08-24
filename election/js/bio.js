/* ==========================================================================
   bio.js — the biography analyst

   NOTE ON "AI": this game ships as static files with no backend and no API
   key, so the analyst is a local lexicon-and-heuristics model rather than a
   language model. It reads the biography for occupational signals, tone,
   specificity and self-inflicted wounds, and turns them into a starting
   favourability profile across the demographic grid. The UI says so plainly.
   ========================================================================== */

const BIO_TRAITS = [
  { id:'service',   label:'Military service',   words:['veteran','army','navy','marine','marines','air force','airforce','soldier','sergeant','captain','colonel','deployed','deployment','combat','enlisted','service member','national guard','coast guard','purple heart','tour of duty','infantry','pilot'],
    age:{young:0.85,middle:1.15,old:1.35}, gender:{male:1.3,female:0.95,nonbinary:0.7}, weight:0.9, cash:0, char:0.05, disc:0.15 },
  { id:'business',  label:'Business record',    words:['founder','ceo','entrepreneur','built a company','small business','executive','startup','start-up','investor','managed','payroll','profit','company','firm','franchise','restaurant owner','contractor','manufacturer','board of directors'],
    age:{young:0.85,middle:1.35,old:1.1}, gender:{male:1.15,female:0.95,nonbinary:0.75}, weight:0.8, cash:0.45, char:0.05, disc:0.05 },
  { id:'academic',  label:'Academic credentials',words:['professor','phd','ph.d','doctorate','researcher','university','scholar','taught','lecturer','dean','economist','scientist','physicist','historian','published','peer-reviewed','fulbright','rhodes'],
    age:{young:1.25,middle:1.05,old:0.8}, gender:{male:0.95,female:1.1,nonbinary:1.35}, weight:0.7, cash:0, char:-0.05, disc:0.2 },
  { id:'faith',     label:'Faith and community',words:['pastor','church','faith','congregation','minister','rabbi','imam','ministry','sunday','deacon','missionary','scripture','parish','bible','temple','mosque'],
    age:{young:0.6,middle:1.05,old:1.5}, gender:{male:1.05,female:1.15,nonbinary:0.45}, weight:0.75, cash:0, char:0.1, disc:0.1 },
  { id:'labor',     label:'Working-class roots',words:['union','factory','plant','shift','welder','electrician','plumber','trucker','truck driver','miner','longshore','line worker','apprentice','trade','blue collar','blue-collar','worked my way','minimum wage','waitress','waiter','janitor','mechanic','shop floor'],
    age:{young:0.95,middle:1.3,old:1.15}, gender:{male:1.2,female:1.0,nonbinary:0.85}, weight:0.95, cash:-0.1, char:0.1, disc:0.05 },
  { id:'tech',      label:'Technology background',words:['engineer','software','coder','programmer','startup','ai','artificial intelligence','silicon valley','app','platform','data','machine learning','cyber','robotics','semiconductor','open source'],
    age:{young:1.5,middle:1.05,old:0.6}, gender:{male:1.15,female:0.9,nonbinary:1.25}, weight:0.7, cash:0.4, char:0, disc:0.05 },
  { id:'celebrity', label:'Public fame',        words:['actor','actress','singer','musician','band','tv','television','host','famous','celebrity','film','movie','album','reality','podcast','influencer','million followers','platinum','grammy','oscar','emmy'],
    age:{young:1.45,middle:1.1,old:0.7}, gender:{male:1.0,female:1.05,nonbinary:1.2}, weight:0.85, cash:0.35, char:0.25, disc:-0.2 },
  { id:'law',       label:'Law and prosecution',words:['attorney','lawyer','prosecutor','district attorney','judge','justice','courtroom','litigat','law school','public defender','attorney general','sheriff','police officer','detective'],
    age:{young:0.8,middle:1.2,old:1.3}, gender:{male:1.1,female:1.05,nonbinary:0.8}, weight:0.7, cash:0.1, char:0, disc:0.25 },
  { id:'medicine',  label:'Medicine and care',  words:['doctor','physician','nurse','surgeon','paramedic','emt','hospital','clinic','pediatric','caregiver','social worker','therapist','midwife','emergency room','public health'],
    age:{young:0.95,middle:1.15,old:1.3}, gender:{male:0.9,female:1.35,nonbinary:1.05}, weight:0.9, cash:0, char:0.05, disc:0.2 },
  { id:'rural',     label:'Rural and agricultural',words:['farm','farmer','ranch','rancher','crops','harvest','cattle','tractor','rural','small town','county fair','acre','livestock','dairy','grain','hometown of'],
    age:{young:0.85,middle:1.15,old:1.25}, gender:{male:1.15,female:1.0,nonbinary:0.6}, weight:0.85, cash:-0.1, char:0.1, disc:0.1 },
  { id:'activism',  label:'Organizing and activism',words:['organizer','activist','protest','march','movement','advocate','grassroots','nonprofit','non-profit','volunteer','civil rights','mutual aid','coalition','justice','organized'],
    age:{young:1.5,middle:1.0,old:0.65}, gender:{male:0.85,female:1.25,nonbinary:1.6}, weight:0.85, cash:-0.15, char:0.1, disc:-0.05 },
  { id:'family',    label:'Family life',        words:['mother','father','mom','dad','parent','kids','children','son','daughter','grandmother','grandfather','grandkids','raised','married','wife','husband','spouse','single parent','foster'],
    age:{young:0.85,middle:1.25,old:1.25}, gender:{male:0.95,female:1.35,nonbinary:0.9}, weight:0.8, cash:0, char:0.1, disc:0.1 },
  { id:'sports',    label:'Athletics',          words:['athlete','coach','quarterback','olympic','championship','team captain','pitcher','wrestler','marathon','league','varsity','draft pick','world series','super bowl'],
    age:{young:1.25,middle:1.15,old:0.85}, gender:{male:1.3,female:0.95,nonbinary:0.7}, weight:0.75, cash:0.15, char:0.15, disc:-0.05 },
  { id:'outsider',  label:'Outsider posture',   words:['never held office','outsider','washington','drain','establishment','career politicians','fed up','broken system','tired of','they lied','shake up','burn it','rigged','corrupt'],
    age:{young:1.3,middle:1.1,old:0.85}, gender:{male:1.15,female:0.9,nonbinary:0.9}, weight:0.7, cash:0, char:0.2, disc:-0.3 },
  { id:'insider',   label:'Governing experience',words:['senator','congressman','congresswoman','governor','mayor','city council','state house','state senate','legislature','secretary of','ambassador','chief of staff','served two terms','elected'],
    age:{young:0.8,middle:1.15,old:1.35}, gender:{male:1.0,female:1.0,nonbinary:0.9}, weight:0.85, cash:0.3, char:-0.05, disc:0.3 },
  { id:'immigrant', label:'Immigrant story',    words:['immigrant','immigrated','naturalized','came to this country','refugee','first generation','first-generation','my parents came','green card','citizenship ceremony'],
    age:{young:1.25,middle:1.1,old:0.85}, gender:{male:1.0,female:1.1,nonbinary:1.15}, weight:0.85, cash:0, char:0.1, disc:0.05 }
];

/* Words that cost you. */
const BIO_RED_FLAGS = ['indicted','convicted','fraud','scandal','arrested','embezzl','impeach','disbarred','bankrupt',
                       'settled out of court','allegations','under investigation','plea deal','felony'];

/* Empty-calorie phrases the analyst discounts. */
const BIO_FILLER = ['passionate','committed to change','common sense','for the people','make a difference','proven leader',
                    'fighting for you','hard-working','vision for the future','bring people together','get things done',
                    'the american dream','our great nation','believe in'];

/* Keyword matching is word-boundary anchored, so "hardware store" no longer
   reads as medicine and "paid" no longer reads as artificial intelligence.
   Most keywords match at the START of a word only, so "farm" still catches
   "farmer" and "farming"; the genuinely ambiguous short tokens below have to
   match as whole words. */
const BIO_EXACT = new Set(['ai', 'tv', 'app', 'plant', 'band', 'draft', 'data']);
const bioRxCache = new Map();
function bioMatches(haystack, word) {
  let rx = bioRxCache.get(word);
  if (!rx) {
    const esc = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    rx = new RegExp('\\b' + esc + (BIO_EXACT.has(word) ? '\\b' : ''), 'i');
    bioRxCache.set(word, rx);
  }
  return rx.test(haystack);
}

function analyzeBio(text, rng) {
  const raw = (text || '').trim();
  const lower = ' ' + raw.toLowerCase().replace(/\s+/g, ' ') + ' ';
  const words = raw ? raw.split(/\s+/).length : 0;

  /* --- trait detection --- */
  const traits = {};
  const hits = [];
  for (const t of BIO_TRAITS) {
    let n = 0, matched = [];
    for (const w of t.words) {
      if (bioMatches(lower, w)) { n++; matched.push(w); }
    }
    if (n > 0) {
      // Saturating: the third mention of "farm" is worth much less than the first.
      const score = t.weight * (1 - Math.pow(0.55, n));
      traits[t.id] = score;
      hits.push({ trait: t, score, matched });
    }
  }
  hits.sort((a, b) => b.score - a.score);

  /* --- flags and filler --- */
  const flags = BIO_RED_FLAGS.filter(f => bioMatches(lower, f));
  const filler = BIO_FILLER.filter(f => bioMatches(lower, f));

  /* --- specificity: numbers, proper nouns, concrete years --- */
  const numbers   = (raw.match(/\b\d[\d,\.]*\b/g) || []).length;
  const propers   = (raw.match(/\b[A-Z][a-z]{2,}\b/g) || []).length;
  const specificity = clamp((numbers * 0.09 + propers * 0.035), 0, 1);

  /* --- home state detection --- */
  let homeState = null;
  for (const ab of STATE_IDS) {
    const nm = STATES[ab].name.toLowerCase();
    if (lower.includes(' ' + nm + ' ') || lower.includes(' ' + nm + ',') ||
        lower.includes(' ' + nm + '.') || lower.endsWith(' ' + nm + ' ')) { homeState = ab; break; }
  }

  /* --- length quality: 45-170 words is the sweet spot --- */
  let lengthQ;
  if (words === 0) lengthQ = 0;
  else if (words < 12) lengthQ = 0.18 + words * 0.02;
  else if (words < 45) lengthQ = 0.42 + (words - 12) * 0.0145;
  else if (words <= 170) lengthQ = 0.9 + Math.min(0.1, (words - 45) * 0.0008);
  else lengthQ = Math.max(0.55, 1 - (words - 170) * 0.0018);

  const fillerPenalty = Math.min(0.45, filler.length * 0.09);
  const flagPenalty   = Math.min(0.7, flags.length * 0.22);
  const traitTotal    = hits.reduce((a, h) => a + h.score, 0);

  /* --- headline numbers --- */
  const substance = clamp(0.30 + Math.min(0.42, traitTotal * 0.14) + specificity * 0.28
                          + lengthQ * 0.22 - fillerPenalty - flagPenalty, 0.05, 1);

  let charisma = 1.0;
  let discipline = 0.0;
  let cash = 1.0;
  for (const h of hits) {
    charisma   += h.trait.char * h.score;
    discipline += h.trait.disc * h.score;
    cash       += h.trait.cash * h.score;
  }
  charisma   = clamp(charisma + (substance - 0.5) * 0.35 + rng.gauss(0, 0.03), 0.72, 1.32);
  discipline = clamp(discipline + (substance - 0.5) * 0.3, -0.35, 0.75);
  cash       = clamp(cash + (substance - 0.5) * 0.25, 0.6, 1.75);

  /* --- demographic affinity grid: multiplicative over age x gender --- */
  const ageAff    = { young: 0, middle: 0, old: 0 };
  const genderAff = { male: 0, female: 0, nonbinary: 0 };
  for (const h of hits) {
    for (const a of AGES)    ageAff[a]    += (h.trait.age[a]    - 1) * h.score;
    for (const g of GENDERS) genderAff[g] += (h.trait.gender[g] - 1) * h.score;
  }

  /* Overall opening favourability: a national bias seed everyone shares. */
  const nationalSeed = (substance - 0.52) * 0.62;

  /* Per-demographic seed, in bias units. Kept modest — a good biography is a
     head start, not a win. */
  const seed = {};
  for (const a of AGES) for (const g of GENDERS) {
    seed[a + '|' + g] = clamp(nationalSeed + ageAff[a] * 0.30 + genderAff[g] * 0.30, -0.9, 0.9);
  }

  return {
    words, substance, charisma, discipline, warChest: cash,
    homeState, hits, flags, filler, specificity, lengthQ, nationalSeed, seed,
    ageAff, genderAff,
    narrative: writeDossier({ raw, words, substance, hits, flags, filler, homeState,
                              charisma, discipline, cash, ageAff, genderAff, specificity, rng })
  };
}

/* Compose the written analysis the player reads on the setup screen. */
function writeDossier(d) {
  const L = [];
  const pct = (v) => Math.round(v * 100);

  if (!d.words) {
    return ['<p>No biography submitted. The electorate will meet a blank rectangle with a name under it. ' +
            'Your opening favourability is flat everywhere, and every point you gain will have to be bought.</p>'].join('');
  }

  const top = d.hits.slice(0, 3);
  if (top.length) {
    L.push(`<p><strong>Read:</strong> the strongest signal in this biography is <em>${top[0].trait.label.toLowerCase()}</em>` +
      (top[1] ? `, backed by ${top[1].trait.label.toLowerCase()}${top[2] ? ` and ${top[2].trait.label.toLowerCase()}` : ''}` : '') +
      `. That is the shape of the candidate the country will see before it hears a single policy.</p>`);
  } else {
    L.push(`<p><strong>Read:</strong> nothing here attaches to a recognisable life. There is no occupation, no place, ` +
      `no fixed point for a voter to hold on to. Generic biographies poll generically.</p>`);
  }

  // Where the appeal lands
  const bestAge = AGES.slice().sort((a, b) => d.ageAff[b] - d.ageAff[a]);
  const bestGen = GENDERS.slice().sort((a, b) => d.genderAff[b] - d.genderAff[a]);
  if (Math.abs(d.ageAff[bestAge[0]] - d.ageAff[bestAge[2]]) > 0.12) {
    L.push(`<p><strong>Where it lands:</strong> this reads best to ${AGE_LABEL[bestAge[0]].toLowerCase()} voters and ` +
      `weakest to ${AGE_LABEL[bestAge[2]].toLowerCase()} voters. On the gender axis the pull is toward ` +
      `${GENDER_LABEL[bestGen[0]].toLowerCase()}.</p>`);
  } else {
    L.push(`<p><strong>Where it lands:</strong> the appeal is broad and shallow — no age group dislikes it, none of them ` +
      `are moved by it either.</p>`);
  }

  if (d.homeState) {
    L.push(`<p><strong>Geography:</strong> ${STATES[d.homeState].name} is named. Expect a home-state premium there.</p>`);
  }

  if (d.specificity > 0.45) {
    L.push(`<p><strong>Specificity:</strong> concrete — names, numbers, places. Specific biographies survive contact ` +
      `with a hostile press. This one is carrying real weight.</p>`);
  } else if (d.specificity < 0.15) {
    L.push(`<p><strong>Specificity:</strong> thin. Almost no proper nouns or figures. It will not withstand a follow-up question.</p>`);
  }

  if (d.filler.length) {
    L.push(`<p><strong>Filler detected:</strong> ${d.filler.map(f => `"${f}"`).join(', ')}. Phrases every campaign in ` +
      `history has used carry no information, and the analyst discounts them accordingly.</p>`);
  }
  if (d.flags.length) {
    L.push(`<p class="warn"><strong>Liability:</strong> the biography volunteers ${d.flags.map(f => `"${f}"`).join(', ')}. ` +
      `Honest. Expensive.</p>`);
  }

  L.push(`<p><strong>Bottom line:</strong> foundational appeal <strong>${pct(d.substance)}/100</strong>. ` +
    `Charisma multiplier <strong>${d.charisma.toFixed(2)}×</strong> on everything you spend. ` +
    `Message discipline <strong>${d.discipline >= 0.3 ? 'high' : d.discipline >= 0.1 ? 'adequate' : d.discipline >= -0.05 ? 'average' : 'poor'}</strong> ` +
    `(${d.discipline >= 0.1 ? 'fewer' : 'more'} unforced errors). ` +
    `Fundraising base <strong>${d.cash.toFixed(2)}×</strong>.</p>`);

  return L.join('');
}

/* Seed every voter's opening bias from a candidate's biography.

   Idempotent: re-analysing a biography during setup removes the previous
   seed before laying the new one down, so editing your bio does not stack
   favourability on top of itself. */
function applyBioSeed(G, ci) {
  const cand = G.candidates[ci];
  const a = cand.bioAnalysis;
  const prev = cand.seedApplied || null;
  if (!a && !prev) return;
  for (const ab of STATE_IDS) {
    const oldBoost = prev && prev.homeState === ab ? 0.45 : 0;
    const newBoost = a && a.homeState === ab ? 0.45 : 0;
    for (const voter of G.states[ab].voters) {
      const key = voter.age + '|' + voter.gender;
      const before = prev ? prev.seed[key] + oldBoost : 0;
      const after  = a ? a.seed[key] + newBoost : 0;
      voter.bias[ci] = clamp(voter.bias[ci] - before + after, -3, 3);
    }
  }
  cand.seedApplied = a ? { seed: a.seed, homeState: a.homeState } : null;
}

/* Biographies for the auto-generated opponents, so the AI field is not blank. */
const AI_BIO_TEMPLATES = [
  'Two tours with the {BR}, then twenty years running a {BUS} in {ST}. I have signed the front of a paycheck and the back of one.',
  'I taught {SUBJ} at a state university in {ST} for eighteen years, published four books nobody read, and got tired of being right in private.',
  'Third-generation farmer from {ST}. My grandfather planted these acres in 1948. I have never held office and I am not sorry about it.',
  'ER nurse for twelve years in {ST}. I have held people while they died because a form was filled out wrong. That is why I am running.',
  'I founded a software company in {ST}, sold it, and spent the next six years watching what that money could buy in this country.',
  'City council, then mayor, then two terms in the state house of {ST}. I know exactly where the bodies are buried because I filed the paperwork.',
  'My parents came here with $400 and a suitcase. I became a prosecutor in {ST} and put away people who preyed on families like mine.',
  'Union electrician out of Local 431 in {ST}. Thirty years on the tools, eight as a steward. Nobody in Washington has ever asked me anything.',
  'I hosted a television program for nine years and got recognised in every airport in {ST}. Fame is a tool. I intend to use it.',
  'Pastor of a 2,000-member congregation in {ST}, and a father of five. I have buried more of this town than any politician has met.'
];

function makeAIBio(rng, persona, stateAb) {
  const t = rng.pick(AI_BIO_TEMPLATES);
  return t
    .replace('{BR}', rng.pick(['Marine Corps', 'Army', 'Navy', 'Air Force']))
    .replace('{BUS}', rng.pick(['hardware store', 'trucking company', 'restaurant', 'machine shop', 'small manufacturer']))
    .replace('{SUBJ}', rng.pick(['constitutional law', 'economics', 'history', 'public health', 'engineering']))
    .replace(/\{ST\}/g, STATES[stateAb].name);
}

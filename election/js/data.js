/* ==========================================================================
   data.js: static content. Topic pool, demographics, actions, flavour lists
   ========================================================================== */

/* Age buckets and genders, the two demographic axes. */
const AGES    = ['young', 'middle', 'old'];
const GENDERS = ['male', 'female', 'nonbinary'];

const AGE_LABEL    = { young: 'Young (18-34)', middle: 'Middle (35-64)', old: 'Older (65+)' };
const GENDER_LABEL = { male: 'Men', female: 'Women', nonbinary: 'Nonbinary' };
const AGE_SHORT    = { young: 'Young', middle: 'Middle', old: 'Older' };

/* National baseline share of the voting-age population, before per-state skew. */
const AGE_BASE    = { young: 0.30, middle: 0.49, old: 0.21 };
const GENDER_BASE = { male: 0.485, female: 0.503, nonbinary: 0.012 };

/* --------------------------------------------------------------------------
   TOPIC POOL
   Each topic carries three "tilt" coefficients that describe which way the
   electorate splits on it. Tilts are multiplied by a per-game random factor,
   so the same topic behaves a little differently every election.

     partisan : + means the pro side polls better in blue states
     agev     : + means the pro side polls better with YOUNG voters
     genderv  : + means the pro side polls better with WOMEN / nonbinary voters
     base     : national baseline enthusiasm for the pro side (-3..+3)
   -------------------------------------------------------------------------- */
const TOPIC_POOL = [
  { id:'healthcare',  name:'Universal Healthcare',        pro:'Single-payer for all',        con:'Private market only',        base: 0.6,  partisan: 0.85, agev: 0.35, genderv: 0.30 },
  { id:'taxbil',      name:'Billionaire Wealth Tax',      pro:'Tax the ultra-rich',          con:'Protect capital formation',  base: 0.8,  partisan: 0.80, agev: 0.45, genderv: 0.15 },
  { id:'climate',     name:'Aggressive Climate Action',   pro:'Decarbonize by 2035',         con:'Energy independence first',  base: 0.4,  partisan: 0.90, agev: 0.70, genderv: 0.35 },
  { id:'guns',        name:'Firearm Restrictions',        pro:'Tighter gun laws',            con:'Expand gun rights',          base: 0.2,  partisan: 0.95, agev: 0.20, genderv: 0.55 },
  { id:'border',      name:'Border Enforcement',          pro:'Harden the border',           con:'Open, humane immigration',   base: 0.5,  partisan:-0.85, agev:-0.55, genderv:-0.30 },
  { id:'crypto',      name:'Crypto Deregulation',         pro:'Let the chain run free',      con:'Regulate digital assets',    base:-0.3,  partisan:-0.25, agev: 0.90, genderv:-0.45 },
  { id:'studentdebt', name:'Student Debt Cancellation',   pro:'Wipe the balance',            con:'Debts are promises',         base: 0.1,  partisan: 0.75, agev: 1.00, genderv: 0.30 },
  { id:'socsec',      name:'Social Security Expansion',   pro:'Raise every benefit check',   con:'Means-test and trim',        base: 1.2,  partisan: 0.35, agev:-0.95, genderv: 0.20 },
  { id:'ai',          name:'AI Regulation',               pro:'License the labs',            con:'Let it rip, ship it',        base: 0.7,  partisan: 0.20, agev:-0.60, genderv: 0.40 },
  { id:'housing',     name:'Build Housing Everywhere',    pro:'Abolish exclusionary zoning', con:'Protect neighborhoods',      base: 0.5,  partisan: 0.30, agev: 0.95, genderv:-0.05 },
  { id:'military',    name:'Defense Spending',            pro:'Bigger military budget',      con:'Cut the Pentagon',           base:-0.1,  partisan:-0.80, agev:-0.70, genderv:-0.45 },
  { id:'ubi',         name:'Universal Basic Income',      pro:'$1,000 a month for all',      con:'Work requirements',          base:-0.2,  partisan: 0.65, agev: 0.85, genderv: 0.25 },
  { id:'unions',      name:'Union Power',                 pro:'Card check and sector deals', con:'Right to work',              base: 0.6,  partisan: 0.75, agev: 0.25, genderv: 0.10 },
  { id:'police',      name:'Police Funding',              pro:'Fund and expand policing',    con:'Redirect to social services',base: 0.7,  partisan:-0.75, agev:-0.85, genderv:-0.35 },
  { id:'termlimits',  name:'Congressional Term Limits',   pro:'Twelve years and out',        con:'Let voters decide',          base: 1.7,  partisan:-0.10, agev: 0.45, genderv: 0.00 },
  { id:'weed',        name:'Federal Marijuana Legalization', pro:'Deschedule it',            con:'Keep it controlled',         base: 1.0,  partisan: 0.55, agev: 0.80, genderv:-0.15 },
  { id:'tiktok',      name:'Social Media Age Limits',     pro:'No accounts under 16',        con:'Hands off the feed',         base: 0.9,  partisan: 0.05, agev:-1.00, genderv: 0.50 },
  { id:'space',       name:'Crewed Mars Program',         pro:'Boots on Mars this decade',   con:'Fix things down here',       base:-0.4,  partisan:-0.15, agev: 0.55, genderv:-0.55 },
  { id:'tariffs',     name:'Sweeping Tariffs',            pro:'Tax every import',            con:'Free trade',                 base: 0.0,  partisan:-0.45, agev:-0.35, genderv:-0.25 },
  { id:'childcare',   name:'Universal Childcare',         pro:'Free public childcare',       con:'Family, not federal',        base: 0.9,  partisan: 0.70, agev: 0.50, genderv: 0.85 },
  { id:'railway',     name:'National High-Speed Rail',    pro:'Bullet trains coast to coast',con:'Highways and airports',      base: 0.6,  partisan: 0.45, agev: 0.80, genderv: 0.10 },
  { id:'work4day',    name:'Four-Day Work Week',          pro:'32 hours, same pay',          con:'Forty is the deal',          base: 0.8,  partisan: 0.50, agev: 0.90, genderv: 0.30 },
  { id:'electoral',   name:'Abolish the Electoral College',pro:'Popular vote wins',          con:'Keep the states in it',      base: 0.2,  partisan: 0.60, agev: 0.55, genderv: 0.20 },
  { id:'nuclear',     name:'Nuclear Power Buildout',      pro:'A hundred new reactors',      con:'Too risky, too slow',        base: 0.4,  partisan:-0.20, agev: 0.35, genderv:-0.60 },
  { id:'privacy',     name:'Federal Privacy Law',         pro:'You own your data',           con:'Do not strangle the industry',base: 1.3,  partisan: 0.25, agev: 0.40, genderv: 0.25 },
  { id:'draft',       name:'National Service Requirement',pro:'One year of service for all', con:'Nobody is conscripted',      base:-0.6,  partisan:-0.20, agev:-0.90, genderv:-0.20 },
  { id:'vetcare',     name:'Veterans Benefits Overhaul',  pro:'Blank check for veterans',    con:'Audit the VA first',         base: 1.5,  partisan:-0.15, agev:-0.40, genderv:-0.15 },
  { id:'lunch',       name:'Free School Meals',           pro:'Feed every kid',              con:'Local districts decide',     base: 1.4,  partisan: 0.60, agev: 0.35, genderv: 0.70 },
  { id:'antitrust',   name:'Break Up Big Tech',           pro:'Split the platforms',         con:'Scale is American',          base: 0.9,  partisan: 0.30, agev: 0.15, genderv: 0.20 },
  { id:'daylight',    name:'Permanent Daylight Saving',   pro:'Stop changing the clocks',    con:'Mornings matter',            base: 1.6,  partisan: 0.00, agev: 0.30, genderv:-0.10 },
  { id:'pennies',     name:'Abolish the Penny',           pro:'Retire the one-cent coin',    con:'Leave the penny alone',      base: 0.7,  partisan: 0.05, agev: 0.60, genderv:-0.10 },
  { id:'fedmascot',   name:'A National Mascot',           pro:'The eagle gets a costume',    con:'This is unserious',          base:-0.5,  partisan: 0.10, agev: 0.85, genderv: 0.10 },
  { id:'restrooms',   name:'Federal Restroom Standards',  pro:'Codify the fixture count',    con:'That is a state matter',     base: 0.3,  partisan: 0.30, agev: 0.10, genderv: 0.65 },
  { id:'sports',      name:'Ban Ads During Sports',       pro:'Commercial-free games',       con:'Ads pay for the game',       base: 1.1,  partisan: 0.00, agev: 0.45, genderv:-0.35 },
  { id:'zoo',         name:'Nationalize the Zoos',        pro:'Federal zoo service',         con:'Zoos are municipal',         base: 0.0,  partisan: 0.40, agev: 0.55, genderv: 0.35 },
  { id:'homework',    name:'Ban Homework',                pro:'End assigned homework',       con:'Rigor builds citizens',      base:-0.2,  partisan: 0.15, agev: 0.95, genderv: 0.15 },
  { id:'moonbase',    name:'Permanent Lunar Base',        pro:'A town on the Moon',          con:'A very expensive rock',      base:-0.3,  partisan:-0.05, agev: 0.60, genderv:-0.45 },
  { id:'robotax',     name:'Tax on Robots',               pro:'Automation pays payroll tax', con:'Do not tax progress',        base: 0.4,  partisan: 0.55, agev:-0.30, genderv: 0.20 },
  { id:'pets',        name:'Federal Pet Healthcare',      pro:'Medicare for dogs and cats',  con:'Pets are not people',        base: 0.5,  partisan: 0.35, agev: 0.70, genderv: 0.60 },
  { id:'timezones',   name:'Reduce to Two Time Zones',    pro:'Simplify the clock map',      con:'The sun disagrees',          base:-0.7,  partisan: 0.00, agev: 0.40, genderv:-0.20 },
  { id:'lotto',       name:'National Lottery for Debt',   pro:'Buy tickets, pay the deficit',con:'A tax on hope',              base:-0.1,  partisan:-0.30, agev: 0.30, genderv:-0.30 },
  { id:'coffee',      name:'Subsidized National Coffee',  pro:'A dollar a cup, everywhere',  con:'Let the market brew',        base: 0.9,  partisan: 0.20, agev: 0.65, genderv: 0.15 }
];

/* --------------------------------------------------------------------------
   CAMPAIGN ACTIONS
   reach  : which slice of the electorate the spend touches
   power  : base bias movement, in bias-units, at the standard spend
   noise  : sd of the random component of the movement
   backfire: probability the movement lands the wrong way
   decay  : diminishing-returns factor applied per prior use on the same target
   -------------------------------------------------------------------------- */
/* Three groups shown in the campaign menu. `corp` is a fourth, ungrouped
   action that only ever appears when a corporate offer is on the table. */
const ACTION_GROUPS = [
  { id:'ads',    label:'Ads',    icon:'📣', blurb:'Paid media, targeted by state and, if you like, by demographic.' },
  { id:'clones', label:'Clones', icon:'🧑\u200d🤝\u200d🧑', blurb:'Deploy AI clones of yourself to canvass and campaign in person, or borrow a famous face to vouch for you.' },
  { id:'policy', label:'Policy', icon:'\ud83d\udcdc', blurb:'Change what you stand for, or go after what your opponent stands for.' }
];

const ACTIONS = [
  {
    id:'tv', name:'TV Advertising', icon:'📺', cost: 12, group:'ads',
    blurb:'Broadcast buys. Wide reach, expensive, and older viewers are the ones still watching live.',
    targeting:'state', ageWeight:{ young:0.35, middle:1.0, old:1.6 }, genderWeight:{ male:1.0, female:1.05, nonbinary:0.8 },
    power: 0.62, noise: 0.16, backfire: 0.06, decay: 0.74, canAttack:true, spill: 0.05
  },
  {
    id:'print', name:'Print & Mail', icon:'📰', cost: 5, group:'ads',
    blurb:'Direct mail and local papers. Cheap, dependable, tiny, and read almost exclusively by retirees.',
    targeting:'state', ageWeight:{ young:0.12, middle:0.7, old:2.0 }, genderWeight:{ male:0.95, female:1.1, nonbinary:0.7 },
    power: 0.34, noise: 0.07, backfire: 0.03, decay: 0.80, canAttack:true, spill: 0.015
  },
  {
    id:'internet', name:'Internet Blitz', icon:'📱', cost: 8, group:'ads',
    blurb:'Programmatic, short-form, algorithmic. Enormous upside with the young, and it can absolutely detonate.',
    targeting:'state', ageWeight:{ young:2.0, middle:0.9, old:0.25 }, genderWeight:{ male:1.05, female:1.0, nonbinary:1.5 },
    power: 0.70, noise: 0.34, backfire: 0.17, decay: 0.70, canAttack:true, spill: 0.09
  },
  {
    id:'ground', name:'Grassroots Canvassing', icon:'🚪', cost: 6, group:'clones',
    blurb:'A legion of AI clones of you, working the doorbells block by block. Small, slow, nearly impossible to screw up.',
    targeting:'state', ageWeight:{ young:1.1, middle:1.0, old:1.1 }, genderWeight:{ male:0.95, female:1.15, nonbinary:1.0 },
    power: 0.40, noise: 0.06, backfire: 0.01, decay: 0.86, canAttack:false, spill: 0.01
  },
  {
    id:'visit', name:'Campaign Visits', icon:'🚌', cost: 10, group:'clones',
    blurb:'Deploy AI clones of yourself onto the campaign trail, live on a stage. Send more clones to cover more ground, though each one is a little less convincing than the last.',
    targeting:'multi-state', ageWeight:{ young:0.9, middle:1.2, old:1.15 }, genderWeight:{ male:1.0, female:1.0, nonbinary:1.0 },
    power: 0.78, noise: 0.20, backfire: 0.07, decay: 0.68, canAttack:false, spill: 0.06
  },
  {
    id:'celeb', name:'Celebrity Endorsement', icon:'🌟', cost: 14, group:'clones',
    blurb:'A famous person says your name on purpose. Their crowd loves it. Everyone else notices.',
    targeting:'national', power: 0.85, noise: 0.30, backfire: 0.14, decay: 0.60, canAttack:false
  },
  {
    id:'policy', name:'Change a Policy Stance', icon:'🔀', cost: 9, group:'policy',
    blurb:'Move one of your positions by a step. The voters you gain are real. So are the flip-flop headlines.',
    targeting:'topic', power: 0, noise: 0, backfire: 0.30, decay: 0.90, canAttack:false
  },
  {
    id:'oppo', name:'Smear Campaign', icon:'🔎', cost: 11, group:'policy',
    blurb:'Dig something up on a rival and hand it to a reporter. Always aimed at them, and sometimes the shovel hits your own foot.',
    targeting:'opponent-national', power: 0.72, noise: 0.36, backfire: 0.20, decay: 0.66, canAttack:true
  },
  {
    id:'corp', name:'Corporate Backing', icon:'🏢', gated:'corp', cost: 0, group:'special',
    blurb:'A very large check from an interested party. They will want something later.',
    targeting:'none', power: 0, noise: 0, backfire: 0.22, decay: 1.0, canAttack:false
  }
];

const ACTION_BY_ID = Object.fromEntries(ACTIONS.map(a => [a.id, a]));

/* Celebrity endorsers. `pull` names the demographic slice that responds. */
const CELEBRITIES = [
  { name:'Dex Marlowe',        desc:'streamer, 19 million subscribers',      age:'young',  gender:null,        mult: 2.3 },
  { name:'Ruthanne Colby',     desc:'daytime television institution',        age:'old',    gender:'female',    mult: 2.4 },
  { name:'Big Tuck Ransom',    desc:'retired defensive end',                 age:'middle', gender:'male',      mult: 2.1 },
  { name:'Verity Sloane',      desc:'pop megastar, currently on tour',       age:'young',  gender:'female',    mult: 2.6 },
  { name:'Dr. Alonzo Peck',    desc:'the most trusted physician in America', age:'old',    gender:null,        mult: 2.0 },
  { name:'Kiro Vance',         desc:'nonbinary fashion icon',                age:'young',  gender:'nonbinary', mult: 2.9 },
  { name:'Marlon Hess',        desc:'late-night host',                       age:'middle', gender:null,        mult: 1.9 },
  { name:'Sunny Okafor',       desc:'olympic sprinter',                      age:'young',  gender:'female',    mult: 2.2 },
  { name:'Gramp Willis',       desc:'country music legend',                  age:'old',    gender:'male',      mult: 2.2 },
  { name:'The Hollow Sparrows',desc:'a band your kids like',                 age:'young',  gender:null,        mult: 2.0 },
  { name:'Priya Anand-Bell',   desc:'billionaire founder turned podcaster',  age:'middle', gender:null,        mult: 1.8 },
  { name:'Coach Deb Vargas',   desc:'winningest coach in the league',        age:'middle', gender:'female',    mult: 2.1 }
];

/* Corporate backers, with the favour they collect if their candidate wins. */
const CORPORATIONS = [
  { name:'Vantablack Petroleum',      cash: 40, favour:'a permanent federal drilling easement across four national parks' ,
    consequence:'Within eighteen months the easement is quietly extended to nine more parks. The maps are reprinted without them. A generation of schoolchildren grows up not knowing the land was ever public.' },
  { name:'Cygnus Pharmaceutical',     cash: 37, favour:'a twenty-year patent extension on every drug in its pipeline' ,
    consequence:'Three generics scheduled for release are pulled from the market. The price of insulin triples over the following year. The earnings call describes the administration as \u201ca constructive partner.\u201d' },
  { name:'Meridian Defense Systems',  cash: 45, favour:'a no-bid contract to operate the national logistics grid' ,
    consequence:'The logistics grid runs on their software, so the audits run on their software too. Congress requests the cost overruns four times and is told, four times, that the figures are proprietary.' },
  { name:'Halcyon Data Group',        cash: 36, favour:'unrestricted access to the federal biometric database' ,
    consequence:'Every face photographed at a protest is matched against the database within the hour. The company insists this is a search feature. Attendance at demonstrations falls by two thirds.' },
  { name:'Fenwick Agricultural',      cash: 32, favour:'sole licensing rights to the national seed reserve' ,
    consequence:'The seed reserve stops being a reserve. Farmers who saved their own seed for four generations begin receiving letters from lawyers, and the varieties that do not sell simply stop existing.' },
  { name:'Orrin Financial Holdings',  cash: 42, favour:'a seat on the board of the Federal Reserve' ,
    consequence:'Their man on the Fed board is careful, courteous, and votes his own book every single time. Interest rates move in ways that surprise economists and nobody at Orrin.' },
  { name:'Brightline Media Trust',    cash: 34, favour:'ownership of every remaining local newspaper in the country' ,
    consequence:'Two hundred local papers are consolidated into one wire desk. Town councils, school boards and county courts go uncovered. People do not notice the news is gone, only that nothing seems to happen anymore.' },
  { name:'Stellar Orbital Freight',   cash: 38, favour:'exclusive commercial rights to low Earth orbit' ,
    consequence:'Every satellite launched now pays them a toll. Weather and climate observation, being unprofitable, is deprioritised. The forecasts get worse and no one can say precisely why.' },
  { name:'Copperhead Utilities',      cash: 35, favour:'permanent rate-setting authority over the eastern power grid' ,
    consequence:'Rates rise nineteen percent the first winter. When a cold snap takes the grid down for six days, the penalty written into their charter is a fine they can pay out of one afternoon of revenue.' },
  { name:'Novaris Compute',           cash: 43, favour:'a federal exemption from every AI safety rule ever written' ,
    consequence:'The exemption is total and retroactive. The systems they deploy into hospitals, courts and benefit offices answer to no standard at all, and the people those systems decide against have nowhere to appeal to.' }
];

/* AI opponent archetypes. `weights` biases which actions they reach for. */
const AI_PERSONAS = [
  { id:'populist',   name:'Populist',    desc:'Rallies and rage. Loves a crowd, hates a consultant.',
    weights:{ visit:2.4, ground:1.6, internet:1.4, tv:0.7, print:0.5, celeb:1.0, oppo:1.2, policy:0.9 }, corpTaste:0.15, aggression:0.75 },
  { id:'technocrat', name:'Technocrat',  desc:'Reads the crosstabs. Buys exactly the right ad in exactly the right state.',
    weights:{ tv:1.5, internet:1.5, print:0.8, visit:0.9, ground:1.3, celeb:0.4, oppo:0.7, policy:1.6 }, corpTaste:0.55, aggression:0.35 },
  { id:'firebrand',  name:'Firebrand',   desc:'Attacks first, polls later.',
    weights:{ oppo:2.6, internet:2.0, tv:1.1, visit:1.2, print:0.4, celeb:1.1, ground:0.6, policy:0.5 }, corpTaste:0.35, aggression:0.95 },
  { id:'establish',  name:'Establishment', desc:'Ballrooms, broadcast buys, and a very long donor list.',
    weights:{ tv:2.0, print:1.4, celeb:1.2, visit:1.0, ground:0.7, internet:0.6, oppo:0.8, policy:0.7 }, corpTaste:0.90, aggression:0.45 },
  { id:'grassroots', name:'Grassroots',  desc:'Doors, not dollars. Small checks, big volunteer lists.',
    weights:{ ground:2.6, visit:1.8, internet:1.3, print:0.9, tv:0.5, celeb:0.7, oppo:0.4, policy:1.0 }, corpTaste:0.05, aggression:0.25 },
  { id:'celebrity',  name:'Celebrity',   desc:'Famous first, political second. The camera does the work.',
    weights:{ celeb:2.6, internet:2.0, tv:1.5, visit:1.3, oppo:1.0, print:0.3, ground:0.5, policy:0.6 }, corpTaste:0.60, aggression:0.60 }
];

/* Names for auto-generated AI candidates. */
const AI_FIRST = ['Marcus','Deborah','Ellis','Corinne','Hollis','Yvette','Rafael','Junia','Tobias','Marisol',
                  'Gideon','Priya','Ward','Ines','Casper','Nadia','Roland','Simone','Emeka','Astrid','Vaughn','Lorna'];
const AI_LAST  = ['Whitaker','Ferro','Castellan','Nkemdi','Okonjo','Brandt','Vasquez','Lindqvist','Ashby','Moreau',
                  'Tanaka','Delacroix','Halloran','Osei','Vandermeer','Petrossian','Kowalski','Reyes','Blackwood','Amari'];

/* Party labels are cosmetic. Only stances affect the count. */
const PARTY_NAMES = ['Progress Party','National Union','Liberty Front','Commonwealth Alliance','Homestead Party',
                     'Civic Renewal','The Independents','Sunrise Coalition','Heartland League','New Republic Party'];

/* Candidate colours, chosen to stay distinguishable on a choropleth. */
const CANDIDATE_COLORS = [
  { name:'Blue',   hex:'#2b6cd4' },
  { name:'Red',    hex:'#d1373a' },
  { name:'Green',  hex:'#3f9b53' },
  { name:'Purple', hex:'#7a4fbf' },
  { name:'Orange', hex:'#e07b26' },
  { name:'Teal',   hex:'#1f9b9b' }
];

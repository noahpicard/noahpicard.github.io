# Run for Office

A presidential campaign simulator that runs entirely in the browser — plain
HTML, CSS and JavaScript, no build step, no backend, no network calls.

Open `index.html`, or visit the folder on the site.

## What it is

You write a biography, take a position on five randomly drawn issues, and then
spend a war chest across five rounds of campaigning against up to five rivals —
any of whom can be another person at the same keyboard, or the computer.
Polling is published between rounds; the count happens on election night.

## The model

* **51 contests, 100 simulated voters each** (5,100 in all). Every voter gets an
  age bucket and a gender by quota, so each state's hundred voters match its
  real demographic mix.
* **Every state, age bucket and gender holds a position** on each issue from
  −3 to +3. A voter's position is the mean of their three, plus an optional
  personal deviation.
* **Voting is cosine similarity.** The voter's vector is their five positions
  followed by their bias toward each candidate; the candidate's is their five
  stances followed by +3 in their own slot and −3 in everyone else's. The
  highest cosine wins the vote.
* **Campaigning moves bias**, weighted by each action's demographic reach, with
  per-target diminishing returns, sub-linear returns to intensity, and a
  backfire chance moderated by the message discipline your biography earned.
* **Polls are the truth plus sampling error** and get sharper as election day
  approaches. Election night adds a final turnout jitter.

Full details are in the in-game "Methodology" panel.

## Files

| File | What it holds |
| --- | --- |
| `js/mapdata.js` | Albers-USA state paths, centroids, bounding boxes, electoral votes, population, partisan lean, age skew |
| `js/data.js` | Topic pool, campaign actions, celebrities, corporate backers, AI personas |
| `js/engine.js` | RNG, world generation, the voter model, simulation, polling, action resolution |
| `js/bio.js` | The biography analyst |
| `js/ai.js` | Computer opponent strategy |
| `js/game.js` | Game construction and round flow |
| `js/ui.js` | Screens, map rendering, campaign interface, election night |

The map geometry is derived from `us-atlas` (US Census cartographic boundary
files, public domain), projected to Albers USA and simplified with
Douglas-Peucker.

## Note on "AI"

The biography analyst is a local lexicon-and-heuristics reader, not a language
model — the page is static files with no server to call, so nothing you type
leaves your browser. It reads for occupational signals, place names,
specificity, empty campaign filler and volunteered liabilities, and turns them
into a starting favourability across the nine age × gender cells.

# Fish Simulator Roadmap

The goal: grow this into a full interactive simulator, good enough for a university to
use when teaching how **fish farms compare with wild fish populations**, and simple
enough to embed on a personal website.

The plan is split into ~50 sessions. Sessions marked **Core** form the shortest path
(about 23 sessions) to a v1.0 that a university class can use. The rest are extras,
taking the total to 20–50 sessions depending on how far you want to go. A "session"
is one focused piece of work; a big one may take more than one sitting.

## How to use this roadmap

At the start of a session, ask Claude to *"continue the fish simulator roadmap"*.
Claude should then:

1. Read this file and `README.md`, then open the simulator in the browser.
2. Pick the first unticked session (or the one you name).
3. Follow the working rules below.
4. Tick the session, and add a line to the **Session log** saying what changed and
   anything that didn't go to plan.

### Working rules

- `sim.js` stays free of drawing and DOM code; everything visual goes in `main.js`.
  This keeps the model testable and reusable (e.g. for running experiments).
- After any change to the model, run the balance checks (Session 4 makes these a
  single command) and note the results in the session log.
- Check the page in the browser at desktop and phone width before finishing.
- Every new slider gets a sensible default, a unit, and (from Session 24) an
  explanation.
- Scientific claims shown to students should be simplified but not wrong; note the
  sources in the model document (Session 32).

---

## Done

- [x] **Session 1 — Core simulator.** Fish wander, find food, grow, breed, inherit
  mutated speed and eyesight, and die of starvation or old age. Speed, starting
  numbers and food sliders; population chart; stats; click to drop food.
- [x] **Session 2 — Predators, hiding places, temperature and species.** Pike-like
  predators that hunt, lunge, digest, breed slowly and starve. Fish flee to weed-bed
  hiding places with limited room. Three species (trout, carp, tilapia) with
  different temperature ranges; temperature slider with a tolerance chart; water
  colour changes with temperature; per-species chart lines and stats.
- [x] **Session 2b — Live scenarios and food that reacts to temperature.** Scenario
  picker (Manual, Seasons, Heatwave, Cold snap, Climate warming) that changes the
  temperature live without resetting the fish, with the current phase shown. Food
  grows fastest around 22 °C and rots faster when warm (toggle). Temperature strip
  along the top of the chart. Version numbers on the file links to beat caching.

## Phase 1 — Foundations

- [ ] **Session 3 — Version control and publishing** · Core
  - Set up git, `.gitignore`, first commit; optional GitHub repository.
  - Deploy to your website (or GitHub Pages) and write down the steps in the README.
  - Version numbers are already on the file links (`main.js?v=3`); make bumping
    them part of a short release checklist (or automate it).
  - *Done when:* a live URL works, and an update shows up without a hard refresh.

- [ ] **Session 4 — Tests and balance checks** · Core
  - Add a seeded random number generator to `sim.js` so a run can be repeated exactly.
  - Unit tests with Node's built-in test runner (no dependencies): `thermal()`, the
    spatial grid, breeding and death rules.
  - Scenario tests that run the model headless and report how often species survive
    (the checks used in Session 2, made permanent).
  - *Done when:* one command (`node --test`) runs everything and prints a balance report.

- [ ] **Session 5 — Long-run predator balance** · Core
  - Fix the known issue: predators fade out after 10–15 simulated minutes in about
    half of runs.
  - Options to try: an "open water" toggle that lets the odd predator arrive from
    outside, predator territories, tuning predator speed evolution.
  - *Done when:* at default settings, both fish and predators survive 30 minutes in
    at least 80% of runs.

- [ ] **Session 6 — Environment structure** · Core
  - Refactor `sim.js` so a habitat is described by a config object: bounds, food
    source, hiding places, temperature, predators allowed.
  - Split `sim.js` into a few files if it has grown too big (plain script files, so
    it still works when `index.html` is double-clicked).
  - Generalise scenarios from temperature-only into timelines that can change *any*
    condition while the simulation runs: food supply, nutrition, predators arriving,
    hiding places, later oxygen and pollution. Show upcoming events on the chart.
  - *Done when:* behaviour is unchanged (tests pass), Wild/Farm can be described
    as two configs, and a scenario can schedule a food shortage or predator arrival.

## Phase 2 — Farm vs wild (the headline feature)

- [ ] **Session 7 — Wild habitat with natural food** · Core
  - Replace the fixed pellet rain with plankton/algae that regrows on its own, faster
    with light and warmth, slower when grazed down.
  - *Done when:* in wild mode the food supply rises and falls with the fish population.

- [ ] **Session 8 — Farm net pens** · Core
  - One or more net pens holding the farmed fish; a stocking density slider.
  - Wild fish and predators stay outside; predators are attracted to the pens.
  - *Done when:* a farm mode exists, with fish visibly confined in pens.

- [ ] **Session 9 — Feeding and growth** · Core
  - Fish get a weight that grows with food and temperature.
  - Feeding schedule (feeds per day, ration size); feed conversion ratio (FCR).
  - Uneaten feed sinks and builds up on the bottom.
  - *Done when:* the farm shows a growth curve and FCR, and overfeeding is visibly wasteful.

- [ ] **Session 10 — Oxygen and waste** · Core
  - Dissolved oxygen falls with warm water, crowding and rotting waste; water
    exchange and an aeration toggle bring it back up. Ammonia from fish waste.
  - Low oxygen slows, stresses and eventually kills fish.
  - *Done when:* an overstocked pen on a hot day shows an oxygen crash.

- [ ] **Session 11 — Disease and parasites** · Core
  - Infection that spreads between nearby fish, so it spreads faster in crowded pens;
    sea-lice-style parasite load.
  - Spillover from pens to wild fish swimming past.
  - Treatment option, with parasites slowly evolving resistance.
  - *Done when:* a crowded farm has an outbreak that reaches nearby wild fish.

- [ ] **Session 12 — Harvest and economics** · Core
  - Harvest farmed fish at market weight; costs (feed, juveniles, treatments) and
    revenue; profit per production cycle.
  - Wild fishing pressure slider and catch; show maximum sustainable yield and
    overfishing collapse.
  - *Done when:* a profit panel for the farm, and a fishing demo that can collapse
    the wild stock.

- [ ] **Session 13 — Side-by-side comparison** · Core
  - Run a wild and a farm simulation next to each other under the same conditions.
  - Comparison table: fish biomass, deaths by cause, disease, oxygen, food used,
    yield, environmental impact.
  - *Done when:* one screen lets students compare farm and wild directly.

- [ ] **Session 14 — Environmental impacts**
  - Waste building up under pens; storm events that damage nets; escaped farm fish
    breeding with wild fish and passing on farm-adapted genes.
  - *Done when:* an escape event visibly changes the wild population over generations.

## Phase 3 — Richer biology

- [ ] **Session 15 — Life cycle and size**: eggs, larvae, juveniles and adults;
  predators can only eat fish small enough to swallow; growth depends on
  temperature (degree-days).
- [ ] **Session 16 — Sexual reproduction and genetics**: males and females, finding
  a mate, two copies of each gene, inbreeding in small populations.
- [ ] **Session 17 — Climate change and adaptation**: heritable temperature tolerance,
  so the existing Seasons / Heatwave / Climate warming scenarios can show species
  adapting rather than only dying out; combine warming with heatwaves.
- [ ] **Session 18 — Schooling**: optional flocking behaviour; compare survival
  against predators with and without schools.
- [ ] **Session 19 — More species and a species editor**: species defined in a data
  file; add salmon and Mediterranean farm species (sea bass, sea bream); let users
  create their own (switch the species UI from `innerHTML` to DOM methods here).
- [ ] **Session 20 — Deeper food web**: nutrients → algae → zooplankton → small fish
  → predators; show top-down vs bottom-up control.

## Phase 4 — Teaching tools

- [ ] **Session 21 — Inspect a fish** · Core: click a fish to follow it and see its
  age, energy, genes, parent and number of offspring.
- [ ] **Session 22 — Better charts** · Core: trait histograms, age pyramid,
  predator–prey phase plot, deaths by cause over time, adjustable time window.
- [ ] **Session 23 — Data export** · Core: download the run's history and settings
  as CSV, and the tank and charts as images, for lab reports.
- [ ] **Session 24 — Built-in explanations** · Core: an (i) explanation on every
  control with the real-world meaning; a glossary; live captions such as
  "Predators are starving because the fish are hiding".
- [ ] **Session 25 — Scenarios and lessons** · Core: build on the scenario picker and
  the timelines from Session 6. Ready-made lessons (Gause's experiment, climate
  warming, overstocked farm, overfishing, disease outbreak) that set every control,
  with instructions and questions for students; shareable scenario links.
- [ ] **Session 26 — Experiment runner**: run many trials without drawing, sweep a
  setting (e.g. temperature 0–40 °C), and chart averages and spread, which teaches
  why replicates matter.
- [ ] **Session 27 — Presentation mode**: full-screen tank for projectors, large
  text, keyboard shortcuts, and settings locked through the link for assessments.

## Phase 5 — Quality and v1.0 release

- [ ] **Session 28 — Accessibility** · Core: full keyboard use, visible focus,
  screen-reader summary of the populations, colour-blind-safe palette with shapes,
  reduced-motion option.
- [ ] **Session 29 — Performance** · Core: run the model in a background worker,
  aim for 2000+ fish smoothly, low-power mode for older school laptops.
- [ ] **Session 30 — Mobile and tablet polish**: collapsible control groups, controls
  in a bottom sheet on phones, a layout for classroom tablets.
- [ ] **Session 31 — Translations**: a translation system, plus a Greek version
  alongside English.
- [ ] **Session 32 — Scientific review** · Core: a "Model and assumptions" document
  with the sources for each number; review with university staff; adjust parameters;
  state the limitations honestly.
- [ ] **Session 33 — Classroom pilot** · Core: try it with students, collect feedback
  through a privacy-friendly form, fix the top issues.
- [ ] **Session 34 — v1.0 release** · Core: version number, changelog, final deploy,
  guide for embedding in Moodle or another learning platform, how to cite it.

## Phase 6 — Beyond v1 (stretch goals)

- [ ] **Session 35 — Visual upgrade**: illustrated fish, animated fins, day/night
  light, depth layers.
- [ ] **Session 36 — Bigger world**: larger scrolling, zoomable habitat with zones
  (shallows, deep water, river mouth).
- [ ] **Session 37 — Migration**: salmon-style life cycle between river and sea;
  dams and barriers.
- [ ] **Session 38 — Real temperature data**: load a real temperature series (CSV) for
  a lake or sea region.
- [ ] **Session 39 — Fishing rules and evolution**: quotas, size limits and net mesh
  size; fishing pressure driving fish to mature smaller.
- [ ] **Session 40 — Integrated multi-trophic aquaculture**: mussels and seaweed next
  to the pens that clean up waste; compare with a plain farm.
- [ ] **Session 41 — Recirculating (land-based) farms**: closed-tank farm mode with
  filtration and energy costs.
- [ ] **Session 42 — Save and load**: save a simulation to a file and continue later.
- [ ] **Session 43 — Challenge mode**: goals and scores, e.g. "run a profitable farm
  for five years without harming the wild population".
- [ ] **Session 44 — Shared classroom mode**: a teacher dashboard and shared scenarios
  (needs a server and a privacy review).
- [ ] **Session 45 — 3D view**: optional 3D rendering of the same simulation.
- [ ] **Session 46 — "Ask about this simulation"**: optional AI explanations of what
  is happening (needs a server so no API key is exposed in the page).
- [ ] **Session 47 — Research mode**: batch experiments with statistics export for
  student projects.
- [ ] **Session 48 — Add-ons**: let others add species and behaviours through config
  files.
- [ ] **Session 49 — Offline app**: installable web app that works without internet
  in classrooms.
- [ ] **Session 50 — Maintenance**: browser compatibility testing, contributor docs,
  long-term upkeep plan.

---

## Known issues

- **Predators fade out** after 10–15 simulated minutes in about half of runs at
  default settings. They go through 2–3 boom-and-bust cycles, then a low point
  finishes them off. "Add predator" brings them back. → Session 5.
- **Fish evolve high top speeds** (about 60 → 140) because they race each other for
  scarce pellets. That's realistic scramble competition, but it makes predator
  balance harder. → Session 5.
- **Browser caching**: the `?v=` numbers on the file links in `index.html` must be
  bumped by hand on every update, or visitors keep the old scripts. → Session 3.
- **No automated tests yet**; balance has been checked with one-off scripts. → Session 4.
- **More species = more bluefish**: the open-sea rescue tops up each rare species
  separately, so with 7 prey species predators get more free food. → Session 5.
- **Simplified diets**: adult sea bass really eat fish, and groupers and toadfish eat
  a lot of octopus and crabs; here predators eat only fish and sea bass only bottom
  food. Lionfish also breed far more slowly than real ones. See `MODEL.md`.
- The species picker, legend and tolerance chart are built with `innerHTML` from the
  hard-coded species list. That's safe now, but must change once users can name their
  own species. → Session 19.

## Session log

- **Session 1 (2026-10-20):** Built the core simulator (`index.html`, `style.css`,
  `sim.js`, `main.js`). Headless test: the population booms, crashes, then levels off
  in line with food supply (≈35 / 100 / 380 fish at low / default / high food).
- **Session 2 (2026-10-20 → 21):** Added predators, hiding places, temperature and
  species. Balance findings: without hiding places predators always wipe out the fish
  and then starve (as in Gause's experiments); with 3 hiding places fish and predators
  cycle, and fish always survive. Fixes needed along the way: cruising speed separate
  from top speed, muscle upkeep cost, predator handling time and slower predator
  breeding. Temperature results: trout win at 8–14 °C, carp at 20 °C, tilapia at
  26–32 °C; nothing survives 0 °C or 38 °C.
- **Session 2b (2026-10-21):** Scenarios and temperature-linked food. Headless runs:
  *Heatwave* kills the trout and all predators (heat stress), then tilapia boom;
  *Cold snap* (8 °C) kills the tilapia, carp recover, predators survive; *Seasons*
  (5–23 °C) makes trout and carp take turns over the years while tilapia die in the
  first winter; *Climate warming* shows trout → carp → tilapia. The first versions
  (5 °C cold snap, 6–26 °C seasons) wiped out too much to be useful for teaching, so
  they were softened. Default balance afterwards: fish survive 4/4 runs, predators
  1/4 over 20 minutes (same known issue as before).
- **Research pass (2026-10-31):** Checked every species against the literature and
  wrote `MODEL.md` (first part of Session 32) with a source and confidence level for
  each number. Fixes: sea bream lower limit 6 → 5 °C; lionfish lower limit 14 → 13 °C
  (lab-lethal 10 °C, but they stop eating at ~16 °C); heatwave text reworded ("most
  intense" wasn't supported, "longest, most cumulative heat" is); warming rate
  0.3–0.6 → 0.3–0.5 °C per decade; sea bass text now says adults eat fish (still left
  out of the model). New: resting metabolism rises with temperature (Q10 = 2, set to 1
  at each species' best temperature). New species: anchovy (summer-spawning partner
  to the winter-spawning sardine), red mullet (third bottom feeder), parrotfish (native
  grazer that competes with rabbitfish), dusky grouper (native reef ambush predator,
  very slow breeding) and silver-cheeked toadfish (invasive pufferfish, arrives in
  *Warming Aegean*). Balance, 5 runs × 15 min: at default settings all 7 fish species
  and bluefish survive 5/5; *Aegean year*, *Heatwave* and *North Aegean* keep every
  native species 5/5; lionfish now survive the *North Aegean* year 5/5 (was 2/5);
  rabbitfish beat parrotfish in warm runs and lose in cool ones. Grouper first boomed
  to ~20, so its breeding was slowed (cooldown 220 s, maturity 140 s); it now holds at
  about 5 in every scenario. Not to plan: bluefish average ~25 at defaults (was ~14),
  because the open-sea rescue now tops up 7 prey species; with the open sea off,
  sardines and anchovies die out in every run at 20 °C.

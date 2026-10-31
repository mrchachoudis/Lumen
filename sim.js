/*
 * Aegean Sea fish population model.
 *
 * Pure logic: no drawing and no DOM access. New behaviours (farm pens,
 * disease, water quality...) belong here; main.js only reads the state
 * to draw it.
 *
 * Units: time in simulated seconds, distance in world pixels.
 */
(function (global) {
  'use strict';

  const WORLD_W = 1200;
  const WORLD_H = 750;
  const SAND_H = 40; // sinking food comes to rest on top of the sand
  const FLOOR = WORLD_H - SAND_H;

  // Shared biology of the small (prey) fish. Each species in SPECIES can override
  // any of these in its `bio`. Tweak these to change how the populations behave.
  const BIO = {
    maxEnergy: 100,
    startEnergy: 50,
    reproduceAt: 75,     // a fish needs this much energy to breed
    reproduceCost: 40,   // energy the parent spends on breeding
    childEnergy: 30,     // energy the newborn starts with (the rest is lost)
    maturityAge: 10,     // fry can't breed until this age
    breedCooldown: 8,
    lifespanMin: 70,
    lifespanMax: 100,
    hungryBelow: 90,     // fish ignore food when (nearly) full
    eatRadius: 6,
    mutation: 0.07,      // std-dev of trait mutation, as a fraction of the trait
    personalSpace: 12,   // fish push apart when closer than this
    turnRate: 4,         // how quickly a fish can change direction
    cruiseSpeed: 22,     // relaxed swimming speed; top speed is only used to chase or flee
    alertness: 0.8,      // spots predators at this fraction of its eyesight
    schoolRadius: 60,    // schooling fish keep together with their own kind within this distance
    confusion: 0.4,      // each schoolmate nearby makes a predator's strike more likely to miss
  };

  // Aegean fish and the sea temperatures they can live in (degrees C). `depth` is
  // the part of the water column a species keeps to (0 = surface, 1 = sea floor),
  // and `diet` the foods it eats (see FOOD_TYPES). The temperature ranges
  // are simplified from published figures and field ranges, not exact limits;
  // MODEL.md lists the source behind each number.
  // Fish do best at tempOpt, become sluggish and breed less towards the limits,
  // and suffer fatal stress outside them.
  const SPECIES = [
    {
      id: 'sardine', name: 'Sardine', greek: 'Σαρδέλα', latin: 'Sardina pilchardus', origin: 'native',
      hue: 210, tempMin: 9, tempOpt: 15, tempMax: 27, body: 0.6, diet: ['plankton'], depth: [0.05, 0.65],
      // Lives fast: grows up quickly, breeds often, dies young, so it survives heavy predation.
      bio: { maturityAge: 6, breedCooldown: 5, lifespanMin: 45, lifespanMax: 65 },
      schools: true, // swims in schools, which confuses predators
      fact: 'Small schooling fish that eats plankton and prefers cooler water. In the Aegean it spawns from November to April, peaking in February, at about 13–18 °C.',
    },
    {
      id: 'anchovy', name: 'Anchovy', greek: 'Γαύρος', latin: 'Engraulis encrasicolus', origin: 'native',
      hue: 245, tempMin: 8, tempOpt: 21, tempMax: 29, body: 0.45, diet: ['plankton'], depth: [0.05, 0.6],
      // Even faster life than the sardine: matures in its first year, rarely lives past four.
      bio: { maturityAge: 5, breedCooldown: 4, lifespanMin: 35, lifespanMax: 55 },
      schools: true,
      fact: 'The sardine\'s summer twin: both eat plankton and swim in schools, but the anchovy spawns in the warm months (May–October in the north Aegean, peaking at about 21–23 °C). Greece\'s most valuable small fish catch.',
    },
    {
      id: 'seabass', name: 'Sea bass', greek: 'Λαβράκι', latin: 'Dicentrarchus labrax', origin: 'native',
      hue: 170, tempMin: 3, tempOpt: 22, tempMax: 32, body: 0.75, diet: ['benthos'], depth: [0.6, 1],
      bio: { maturityAge: 12, breedCooldown: 10, lifespanMin: 90, lifespanMax: 120 },
      fact: 'Copes with a very wide range of temperatures (about 2–32 °C). Young sea bass eat shrimp, crabs and worms; adults also hunt small fish, which this model leaves out. One of the two fish Greece farms most.',
    },
    {
      id: 'seabream', name: 'Sea bream', greek: 'Τσιπούρα', latin: 'Sparus aurata', origin: 'native',
      hue: 45, tempMin: 5, tempOpt: 25, tempMax: 33, body: 1.0, diet: ['benthos'], depth: [0.7, 1],
      bio: { maturityAge: 12, breedCooldown: 10, lifespanMin: 90, lifespanMax: 120 },
      fact: 'Named for the gold band between its eyes. Crushes mussels and crabs with strong teeth. Starts life as a male and turns female later. Greece\'s other main farmed fish; it nearly stops eating below about 13 °C ("winter syndrome") and dies below about 5 °C.',
    },
    {
      id: 'redmullet', name: 'Red mullet', greek: 'Κουτσομούρα', latin: 'Mullus barbatus', origin: 'native',
      hue: 8, tempMin: 8, tempOpt: 19, tempMax: 28, body: 0.7, diet: ['benthos'], depth: [0.85, 1],
      bio: { maturityAge: 8, breedCooldown: 7, lifespanMin: 60, lifespanMax: 85 },
      fact: 'Feels through the sand for worms and small crustaceans with two barbels under its chin. Matures at one year old and spawns in spring and summer. When the bottom water passes about 27 °C it moves deeper.',
    },
    {
      id: 'rabbitfish', name: 'Rabbitfish', greek: 'Γερμανός', latin: 'Siganus luridus', origin: 'invasive',
      hue: 285, tempMin: 14, tempOpt: 27, tempMax: 35, body: 0.95, diet: ['seaweed'], depth: [0.75, 1],
      reefs: true, // stays around reefs and seagrass, where its seaweed grows
      fact: 'Arrived from the Red Sea through the Suez Canal. Grazes on seaweed and has venomous spines. Spawns in summer (May–August). Its spread is limited by winter sea temperatures, so it gains ground as the Aegean heats up.',
    },
    {
      id: 'parrotfish', name: 'Parrotfish', greek: 'Σκάρος', latin: 'Sparisoma cretense', origin: 'native',
      hue: 330, tempMin: 12, tempOpt: 24, tempMax: 31, body: 0.9, diet: ['seaweed'], depth: [0.7, 1],
      reefs: true,
      fact: 'The Mediterranean\'s own parrotfish, grazing algae off rocks with its beak. Rabbitfish compete with it for the same rocky reefs. A warm-water native, it has been spreading north as the sea warms and has now reached the north Aegean.',
    },
  ];

  // Predators. Bluefish chase prey through open water; lionfish lurk around
  // reefs and seagrass, strike from close range, and local fish don't
  // recognise them as a danger, so they react late (preyAlert).
  // `bio` overrides the shared PRED values below for that species.
  const PRED_SPECIES = [
    {
      id: 'bluefish', name: 'Bluefish', greek: 'Γοφάρι', latin: 'Pomatomus saltatrix', origin: 'native',
      color: '#ff6b6b', tempMin: 10, tempOpt: 22, tempMax: 30,
      speed: 110, sense: 170, preyAlert: 1, ambush: false,
      fact: 'Fast, aggressive hunter that chases schools of small fish in open water.',
    },
    {
      // tempMin is 13, not the lab-lethal 10 °C: lionfish stop eating at about
      // 16 °C and none were seen feeding below 13 °C, so colder water starves them.
      id: 'lionfish', name: 'Lionfish', greek: 'Λεοντόψαρο', latin: 'Pterois miles', origin: 'invasive',
      color: '#ff9ecb', tempMin: 13, tempOpt: 27, tempMax: 34,
      speed: 45, sense: 110, preyAlert: 0.3, ambush: true,
      bio: { lungeRange: 30, lungeBoost: 2.6, turnRate: 3.5, cruiseSpeed: 12, breedCooldown: 35 },
      fact: 'Came from the Red Sea, first recorded in Greece in 2015, and now established in the southern and central Aegean. Hunts slowly around reefs, and local fish don\'t recognise it as a danger. It survives down to about 10 °C but stops eating at around 16 °C, so cold winters limit how far north it spreads.',
    },
    {
      id: 'grouper', name: 'Dusky grouper', greek: 'Ροφός', latin: 'Epinephelus marginatus', origin: 'native',
      color: '#d4a25f', tempMin: 11, tempOpt: 22, tempMax: 31,
      speed: 50, sense: 120, preyAlert: 1, ambush: true,
      // Big, slow-growing and long-lived: breeds even more slowly than the other predators.
      bio: { lungeRange: 35, lungeBoost: 2.4, turnRate: 3, cruiseSpeed: 10, breedCooldown: 220,
             maturityAge: 140, lifespanMin: 260, lifespanMax: 340 },
      fact: 'The native reef ambush hunter, eating octopus, crabs and fish from a home cave. Unlike the lionfish, local fish know to avoid it. Starts life as a female and turns male when large and old. Slow growth and long life made it easy to overfish; it is a threatened species (IUCN Red List).',
    },
    {
      id: 'toadfish', name: 'Silver-cheeked toadfish', greek: 'Λαγοκέφαλος', latin: 'Lagocephalus sceleratus', origin: 'invasive',
      color: '#c9d3dc', tempMin: 13, tempOpt: 27, tempMax: 33,
      speed: 80, sense: 140, preyAlert: 1, ambush: false,
      fact: 'A pufferfish from the Red Sea, in Greek waters since 2005 and now found from Crete to the north Aegean. Eats fish, crustaceans, cuttlefish and octopus, and bites through fishing nets and lines. Its flesh holds tetrodotoxin, a poison that cooking does not destroy, so it must never be eaten.',
    },
  ];

  // Food. Each fish species eats only some kinds (its `diet`), which is what lets
  // species with different diets live side by side. Natural food grows by itself
  // at a rate set by the sea temperature. In the Aegean, plankton is most
  // plentiful in cool, well-mixed water (the late-winter and spring bloom) and
  // scarce in hot summers, when the warm surface layer stops nutrients welling up.
  // `share` is each kind's part of the food supply; `zone` is where it grows.
  // Feed pellets only appear when you click the water, and every fish eats them.
  const FOOD_TYPES = [
    { id: 'plankton', name: 'Plankton', color: '#b9dd6e', zone: 'water', share: 0.45,
      tempMin: 6, tempOpt: 15, tempMax: 33 },
    { id: 'seaweed', name: 'Seaweed', color: '#4fae5a', zone: 'reef', share: 0.25,
      tempMin: 10, tempOpt: 22, tempMax: 34 },
    { id: 'benthos', name: 'Shellfish & worms', color: '#e0a36b', zone: 'floor', share: 0.30,
      tempMin: 5, tempOpt: 18, tempMax: 31 },
    { id: 'pellets', name: 'Feed pellets', color: '#f4e3b0', zone: 'dropped', share: 0 },
  ];
  const PELLETS = FOOD_TYPES.findIndex(ft => ft.id === 'pellets');
  const NATURAL_FOOD = FOOD_TYPES.map((ft, i) => i).filter(i => FOOD_TYPES[i].share > 0);
  for (const sp of SPECIES) sp.eats = FOOD_TYPES.map(ft => ft.zone === 'dropped' || sp.diet.includes(ft.id));

  // A random kind of natural food, in proportion to its share.
  function pickNaturalFood() {
    let x = Math.random();
    for (const i of NATURAL_FOOD) {
      x -= FOOD_TYPES[i].share;
      if (x <= 0) return i;
    }
    return NATURAL_FOOD[NATURAL_FOOD.length - 1];
  }

  const FOOD_DECAY = {
    lifetimeAt20: 120,   // average seconds before uneaten food dies off or rots, at 20 degrees C
    q10: 2,              // this doubles in speed for every 10 degrees warmer
  };

  const lerp = (a, b, k) => a + (b - a) * Math.max(0, Math.min(1, k));

  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July',
                  'August', 'September', 'October', 'November', 'December'];

  // Scenarios drive the sea temperature over time while the simulation runs.
  // temperature(t) and phase(t) take seconds since the scenario started; events
  // happen once, at time `at`, and show their label on screen.
  // Time is compressed: one Aegean year lasts four minutes.
  const SCENARIOS = [
    {
      id: 'manual',
      name: 'Manual (use the slider)',
      info: 'You control the sea temperature with the slider. Aegean surface water is usually about 12–28 °C.',
    },
    {
      id: 'year',
      name: 'Aegean year',
      info: 'A sped-up Aegean year: about 15 °C in February, 26 °C in August. One year lasts 4 minutes. Plankton is most plentiful in the cooler months.',
      temperature: t => 20.5 + 5.5 * Math.sin((2 * Math.PI * t) / 240),
      phase: t => `${MONTHS[(4 + Math.floor(t / 20)) % 12]} · year ${Math.floor(t / 240) + 1}`,
    },
    {
      id: 'heatwave',
      name: 'Marine heatwave',
      info: 'A 25 °C summer sea heats to 31 °C for a minute, then cools. In summer 2024 Greek seas had their longest marine heatwaves on record, with the most heat built up over the season. Watch the sardines and the bluefish.',
      temperature: t => t < 40 ? 25 : t < 70 ? lerp(25, 31, (t - 40) / 30) : t < 130 ? 31 : lerp(31, 25, (t - 130) / 30),
      phase: t => t < 40 ? 'Before the heatwave' : t < 70 ? 'Heating up' : t < 130 ? 'Heatwave' : t < 160 ? 'Cooling down' : 'After the heatwave',
    },
    {
      id: 'north',
      name: 'North Aegean year (colder)',
      info: 'The north Aegean is colder: about 11 °C in February and 25 °C in August (one year = 4 minutes). Lionfish have recently been seen even here. Can they and the rabbitfish get through the winters?',
      temperature: t => 18 + 7 * Math.sin((2 * Math.PI * t) / 240),
      phase: t => `${MONTHS[(4 + Math.floor(t / 20)) % 12]} · year ${Math.floor(t / 240) + 1}`,
      events: [
        { at: 1, label: 'Two lionfish have reached the north Aegean', run: sim => sim.addPredators('lionfish', 2) },
      ],
    },
    {
      id: 'warming',
      name: 'Warming Aegean (sped up)',
      info: 'Aegean surface water has been warming by roughly 0.3–0.5 °C per decade since the 1980s. Here it warms 1 °C every 25 seconds, from 16 °C. Invaders from the south arrive once the sea is warm enough. Which native fish give way?',
      temperature: t => Math.min(32, 16 + t / 25),
      phase: t => `+${Math.min(16, t / 25).toFixed(1)} °C since the start`,
      events: [
        {
          at: 150, label: 'Warmer water: lionfish, toadfish and rabbitfish arrive from the south',
          run: sim => { sim.addPredators('lionfish', 3); sim.addPredators('toadfish', 2); sim.addFish('rabbitfish', 6); },
        },
      ],
    },
  ];

  // Blend from the old temperature into a new scenario over this many seconds.
  const SCENARIO_BLEND = 5;

  const THERMAL = {
    minBreedPerf: 0.2,   // too far from its best temperature to breed at all
    slowest: 0.4,        // top speed multiplier at the edge of the tolerable range
    stressCost: 2,       // extra energy per second outside the range...
    stressPerDegree: 1,  // ...plus this much per degree beyond it
    // Resting metabolism (the energy a fish burns just staying alive) rises with
    // temperature. Q10 = how many times faster it runs for every 10 degrees
    // warmer; about 2 for fish. It is set to 1 at each species' best temperature,
    // so warm water makes cool-water fish hungrier and cold water lets fish
    // get by on little food.
    q10: 2,
  };

  // How well a species performs at temperature T: perf 1 at its optimum,
  // falling to 0 at its limits; stress = degrees beyond the limits.
  function thermal(sp, T) {
    if (T <= sp.tempMin) return { perf: 0, stress: sp.tempMin - T };
    if (T >= sp.tempMax) return { perf: 0, stress: T - sp.tempMax };
    const x = T < sp.tempOpt
      ? (sp.tempOpt - T) / (sp.tempOpt - sp.tempMin)
      : (T - sp.tempOpt) / (sp.tempMax - sp.tempOpt);
    return { perf: 1 - x * x, stress: 0 };
  }

  // How fast resting metabolism runs at temperature T, relative to the
  // species' best temperature (see THERMAL.q10).
  function metabolism(sp, T) {
    return clamp(Math.pow(THERMAL.q10, (T - sp.tempOpt) / 10), 0.25, 4);
  }

  // Hiding places: Posidonia seagrass meadows and rocky reefs on the sea floor.
  // Bluefish can't see fish inside one (lionfish can, they hunt there), and each
  // has room for only so many.
  const REFUGE = {
    radius: 55,
    capacity: 12,
    seekRange: 300,      // a fleeing fish heads for a hiding place this close
  };

  // Shared biology of the predators: bigger, longer-lived, breed slowly.
  // Each species in PRED_SPECIES can override any of these in its `bio`.
  const PRED = {
    maxEnergy: 200,
    startEnergy: 120,
    reproduceAt: 180,
    reproduceCost: 150,
    childEnergy: 80,
    maturityAge: 60,
    breedCooldown: 70,
    lifespanMin: 160,
    lifespanMax: 240,
    huntBelow: 160,      // a well-fed predator stops hunting
    preySwitching: 1,    // 0 = always chase the nearest fish; higher = favour whichever species is most common
    digestTime: 6,       // rests after every catch, which limits how much it can eat
    lungeRange: 60,      // sprints when this close to its prey...
    lungeBoost: 1.5,     // ...at this multiple of its top speed
    personalSpace: 30,
    turnRate: 2.5,       // less agile than the small fish, so prey can dodge
    cruiseSpeed: 25,
    mutation: 0.07,
  };

  // Traits that are inherited (with mutation) from parent to child.
  const TRAIT_LIMITS = {
    speed: [20, 160],    // top swimming speed
    sense: [20, 260],    // how far away the fish can spot food (and predators)
    predSpeed: [30, 200],
    predSense: [40, 320],
  };

  const FISH_BIO = SPECIES.map(sp => Object.assign({}, BIO, sp.bio));
  const PRED_BIO = PRED_SPECIES.map(sp => Object.assign({}, PRED, sp.bio));

  // The tank is a patch of the Aegean, not a closed aquarium: when a species
  // that lives here becomes rare, a few more swim in from the surrounding sea
  // (the "rescue effect"), but only if the water temperature suits them.
  const OPEN_SEA = {
    interval: 20,        // seconds between arrivals
    fishBelow: 5,        // a fish species this rare gets newcomers...
    fishArrive: 3,       // ...this many at a time
    predBelow: 2,        // same for each predator species
    predArrive: 1,
  };

  const DEFAULT_SETTINGS = {
    startFish: 40,
    startFood: 120,
    foodRate: 9,         // natural food appearing per second (all kinds together)
    foodEnergy: 30,      // energy gained per bite
    maxFood: 500,        // most food in the water, shared out between the kinds
    startPredators: { bluefish: 3, lionfish: 0, grouper: 0, toadfish: 0 },
    preyEnergy: 35,      // energy a predator gains per fish eaten
    fishFlee: true,      // do fish try to escape predators?
    refuges: 3,          // number of hiding places
    openSea: true,       // fish and predators can swim in from the surrounding sea
    temperature: 20,     // water temperature, degrees C (set by the scenario, if one is running)
    foodFollowsTemp: true, // food growth and die-off depend on temperature
    species: { sardine: true, anchovy: true, seabass: true, seabream: true, redmullet: true, rabbitfish: true, parrotfish: true }, // which fish to start with
    maxFish: 1000,       // hard caps to keep the browser responsive
    maxPredators: 150,
  };

  function rand(a, b) { return a + Math.random() * (b - a); }

  function gauss() { // standard normal, Box-Muller
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }

  function clamp(x, lo, hi) { return x < lo ? lo : x > hi ? hi : x; }

  function mutate(value, amount, limits) {
    return clamp(value * (1 + gauss() * amount), limits[0], limits[1]);
  }

  // Uniform grid so "what is near me?" doesn't have to check every object.
  class Grid {
    constructor(cellSize) {
      this.size = cellSize;
      this.cols = Math.ceil(WORLD_W / cellSize);
      this.rows = Math.ceil(WORLD_H / cellSize);
      this.cells = Array.from({ length: this.cols * this.rows }, () => []);
    }

    clear() {
      for (const c of this.cells) c.length = 0;
    }

    insert(item) {
      const cx = clamp((item.x / this.size) | 0, 0, this.cols - 1);
      const cy = clamp((item.y / this.size) | 0, 0, this.rows - 1);
      this.cells[cy * this.cols + cx].push(item);
    }

    forEachNear(x, y, r, fn) {
      const s = this.size;
      const x0 = clamp(((x - r) / s) | 0, 0, this.cols - 1);
      const x1 = clamp(((x + r) / s) | 0, 0, this.cols - 1);
      const y0 = clamp(((y - r) / s) | 0, 0, this.rows - 1);
      const y1 = clamp(((y + r) / s) | 0, 0, this.rows - 1);
      for (let cy = y0; cy <= y1; cy++) {
        for (let cx = x0; cx <= x1; cx++) {
          const cell = this.cells[cy * this.cols + cx];
          for (let i = 0; i < cell.length; i++) fn(cell[i]);
        }
      }
    }
  }

  let nextId = 1;

  // Shared by fish and predators: position, heading, age and energy.
  class Swimmer {
    constructor(x, y, traits, generation, bio) {
      this.id = nextId++;
      this.x = x;
      this.y = y;
      this.wander = rand(0, Math.PI * 2);
      this.vx = Math.cos(this.wander) * 10;
      this.vy = Math.sin(this.wander) * 10;
      this.speed = traits.speed;
      this.sense = traits.sense;
      this.generation = generation;
      this.energy = bio.startEnergy;
      this.age = 0;
      this.lifespan = rand(bio.lifespanMin, bio.lifespanMax);
      this.cooldown = 0;
      this.phase = rand(0, 10);       // tail animation
      this.dead = null;               // cause of death once dead
    }
  }

  class Fish extends Swimmer {
    constructor(x, y, traits, generation) {
      super(x, y, traits, generation, FISH_BIO[traits.species]);
      this.bio = FISH_BIO[traits.species];
      this.species = traits.species;  // index into SPECIES
      this.hue = traits.hue;          // species colour with small inherited variation
      this.fleeing = false;
      this.hidden = false;            // inside a hiding place with room for it
      this.schoolmates = 0;           // same-species fish close by (schooling species only)
    }

    // Fry grow into adults.
    get radius() { return 3 + 4 * Math.min(1, this.age / this.bio.maturityAge); }
  }

  class Predator extends Swimmer {
    constructor(x, y, traits, generation) {
      super(x, y, traits, generation, PRED_BIO[traits.species]);
      this.species = traits.species;  // index into PRED_SPECIES
      this.bio = PRED_BIO[traits.species];
      this.home = Math.floor(rand(0, 100)); // ambush hunters stay near one hiding place
      this.hunting = false;
      this.digest = 0;
    }

    get radius() { return 6 + 7 * Math.min(1, this.age / this.bio.maturityAge); }
  }

  // Direction that steers a cruising swimmer away from the tank walls (or null).
  function wallPush(a, margin) {
    let wx = 0, wy = 0;
    if (a.x < margin) wx = (margin - a.x) / margin;
    else if (a.x > WORLD_W - margin) wx = -(a.x - (WORLD_W - margin)) / margin;
    if (a.y < margin) wy = (margin - a.y) / margin;
    else if (a.y > FLOOR - margin) wy = -(a.y - (FLOOR - margin)) / margin;
    return wx || wy ? [wx, wy] : null;
  }

  // Random cruising with a gentle turn away from walls. Returns a direction.
  function wanderDirection(a, dt) {
    a.wander += gauss() * 1.2 * Math.sqrt(dt);
    let dx = Math.cos(a.wander);
    let dy = Math.sin(a.wander);
    const w = wallPush(a, 60);
    if (w) {
      dx += w[0] * 2;
      dy += w[1] * 2;
      a.wander = Math.atan2(dy, dx);
    }
    return [dx, dy];
  }

  // Turn gradually towards (dx, dy) at the desired speed, then move.
  function swim(a, dx, dy, desiredSpeed, turnRate, dt) {
    const len = Math.hypot(dx, dy) || 1;
    const k = Math.min(1, dt * turnRate);
    a.vx += ((dx / len) * desiredSpeed - a.vx) * k;
    a.vy += ((dy / len) * desiredSpeed - a.vy) * k;
    a.x = clamp(a.x + a.vx * dt, 4, WORLD_W - 4);
    a.y = clamp(a.y + a.vy * dt, 4, FLOOR - 4);
    const v = Math.hypot(a.vx, a.vy);
    a.phase += dt * (2 + v * 0.15);
    return v;
  }

  class Simulation {
    constructor(settings) {
      this.settings = Object.assign({}, DEFAULT_SETTINGS, settings);
      // Copy the nested object too, so changing it never alters the defaults.
      this.settings.species = Object.assign({}, DEFAULT_SETTINGS.species, settings && settings.species);
      this.settings.startPredators = Object.assign({}, DEFAULT_SETTINGS.startPredators,
        settings && settings.startPredators);
      this.setScenario('manual');
      this.foodGrid = new Grid(40);
      this.fishGrid = new Grid(30);
      this.reset();
    }

    reset() {
      const s = this.settings;
      this.time = 0;
      this.fish = [];
      this.predators = [];
      this.food = [];
      this.refuges = [];
      this.buildRefuges();
      this.foodDebt = FOOD_TYPES.map(() => 0);
      this.foodGrowth = FOOD_TYPES.map(() => 1);
      this.foodCount = FOOD_TYPES.map(() => 0);
      // Restart a running scenario from the beginning with the new population.
      if (this.scenario) this.setScenario(this.scenario.id);
      this.events = []; // things the renderer may want to animate, e.g. a fish being eaten
      this.present = { fish: new Set(), pred: new Set() }; // species that live here
      this.openSeaTimer = 0;
      this.stats = {
        births: 0, starved: 0, oldAge: 0, eaten: 0, thermal: 0, peak: 0, maxGeneration: 1, arrived: 0,
        predBirths: 0, predStarved: 0, predOldAge: 0, predThermal: 0, predPeak: 0,
      };
      this.updateThermal();
      this.history = [];
      this.historyInterval = 0.5;
      this.historyTimer = 0;

      const chosen = SPECIES.map((sp, i) => i).filter(i => s.species[SPECIES[i].id]);
      for (let i = 0; chosen.length && i < s.startFish; i++) this.spawnFish(chosen[i % chosen.length]);
      for (const sp of PRED_SPECIES) this.addPredators(sp.id, s.startPredators[sp.id] || 0);
      for (let i = 0; i < s.startFood; i++) this.growFood(pickNaturalFood());
      this.stats.peak = this.fish.length;
      this.stats.predPeak = this.predators.length;
      this.recordHistory();
    }

    // A fish of the given species at a random spot; a mix of fry and adults.
    spawnFish(species, x, y) {
      if (this.fish.length >= this.settings.maxFish) return null;
      this.present.fish.add(species);
      const f = new Fish(
        x !== undefined ? x : rand(50, WORLD_W - 50), y !== undefined ? y : rand(50, FLOOR - 50),
        { speed: rand(50, 70), sense: rand(70, 110), species, hue: SPECIES[species].hue + rand(-12, 12) },
        1
      );
      f.age = rand(0, f.bio.maturityAge * 1.5);
      f.energy = rand(40, 70);
      this.fish.push(f);
      return f;
    }

    addFish(speciesId, count) {
      const i = SPECIES.findIndex(sp => sp.id === speciesId);
      for (let k = 0; i >= 0 && k < count; k++) this.spawnFish(i);
    }

    // An adult predator at a random spot, with its species' average traits.
    addPredator(speciesId) {
      if (this.predators.length >= this.settings.maxPredators) return null;
      const species = Math.max(0, PRED_SPECIES.findIndex(sp => sp.id === speciesId));
      const sp = PRED_SPECIES[species];
      const kin = this.predators.filter(p => p.species === species);
      const speed = kin.length ? kin.reduce((a, p) => a + p.speed, 0) / kin.length : sp.speed;
      const sense = kin.length ? kin.reduce((a, p) => a + p.sense, 0) / kin.length : sp.sense;
      this.present.pred.add(species);
      const p = new Predator(rand(60, WORLD_W - 60), rand(60, FLOOR - 60), {
        species,
        speed: mutate(speed, 0.05, TRAIT_LIMITS.predSpeed),
        sense: mutate(sense, 0.05, TRAIT_LIMITS.predSense),
      }, 1);
      p.age = rand(p.bio.maturityAge, p.bio.maturityAge * 2);
      // Ambush hunters start at their home reef.
      if (sp.ambush && this.refuges.length) {
        const r = this.refuges[p.home % this.refuges.length];
        p.x = clamp(r.x + rand(-1, 1) * r.radius, 10, WORLD_W - 10);
        p.y = r.y - rand(0, r.radius);
      }
      this.predators.push(p);
      this.stats.predPeak = Math.max(this.stats.predPeak, this.predators.length);
      return p;
    }

    // Newcomers from the open sea for species that live here but have become rare.
    openSeaArrivals() {
      const edgeX = () => (Math.random() < 0.5 ? 8 : WORLD_W - 8);
      for (const i of this.present.fish) {
        if (this.speciesCount[i] >= OPEN_SEA.fishBelow) continue;
        if (this.thermal[i].perf < THERMAL.minBreedPerf) continue;
        const [d0, d1] = SPECIES[i].depth;
        for (let k = 0; k < OPEN_SEA.fishArrive; k++) {
          const f = this.spawnFish(i, edgeX(), rand(d0, d1) * (FLOOR - 10));
          if (f) {
            f.age = f.bio.maturityAge;
            this.stats.arrived++;
          }
        }
      }
      for (const i of this.present.pred) {
        const count = this.predators.reduce((n, p) => n + (p.species === i), 0);
        if (count >= OPEN_SEA.predBelow || this.predThermal[i].perf < THERMAL.minBreedPerf) continue;
        for (let k = 0; k < OPEN_SEA.predArrive; k++) {
          const p = this.addPredator(PRED_SPECIES[i].id);
          if (p) {
            p.x = edgeX();
            this.stats.arrived++;
          }
        }
        if (count === 0) {
          this.events.push({ type: 'notice', text: `A ${PRED_SPECIES[i].name.toLowerCase()} swam in from the open sea`, time: this.time });
        }
      }
    }

    addPredators(speciesId, count) {
      for (let k = 0; k < count; k++) this.addPredator(speciesId);
    }

    // How each species copes with the current water temperature.
    updateThermal() {
      const T = this.settings.temperature;
      this.thermal = SPECIES.map(sp => thermal(sp, T));
      this.predThermal = PRED_SPECIES.map(sp => thermal(sp, T));
      this.metabolism = SPECIES.map(sp => metabolism(sp, T));
      this.predMetabolism = PRED_SPECIES.map(sp => metabolism(sp, T));
    }

    // Start a scenario from the current moment, without resetting the fish.
    setScenario(id) {
      this.scenario = SCENARIOS.find(sc => sc.id === id) || SCENARIOS[0];
      this.scenarioStart = this.time || 0;
      this.scenarioFromTemp = this.settings.temperature;
      this.scenarioFired = new Set(); // events that have already happened
    }

    scenarioTime() {
      return this.time - this.scenarioStart;
    }

    scenarioPhase() {
      return this.scenario.phase ? this.scenario.phase(this.scenarioTime()) : '';
    }

    removePredators() {
      this.predators = [];
    }

    // Evenly spaced along the bottom of the tank.
    buildRefuges() {
      const n = this.settings.refuges;
      this.refuges = Array.from({ length: n }, (_, i) => ({
        x: (WORLD_W * (i + 1)) / (n + 1),
        y: FLOOR - 20,
        radius: REFUGE.radius,
        capacity: REFUGE.capacity,
        count: 0,
      }));
    }

    // Fill each hiding place up to capacity with the fish inside it.
    updateHiding() {
      for (const r of this.refuges) r.count = 0;
      for (const f of this.fish) {
        f.hidden = false;
        for (const r of this.refuges) {
          const dx = f.x - r.x, dy = f.y - r.y;
          if (dx * dx + dy * dy < r.radius * r.radius) {
            if (r.count < r.capacity) {
              r.count++;
              f.hidden = true;
            }
            break;
          }
        }
      }
    }

    nearestRefugeWithRoom(f) {
      let best = null;
      let bestD2 = REFUGE.seekRange * REFUGE.seekRange;
      for (const r of this.refuges) {
        if (r.count >= r.capacity) continue;
        const dx = r.x - f.x, dy = r.y - f.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < bestD2) {
          bestD2 = d2;
          best = r;
        }
      }
      return best;
    }

    // A new bit of natural food, placed where that kind grows.
    growFood(type) {
      const ft = FOOD_TYPES[type];
      if (ft.zone === 'water') return this.spawnFood(type, rand(10, WORLD_W - 10), rand(10, FLOOR - 30));
      if (ft.zone === 'floor') return this.spawnFood(type, rand(10, WORLD_W - 10), FLOOR - rand(0, 5));
      // Seaweed grows mostly on the reefs and seagrass beds, some on open sand.
      if (this.refuges.length && Math.random() < 0.7) {
        const r = this.refuges[Math.floor(Math.random() * this.refuges.length)];
        return this.spawnFood(type, r.x + rand(-1, 1) * r.radius * 0.9, FLOOR - rand(0, 35));
      }
      return this.spawnFood(type, rand(10, WORLD_W - 10), FLOOR - rand(0, 10));
    }

    spawnFood(type, x, y) {
      const cap = type === PELLETS ? this.settings.maxFood : this.settings.maxFood * FOOD_TYPES[type].share;
      if (this.foodCount[type] >= cap) return false;
      this.foodCount[type]++;
      this.food.push({ type, x, y, sink: rand(4, 10), drift: rand(0, Math.PI * 2), eaten: false });
      return true;
    }

    // Feed pellets dropped by the user (click/tap on the tank).
    dropFood(x, y, count) {
      for (let i = 0; i < count; i++) {
        this.spawnFood(PELLETS,
          clamp(x + gauss() * 18, 5, WORLD_W - 5),
          clamp(y + gauss() * 18, 5, FLOOR)
        );
      }
    }

    step(dt) {
      const s = this.settings;
      this.time += dt;

      // 0. A running scenario sets the water temperature.
      if (this.scenario.temperature) {
        const t = this.scenarioTime();
        s.temperature = lerp(this.scenarioFromTemp, this.scenario.temperature(t), t / SCENARIO_BLEND);
      }
      for (const ev of this.scenario.events || []) {
        if (!this.scenarioFired.has(ev) && this.scenarioTime() >= ev.at) {
          this.scenarioFired.add(ev);
          ev.run(this);
          this.events.push({ type: 'notice', text: ev.label, time: this.time });
        }
      }

      // 1. Natural food grows where it lives, faster or slower with temperature,
      //    and old food dies off or rots.
      for (const i of NATURAL_FOOD) {
        const ft = FOOD_TYPES[i];
        this.foodGrowth[i] = s.foodFollowsTemp ? thermal(ft, s.temperature).perf : 1;
        this.foodDebt[i] += s.foodRate * ft.share * this.foodGrowth[i] * dt;
        while (this.foodDebt[i] >= 1) {
          this.foodDebt[i] -= 1;
          this.growFood(i);
        }
      }
      if (s.foodFollowsTemp) {
        const rotChance = (dt / FOOD_DECAY.lifetimeAt20) * Math.pow(FOOD_DECAY.q10, (s.temperature - 20) / 10);
        for (const p of this.food) if (Math.random() < rotChance) p.eaten = true; // removed below
      }

      // 2. Plankton drifts; pellets sink and settle on the sand; seaweed and
      //    shellfish stay put.
      for (const p of this.food) {
        if (p.type === PELLETS) {
          if (p.y < FLOOR) {
            p.y = Math.min(FLOOR, p.y + p.sink * dt);
            p.x = clamp(p.x + Math.sin(this.time * 0.8 + p.drift) * 4 * dt, 2, WORLD_W - 2);
          }
        } else if (FOOD_TYPES[p.type].zone === 'water') {
          p.x = clamp(p.x + Math.sin(this.time * 0.6 + p.drift) * 5 * dt, 2, WORLD_W - 2);
          p.y = clamp(p.y + Math.cos(this.time * 0.4 + p.drift * 2) * 3 * dt, 8, FLOOR - 20);
        }
      }

      // 3. Rebuild the spatial indexes.
      this.foodGrid.clear();
      for (const p of this.food) this.foodGrid.insert(p);
      this.fishGrid.clear();
      for (const f of this.fish) this.fishGrid.insert(f);
      if (this.refuges.length !== s.refuges) this.buildRefuges();
      this.updateThermal();
      this.updateHiding();
      this.speciesCount = SPECIES.map(() => 0);
      for (const f of this.fish) this.speciesCount[f.species]++;
      this.openSeaTimer += dt;
      if (this.openSeaTimer >= OPEN_SEA.interval) {
        this.openSeaTimer = 0;
        if (s.openSea) this.openSeaArrivals();
      }

      // 4. Every fish, then every predator, thinks, moves, eats, breeds or dies.
      const babies = [];
      for (const f of this.fish) this.updateFish(f, dt, babies);
      const predBabies = [];
      for (const p of this.predators) this.updatePredator(p, dt, predBabies);

      // 5. Remove what was eaten or died, add the newborns.
      this.food = this.food.filter(p => !p.eaten);
      this.foodCount.fill(0);
      for (const p of this.food) this.foodCount[p.type]++;
      this.fish = this.fish.filter(f => !f.dead);
      this.predators = this.predators.filter(p => !p.dead);
      for (const b of babies) this.fish.push(b);
      for (const b of predBabies) this.predators.push(b);

      this.stats.peak = Math.max(this.stats.peak, this.fish.length);
      this.stats.predPeak = Math.max(this.stats.predPeak, this.predators.length);
      if (this.events.length > 200) this.events.splice(0, this.events.length - 200);

      this.historyTimer += dt;
      if (this.historyTimer >= this.historyInterval) {
        this.historyTimer = 0;
        this.recordHistory();
      }
    }

    updateFish(f, dt, babies) {
      f.age += dt;
      f.cooldown = Math.max(0, f.cooldown - dt);

      // Cold or overheated fish are sluggish.
      const th = this.thermal[f.species];
      const top = f.speed * (THERMAL.slowest + (1 - THERMAL.slowest) * th.perf);

      // Decide where to go: away from predators, else to the nearest food, else wander.
      let dir, desiredSpeed;
      let feeding = false;
      const threat = this.settings.fishFlee ? this.escapeDirection(f) : null;
      f.fleeing = !!threat;

      if (threat && f.hidden) {
        // Safe in a hiding place: stay put until the danger has gone,
        // nibbling any food that has settled inside it.
        const r = this.refugeOf(f);
        const food = f.energy < BIO.hungryBelow ? this.nearestFood(f, r) : null;
        if (food) {
          dir = this.approachFood(f, food);
          desiredSpeed = top * 0.3;
          feeding = true;
        } else {
          dir = [r.x - f.x + gauss() * 20, r.y - f.y + gauss() * 20];
          desiredSpeed = 6;
        }
      } else if (threat) {
        // Dash for a hiding place if one is near, otherwise just get away.
        const r = this.nearestRefugeWithRoom(f);
        if (r) {
          const tx = r.x - f.x, ty = r.y - f.y;
          const tl = Math.hypot(tx, ty) || 1;
          const el = Math.hypot(threat[0], threat[1]) || 1;
          dir = [tx / tl + (threat[0] / el) * 0.6, ty / tl + (threat[1] / el) * 0.6];
        } else {
          dir = threat;
        }
        desiredSpeed = top;
      } else {
        const target = f.energy < BIO.hungryBelow ? this.nearestFood(f) : null;
        if (target) {
          const d = Math.hypot(target.x - f.x, target.y - f.y);
          dir = this.approachFood(f, target);
          // Slow down on arrival so fish don't orbit their food.
          desiredSpeed = top * Math.max(0.25, Math.min(1, d / 40));
          feeding = true;
        } else {
          dir = this.cruiseDirection(f, dt);
          desiredSpeed = Math.min(top, BIO.cruiseSpeed);
        }
      }

      // Keep a little personal space from neighbours.
      const ps = BIO.personalSpace;
      let sx = 0, sy = 0;
      this.fishGrid.forEachNear(f.x, f.y, ps, o => {
        if (o === f) return;
        const ox = f.x - o.x, oy = f.y - o.y;
        const d2 = ox * ox + oy * oy;
        if (d2 > 0 && d2 < ps * ps) {
          const d = Math.sqrt(d2);
          sx += (ox / d) * (1 - d / ps);
          sy += (oy / d) * (1 - d / ps);
        }
      });
      let dl = Math.hypot(dir[0], dir[1]) || 1;
      dir = [dir[0] / dl, dir[1] / dl];

      // Schooling: swim the same way as nearby fish of the same kind and keep
      // close to them, unless busy feeding.
      f.schoolmates = 0;
      if (SPECIES[f.species].schools) {
        const sr = BIO.schoolRadius;
        let ax = 0, ay = 0, cx = 0, cy = 0, n = 0;
        this.fishGrid.forEachNear(f.x, f.y, sr, o => {
          if (o === f || o.species !== f.species) return;
          if ((o.x - f.x) ** 2 + (o.y - f.y) ** 2 > sr * sr) return;
          ax += o.vx; ay += o.vy; cx += o.x; cy += o.y; n++;
        });
        f.schoolmates = n;
        if (n) {
          // Strong pull while cruising or fleeing, a gentle one while feeding.
          const pull = feeding ? 0.3 : threat ? 0.8 : 1.5;
          const al = Math.hypot(ax, ay) || 1;
          const tx = cx / n - f.x, ty = cy / n - f.y;
          const tl = Math.hypot(tx, ty) || 1;
          dir = [dir[0] + ((ax / al) + (tx / tl)) * pull, dir[1] + ((ay / al) + (ty / tl)) * pull];
        }
      }

      dl = Math.hypot(dir[0], dir[1]) || 1;
      const v = swim(f, dir[0] / dl + sx * 1.5, dir[1] / dl + sy * 1.5, desiredSpeed, BIO.turnRate, dt);

      // Energy use: staying alive, plus upkeep of muscles (fast fish) and eyes,
      // all faster in warmer water, plus swimming, whose cost rises with the
      // cube of speed like drag in real water.
      const upkeep = (0.2 + f.speed * 0.006 + f.sense * 0.004) * this.metabolism[f.species];
      f.energy -= (upkeep + Math.pow(v / 60, 3) * 0.9) * dt;
      if (th.stress) f.energy -= (THERMAL.stressCost + th.stress * THERMAL.stressPerDegree) * dt;

      if (f.energy <= 0) {
        if (th.stress) {
          f.dead = 'temperature';
          this.stats.thermal++;
        } else {
          f.dead = 'starved';
          this.stats.starved++;
        }
        return;
      }
      if (f.age >= f.lifespan) {
        f.dead = 'old age';
        this.stats.oldAge++;
        return;
      }

      // Away from its best temperature a fish breeds less often, or not at all.
      if (f.energy >= f.bio.reproduceAt && f.age >= f.bio.maturityAge && f.cooldown === 0 &&
          th.perf >= THERMAL.minBreedPerf &&
          this.fish.length + babies.length < this.settings.maxFish) {
        f.energy -= f.bio.reproduceCost;
        f.cooldown = f.bio.breedCooldown / th.perf;
        babies.push(this.makeFishChild(f));
        this.stats.births++;
      }
    }

    // Cruising fish wander, but keep to their species' depth zone, and reef
    // grazers stay near a reef or seagrass bed, which is where their food is.
    cruiseDirection(f, dt) {
      const sp = SPECIES[f.species];
      const dir = wanderDirection(f, dt);
      const top = sp.depth[0] * FLOOR, bottom = sp.depth[1] * FLOOR;
      if (f.y < top) dir[1] += Math.min(1.5, (top - f.y) / 60);
      else if (f.y > bottom) dir[1] -= Math.min(1.5, (f.y - bottom) / 60);
      if (sp.reefs && this.refuges.length) {
        const r = this.refuges[f.id % this.refuges.length];
        const hx = r.x - f.x, hy = r.y - f.y;
        const hd = Math.hypot(hx, hy);
        if (hd > r.radius * 1.3) {
          dir[0] += (hx / hd) * 1.2;
          dir[1] += (hy / hd) * 1.2;
        }
      }
      if (dir[0] !== Math.cos(f.wander) || dir[1] !== Math.sin(f.wander)) f.wander = Math.atan2(dir[1], dir[0]);
      return dir;
    }

    // Away from every predator the fish can see, closer ones counting more.
    escapeDirection(f) {
      if (!this.predators.length) return null;
      const r = Math.max(30, f.sense * BIO.alertness);
      let ex = 0, ey = 0, seen = false;
      for (const p of this.predators) {
        const rp = r * PRED_SPECIES[p.species].preyAlert; // unfamiliar predators are spotted late
        const ox = f.x - p.x, oy = f.y - p.y;
        const d2 = ox * ox + oy * oy;
        if (d2 < rp * rp) {
          const d = Math.sqrt(d2) || 1;
          const w = 1 - d / rp;
          ex += (ox / d) * w;
          ey += (oy / d) * w;
          seen = true;
        }
      }
      if (!seen) return null;
      // Being cornered is deadly, so also push away from walls.
      const el = Math.hypot(ex, ey) || 1;
      const w = wallPush(f, 50);
      return w ? [ex / el + w[0], ey / el + w[1]] : [ex, ey];
    }

    updatePredator(p, dt, babies) {
      p.age += dt;
      p.cooldown = Math.max(0, p.cooldown - dt);
      p.digest = Math.max(0, p.digest - dt);

      const sp = PRED_SPECIES[p.species];
      const bio = p.bio;
      const th = this.predThermal[p.species];
      const top = p.speed * (THERMAL.slowest + (1 - THERMAL.slowest) * th.perf);

      let dir, desiredSpeed;
      const prey = p.energy < bio.huntBelow && p.digest === 0 ? this.nearestFish(p) : null;
      p.hunting = !!prey;

      if (prey) {
        const dx = prey.x - p.x, dy = prey.y - p.y;
        const d = Math.hypot(dx, dy) || 1;
        dir = [dx, dy];
        desiredSpeed = d < bio.lungeRange ? top * bio.lungeBoost : top;
        if (d < p.radius + prey.radius * 0.6) {
          // A fish in a school is hard to single out: the strike may miss.
          if (Math.random() < 1 / (1 + BIO.confusion * prey.schoolmates)) {
            prey.dead = 'eaten';
            p.digest = bio.digestTime;
            this.stats.eaten++;
            p.energy = Math.min(bio.maxEnergy, p.energy + this.settings.preyEnergy);
            this.events.push({ type: 'eaten', x: prey.x, y: prey.y, time: this.time });
          } else {
            p.digest = 0.8; // confused, breaks off the attack for a moment
            this.stats.missed = (this.stats.missed || 0) + 1;
          }
        }
      } else {
        dir = wanderDirection(p, dt);
        desiredSpeed = Math.min(top, bio.cruiseSpeed);
        // Ambush hunters drift back to their reef or seagrass bed.
        if (sp.ambush && this.refuges.length) {
          const r = this.refuges[p.home % this.refuges.length];
          const hx = r.x - p.x, hy = r.y - p.y;
          const hd = Math.hypot(hx, hy);
          if (hd > r.radius * 1.5) dir = [dir[0] + (hx / hd) * 1.5, dir[1] + (hy / hd) * 1.5];
        }
      }

      // Predators spread out rather than hunting in a clump.
      let sx = 0, sy = 0;
      const ps = bio.personalSpace;
      for (const o of this.predators) {
        if (o === p) continue;
        const ox = p.x - o.x, oy = p.y - o.y;
        const d2 = ox * ox + oy * oy;
        if (d2 > 0 && d2 < ps * ps) {
          const d = Math.sqrt(d2);
          sx += (ox / d) * (1 - d / ps);
          sy += (oy / d) * (1 - d / ps);
        }
      }
      const dl = Math.hypot(dir[0], dir[1]) || 1;
      const v = swim(p, dir[0] / dl + sx, dir[1] / dl + sy, desiredSpeed, bio.turnRate, dt);

      const upkeep = (0.4 + p.speed * 0.005 + p.sense * 0.002) * this.predMetabolism[p.species];
      p.energy -= (upkeep + Math.pow(v / 80, 3) * 1.5) * dt;
      // Predators carry more energy, so stress drains them twice as fast.
      if (th.stress) p.energy -= (THERMAL.stressCost + th.stress * THERMAL.stressPerDegree) * 2 * dt;

      if (p.energy <= 0) {
        if (th.stress) {
          p.dead = 'temperature';
          this.stats.predThermal++;
        } else {
          p.dead = 'starved';
          this.stats.predStarved++;
        }
        return;
      }
      if (p.age >= p.lifespan) {
        p.dead = 'old age';
        this.stats.predOldAge++;
        return;
      }

      if (p.energy >= bio.reproduceAt && p.age >= bio.maturityAge && p.cooldown === 0 &&
          th.perf >= THERMAL.minBreedPerf &&
          this.predators.length + babies.length < this.settings.maxPredators) {
        p.energy -= bio.reproduceCost;
        p.cooldown = bio.breedCooldown / th.perf;
        const child = new Predator(p.x + rand(-8, 8), p.y + rand(-8, 8), {
          species: p.species,
          speed: mutate(p.speed, bio.mutation, TRAIT_LIMITS.predSpeed),
          sense: mutate(p.sense, bio.mutation, TRAIT_LIMITS.predSense),
        }, p.generation + 1);
        child.home = p.home;
        child.energy = bio.childEnergy;
        babies.push(child);
        this.stats.predBirths++;
      }
    }

    // Direction to a pellet; eats it if close enough.
    approachFood(f, food) {
      const dx = food.x - f.x, dy = food.y - f.y;
      if (Math.hypot(dx, dy) < f.radius + BIO.eatRadius) {
        food.eaten = true;
        f.energy = Math.min(BIO.maxEnergy, f.energy + this.settings.foodEnergy);
      }
      return [dx, dy];
    }

    refugeOf(f) {
      for (const r of this.refuges) {
        if ((f.x - r.x) ** 2 + (f.y - r.y) ** 2 < r.radius * r.radius) return r;
      }
      return null;
    }

    // Nearest food in sight that this species eats, optionally only inside a
    // given hiding place.
    nearestFood(f, within) {
      let best = null;
      let bestD2 = f.sense * f.sense;
      const eats = SPECIES[f.species].eats;
      this.foodGrid.forEachNear(f.x, f.y, f.sense, p => {
        if (p.eaten || !eats[p.type]) return;
        if (within && (p.x - within.x) ** 2 + (p.y - within.y) ** 2 > within.radius * within.radius) return;
        const dx = p.x - f.x, dy = p.y - f.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < bestD2) {
          bestD2 = d2;
          best = p;
        }
      });
      return best;
    }

    nearestFish(p) {
      let best = null;
      let bestD2 = p.sense * p.sense;
      const seesHidden = PRED_SPECIES[p.species].ambush; // lionfish hunt inside reefs
      // Prey switching: common species look like better targets than rare ones,
      // which gives a species that has become rare a chance to recover.
      const total = this.fish.length || 1;
      const k = p.bio.preySwitching;
      let bestScore = Infinity;
      this.fishGrid.forEachNear(p.x, p.y, p.sense, f => {
        if (f.dead || (f.hidden && !seesHidden)) return;
        const dx = f.x - p.x, dy = f.y - p.y;
        const d2 = dx * dx + dy * dy;
        if (d2 >= bestD2) return;
        const score = d2 / Math.pow(0.25 + this.speciesCount[f.species] / total, k);
        if (score < bestScore) {
          bestScore = score;
          best = f;
        }
      });
      return best;
    }

    makeFishChild(parent) {
      const traits = {
        speed: mutate(parent.speed, BIO.mutation, TRAIT_LIMITS.speed),
        sense: mutate(parent.sense, BIO.mutation, TRAIT_LIMITS.sense),
        species: parent.species,
        hue: clamp(parent.hue + gauss() * 3, SPECIES[parent.species].hue - 18, SPECIES[parent.species].hue + 18),
      };
      const child = new Fish(parent.x + rand(-5, 5), parent.y + rand(-5, 5), traits, parent.generation + 1);
      child.energy = child.bio.childEnergy;
      this.stats.maxGeneration = Math.max(this.stats.maxGeneration, child.generation);
      return child;
    }

    summary() {
      const avg = (list, key) => list.length ? list.reduce((a, x) => a + x[key], 0) / list.length : 0;
      return {
        time: this.time,
        fish: this.fish.length,
        bySpecies: SPECIES.map((_, i) => this.fish.reduce((n, f) => n + (f.species === i), 0)),
        food: this.food.length,
        foodByType: this.foodCount.slice(),
        predators: this.predators.length,
        predBySpecies: PRED_SPECIES.map((_, i) => this.predators.reduce((n, p) => n + (p.species === i), 0)),
        avgSpeed: avg(this.fish, 'speed'),
        avgSense: avg(this.fish, 'sense'),
        predSpeed: avg(this.predators, 'speed'),
        predSense: avg(this.predators, 'sense'),
        temperature: this.settings.temperature,
      };
    }

    // Keeps the whole run on the chart: when the history gets long,
    // drop every other point and sample half as often.
    recordHistory() {
      this.history.push(this.summary());
      if (this.history.length > 600) {
        this.history = this.history.filter((_, i) => i % 2 === 0);
        this.historyInterval *= 2;
      }
    }
  }

  global.FishSim = { Simulation, BIO, PRED, REFUGE, OPEN_SEA, SPECIES, PRED_SPECIES, FOOD_TYPES, PELLETS, SCENARIOS, THERMAL, thermal, metabolism, DEFAULT_SETTINGS, WORLD_W, WORLD_H, SAND_H, FLOOR };
})(typeof window !== 'undefined' ? window : globalThis);

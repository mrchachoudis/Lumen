/*
 * Drawing, controls and the main loop for the Aegean fish simulator.
 * Reads state from the Simulation in sim.js; all population logic lives there.
 */
(function () {
  'use strict';

  const { Simulation, BIO, SPECIES, PRED_SPECIES, FOOD_TYPES, PELLETS, SCENARIOS, thermal,
          WORLD_W, WORLD_H, FLOOR } = window.FishSim;

  const speciesColor = sp => `hsl(${sp.hue}, 70%, 62%)`;
  const FOOD_COLOR = '#9bd35a';     // chart line for all food together
  const NATURAL_FOOD = FOOD_TYPES.filter(ft => ft.share > 0);
  const T_MAX = 40;                 // top of the temperature slider
  const AEGEAN_RANGE = [12, 28];    // typical Aegean surface temperatures, shaded on the chart

  const STEP = 1 / 30;              // fixed simulation step (sim seconds)
  const MAX_STEPS_PER_FRAME = 60;

  const tank = document.getElementById('tank');
  const ctx = tank.getContext('2d');
  const chart = document.getElementById('chart');
  const cctx = chart.getContext('2d');
  const playBtn = document.getElementById('playBtn');
  const showSense = document.getElementById('showSense');

  const sim = new Simulation();
  let running = true;
  let speed = 1;

  // Small helpers for building the page from the species tables.
  function el(tag, props, ...children) {
    const e = document.createElement(tag);
    Object.assign(e, props);
    e.append(...children);
    return e;
  }

  function dot(color) {
    const d = el('span', { className: 'dot' });
    d.style.setProperty('--c', color);
    return d;
  }

  function key(color, dashed) {
    const k = el('span', { className: dashed ? 'key dashed' : 'key' });
    k.style.setProperty('--c', color);
    return k;
  }

  // ---------- Species picker, guide and legend ----------

  const speciesPick = document.getElementById('speciesPick');
  for (const sp of SPECIES) {
    const box = el('input', { type: 'checkbox', checked: sim.settings.species[sp.id] });
    box.addEventListener('change', () => { sim.settings.species[sp.id] = box.checked; });
    speciesPick.append(el('label', { className: 'check', title: `${sp.greek} · ${sp.latin}` },
      box, dot(speciesColor(sp)), sp.name));
  }

  const foodName = id => FOOD_TYPES.find(ft => ft.id === id).name.toLowerCase();
  const guide = document.getElementById('speciesGuide');
  const guideCard = (name, greek, latin, origin, color, facts) => el('div', { className: 'guide-card' },
    el('div', { className: 'guide-head' },
      dot(color), el('strong', {}, name), el('span', { className: 'greek' }, greek),
      el('em', { className: 'latin' }, latin),
      el('span', { className: 'badge ' + origin }, origin)),
    ...facts.map(f => el('p', {}, f)));
  for (const sp of SPECIES) {
    guide.append(guideCard(sp.name, sp.greek, sp.latin, sp.origin, speciesColor(sp), [
      sp.fact,
      `Lives in ${sp.tempMin}–${sp.tempMax} °C, best at ${sp.tempOpt} °C. Eats ${sp.diet.map(foodName).join(' and ')}.` +
        (sp.schools ? ' Swims in schools.' : '') + (sp.reefs ? ' Stays around reefs and seagrass.' : ''),
    ]));
  }
  for (const sp of PRED_SPECIES) {
    guide.append(guideCard(sp.name, sp.greek, sp.latin, sp.origin, sp.color, [
      sp.fact,
      `Lives in ${sp.tempMin}–${sp.tempMax} °C, best at ${sp.tempOpt} °C. ` +
        (sp.ambush ? 'Ambush predator: hunts inside reefs and seagrass.' : 'Chaser: hunts in open water.'),
    ]));
  }

  document.getElementById('legend').append(
    ...SPECIES.flatMap(sp => [key(speciesColor(sp)), sp.name]),
    key(FOOD_COLOR), 'Food',
    ...PRED_SPECIES.flatMap((sp, i) => [key(sp.color, i > 0), sp.name + (i === PRED_SPECIES.length - 1 ? ' (right axis)' : '')]),
    el('span', { className: 'key temp' }), 'Top strip: sea temperature',
  );

  // ---------- Temperature tolerance chart ----------

  // One row per species, predator and kind of food: the range it lives in,
  // brightest at its best temperature, a marker for the current sea, and the
  // typical Aegean range shaded behind.
  const thermalEl = document.getElementById('thermal');
  const thermalRows = [
    ...SPECIES.map(sp => ({ sp, color: speciesColor(sp) })),
    ...PRED_SPECIES.map(sp => ({ sp, color: sp.color })),
    ...NATURAL_FOOD.map(sp => ({ sp, color: sp.color, food: true })),
  ];
  const pct = t => (t / T_MAX) * 100 + '%';
  for (const row of thermalRows) {
    const { sp, color } = row;
    const lo = Math.max(0, sp.tempMin), hi = Math.min(T_MAX, sp.tempMax); // keep the bar on the track
    const optInRange = ((sp.tempOpt - lo) / (hi - lo)) * 100;
    const band = el('div', { className: 't-aegean' });
    band.style.left = pct(AEGEAN_RANGE[0]);
    band.style.width = pct(AEGEAN_RANGE[1] - AEGEAN_RANGE[0]);
    const range = el('div', { className: 't-range' });
    range.style.left = pct(lo);
    range.style.width = pct(hi - lo);
    range.style.background = `linear-gradient(90deg, transparent, ${color} ${optInRange}%, transparent)`;
    const opt = el('div', { className: 't-opt' });
    opt.style.left = pct(sp.tempOpt);
    row.now = el('div', { className: 't-now' });
    row.track = el('div', {
      className: 't-track',
      title: row.food
        ? `${sp.name} grows fastest at ${sp.tempOpt} °C and hardly at all near ${sp.tempMin} or ${sp.tempMax} °C`
        : `${sp.name}: lives in ${sp.tempMin}–${sp.tempMax} °C, best at ${sp.tempOpt} °C`,
    }, band, range, opt, row.now);
    row.status = el('span', { className: 't-status' });
    thermalEl.append(el('span', { className: 't-name' }, dot(color), sp.name), row.track, row.status);
  }
  thermalEl.append(
    el('div', { className: 't-axis' }, ...['0°', '10°', '20°', '30°', '40°'].map(t => el('span', {}, t))),
    el('p', { className: 't-note' }, `Shaded: typical Aegean surface temperatures (about ${AEGEAN_RANGE[0]}–${AEGEAN_RANGE[1]} °C).`),
  );

  function updateThermalChart() {
    const T = sim.settings.temperature;
    for (const row of thermalRows) {
      const { perf, stress } = thermal(row.sp, T);
      row.now.style.left = pct(T);
      row.track.classList.toggle('off', row.food && !sim.settings.foodFollowsTemp);
      let label, cls;
      if (row.food) {
        if (!sim.settings.foodFollowsTemp) { label = 'Fixed'; cls = 'ok'; }
        else if (perf >= 0.7) { label = 'Growing well'; cls = 'ok'; }
        else if (perf >= 0.2) { label = 'Slow growth'; cls = 'meh'; }
        else { label = 'Barely grows'; cls = 'bad'; }
      } else if (stress > 0) { label = T < row.sp.tempMin ? 'Too cold' : 'Too hot'; cls = 'dying'; }
      else if (perf < 0.2) { label = 'Not breeding'; cls = 'bad'; }
      else if (perf < 0.7) { label = 'Stressed'; cls = 'meh'; }
      else { label = 'Thriving'; cls = 'ok'; }
      row.status.textContent = label;
      row.status.className = 't-status ' + cls;
    }
  }

  // ---------- Scenarios ----------

  const scenarioSel = document.getElementById('scenario');
  const scenarioInfo = document.getElementById('scenarioInfo');
  const scenarioPhase = document.getElementById('scenarioPhase');
  for (const sc of SCENARIOS) scenarioSel.add(new Option(sc.name, sc.id));

  function showScenario() {
    scenarioSel.value = sim.scenario.id;
    scenarioInfo.textContent = sim.scenario.info;
    scenarioPhase.textContent = sim.scenarioPhase();
  }

  // Choosing a scenario starts it now, with the fish already in the sea.
  scenarioSel.addEventListener('change', () => {
    sim.setScenario(scenarioSel.value);
    showScenario();
  });

  // While a scenario runs, keep the temperature slider and chart in step with it.
  function syncScenario() {
    if (!sim.scenario.temperature) return;
    const T = sim.settings.temperature;
    tempInput.value = T;
    tempOut.textContent = T.toFixed(1) + ' °C';
    updateThermalChart();
    scenarioPhase.textContent = sim.scenarioPhase();
  }

  // ---------- Controls ----------

  const tempInput = document.getElementById('temperature');
  const tempOut = document.querySelector('output[for="temperature"]');

  const controls = [
    { id: 'temperature', fmt: v => v.toFixed(1) + ' °C',
      apply: v => {
        // Moving the slider by hand takes over from a running scenario.
        if (sim.scenario.temperature) {
          sim.setScenario('manual');
          showScenario();
        }
        sim.settings.temperature = v;
        updateThermalChart();
      } },
    { id: 'speed',      fmt: v => v + '×',      apply: v => { speed = v; } },
    { id: 'startFish',  fmt: v => v,             apply: v => { sim.settings.startFish = v; } },
    { id: 'startFood',  fmt: v => v,             apply: v => { sim.settings.startFood = v; } },
    { id: 'foodRate',   fmt: v => v + ' / s',    apply: v => { sim.settings.foodRate = v; } },
    { id: 'foodEnergy', fmt: v => v + ' energy', apply: v => { sim.settings.foodEnergy = v; } },
    { id: 'maxFood',    fmt: v => v,             apply: v => { sim.settings.maxFood = v; } },
    { id: 'preyEnergy', fmt: v => v + ' energy', apply: v => { sim.settings.preyEnergy = v; } },
    { id: 'refuges',    fmt: v => v || 'none',   apply: v => { sim.settings.refuges = v; } },
  ];

  // A "Starting ..." slider and an "Add ..." button for each predator species.
  const predStart = document.getElementById('predStart');
  const predButtons = document.getElementById('predButtons');
  for (const sp of PRED_SPECIES) {
    const id = 'start-' + sp.id;
    const out = el('output');
    out.setAttribute('for', id);
    predStart.append(el('div', { className: 'control' },
      el('label', { htmlFor: id }, `Starting ${sp.name.toLowerCase()}`), out,
      el('input', { type: 'range', id, min: 0, max: 30, step: 1, value: sim.settings.startPredators[sp.id] })));
    controls.push({ id, fmt: v => v, apply: v => { sim.settings.startPredators[sp.id] = v; } });

    const btn = el('button', {}, `Add ${sp.name.toLowerCase()}`);
    btn.addEventListener('click', () => {
      sim.addPredator(sp.id);
      updateStats();
    });
    predButtons.append(btn);
  }
  const clearBtn = el('button', {}, 'Remove all');
  clearBtn.addEventListener('click', () => {
    sim.removePredators();
    updateStats();
  });
  predButtons.append(clearBtn);

  for (const c of controls) {
    const input = document.getElementById(c.id);
    const out = document.querySelector(`output[for="${c.id}"]`);
    const update = () => {
      const v = parseFloat(input.value);
      c.apply(v);
      out.textContent = c.fmt(v);
    };
    input.addEventListener('input', update);
    update();
  }

  // Checkboxes that switch a setting on or off.
  for (const [id, setting, after] of [
    ['fishFlee', 'fishFlee'],
    ['openSea', 'openSea'],
    ['foodFollowsTemp', 'foodFollowsTemp', updateThermalChart],
  ]) {
    const box = document.getElementById(id);
    const apply = () => {
      sim.settings[setting] = box.checked;
      if (after) after();
    };
    box.addEventListener('change', apply);
    apply();
  }
  updateThermalChart();
  showScenario();

  sim.reset(); // start with the values the sliders show

  playBtn.addEventListener('click', () => {
    running = !running;
    playBtn.textContent = running ? 'Pause' : 'Play';
  });

  document.getElementById('resetBtn').addEventListener('click', () => {
    sim.reset();
    acc = 0;
    notices = [];
    updateStats();
    drawChart();
  });

  tank.addEventListener('pointerdown', e => {
    const r = tank.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * WORLD_W;
    const y = ((e.clientY - r.top) / r.height) * WORLD_H;
    sim.dropFood(x, Math.min(y, FLOOR), 12);
  });

  // ---------- Sizing ----------

  let dpr = 1;
  let scale = 1;
  let sandGradient = null;

  // Sea colour by temperature: icy blue when cold, the clear deep blue of the
  // Aegean in the middle, murky green when very warm (algae and mucilage).
  const WATER_TINTS = [
    { t: 0,  stops: [[150, 205, 230], [42, 122, 166], [12, 53, 88]] },
    { t: 20, stops: [[52, 160, 214], [16, 94, 152], [6, 40, 84]] },
    { t: 40, stops: [[96, 168, 128], [38, 104, 84], [14, 50, 38]] },
  ];
  let waterGradient = null;
  let waterTemp = null;

  function waterFor(T) {
    if (T === waterTemp && waterGradient) return waterGradient;
    const hi = T <= 20 ? 1 : 2;
    const a = WATER_TINTS[hi - 1], b = WATER_TINTS[hi];
    const k = Math.max(0, Math.min(1, (T - a.t) / (b.t - a.t)));
    const mix = (c1, c2) => `rgb(${c1.map((v, i) => Math.round(v + (c2[i] - v) * k)).join(',')})`;
    waterGradient = ctx.createLinearGradient(0, 0, 0, WORLD_H);
    waterGradient.addColorStop(0, mix(a.stops[0], b.stops[0]));
    waterGradient.addColorStop(0.45, mix(a.stops[1], b.stops[1]));
    waterGradient.addColorStop(1, mix(a.stops[2], b.stops[2]));
    waterTemp = T;
    return waterGradient;
  }

  function resize() {
    dpr = window.devicePixelRatio || 1;
    scale = tank.clientWidth / WORLD_W;
    tank.width = Math.round(tank.clientWidth * dpr);
    tank.height = Math.round(tank.clientHeight * dpr);
    chart.width = Math.round(chart.clientWidth * dpr);
    chart.height = Math.round(chart.clientHeight * dpr);

    sandGradient = ctx.createLinearGradient(0, FLOOR - 6, 0, WORLD_H);
    sandGradient.addColorStop(0, '#e2cc98');
    sandGradient.addColorStop(1, '#9c8458');

    draw();
    drawChart();
  }

  new ResizeObserver(resize).observe(tank);
  new ResizeObserver(resize).observe(chart);

  // ---------- Scenery (decoration only, not part of the model) ----------

  // Small seeded random generator so the scenery keeps the same look.
  function seeded(seed) {
    return () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };
  }

  const sceneRnd = seeded(42);
  const tufts = Array.from({ length: 9 }, (_, i) => ({
    x: 60 + i * 130 + sceneRnd() * 60,
    h: 25 + sceneRnd() * 35,
    phase: sceneRnd() * 6,
  }));

  const bubbles = Array.from({ length: 25 }, () => ({
    x: Math.random() * WORLD_W,
    speed: 20 + Math.random() * 40,
    offset: Math.random() * WORLD_H,
    r: 1.5 + Math.random() * 3,
  }));

  const sandBumps = Array.from({ length: Math.ceil(WORLD_W / 40) + 1 }, () => sceneRnd() * 6 - 3);

  function drawScenery(t) {
    ctx.fillStyle = waterFor(sim.settings.temperature);
    ctx.fillRect(0, 0, WORLD_W, WORLD_H);

    // Sunlight from the surface
    ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
    for (let i = 0; i < 6; i++) {
      const x = 120 + i * 200 + Math.sin(t * 0.15 + i) * 40;
      ctx.beginPath();
      ctx.moveTo(x - 30, 0);
      ctx.lineTo(x + 30, 0);
      ctx.lineTo(x + 140, FLOOR);
      ctx.lineTo(x + 20, FLOOR);
      ctx.closePath();
      ctx.fill();
    }

    // Sand
    ctx.fillStyle = sandGradient;
    ctx.beginPath();
    ctx.moveTo(0, WORLD_H);
    for (let i = 0; i < sandBumps.length; i++) ctx.lineTo(i * 40, FLOOR + 4 + sandBumps[i]);
    ctx.lineTo(WORLD_W, WORLD_H);
    ctx.closePath();
    ctx.fill();

    // Small seagrass tufts on the open sand
    ctx.lineCap = 'round';
    ctx.lineWidth = 4;
    ctx.strokeStyle = 'hsla(85, 40%, 30%, 0.8)';
    for (const w of tufts) {
      for (let j = -1; j <= 1; j++) {
        ctx.beginPath();
        ctx.moveTo(w.x + j * 5, FLOOR + 6);
        ctx.quadraticCurveTo(w.x + j * 8 + Math.sin(t * 0.8 + w.phase + j) * 4, FLOOR + 6 - w.h * 0.6,
          w.x + j * 10 + Math.sin(t * 0.8 + w.phase + j) * 7, FLOOR + 6 - w.h);
        ctx.stroke();
      }
    }

    // Bubbles
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.lineWidth = 1;
    for (const b of bubbles) {
      const y = FLOOR - ((t * b.speed + b.offset) % FLOOR);
      const x = b.x + Math.sin(t * 2 + b.offset) * 4;
      ctx.beginPath();
      ctx.arc(x, y, b.r, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  // ---------- Seagrass meadows and reefs (the hiding places) ----------

  const refugeLooks = new WeakMap();

  // Alternate Posidonia seagrass meadows (many long ribbons, few rocks) and
  // rocky reefs (big rocks with some seagrass).
  function refugeLook(r, i) {
    let look = refugeLooks.get(r);
    if (!look) {
      const rnd = seeded(1000 + i * 97);
      const reef = i % 2 === 1;
      look = {
        rocks: Array.from({ length: reef ? 6 : 2 }, () => ({
          dx: (rnd() - 0.5) * r.radius * 1.5,
          rx: (reef ? 24 : 14) + rnd() * 18,
          ry: (reef ? 22 : 10) + rnd() * (reef ? 26 : 8),
          light: 30 + rnd() * 16,
        })),
        blades: Array.from({ length: reef ? 7 : 16 }, () => ({
          dx: (rnd() - 0.5) * r.radius * 1.9,
          h: r.radius * (reef ? 0.8 + rnd() * 0.6 : 1.1 + rnd() * 0.9),
          phase: rnd() * 6,
          hue: 75 + rnd() * 35,
        })),
      };
      refugeLooks.set(r, look);
    }
    return look;
  }

  function drawRefugeRocks() {
    sim.refuges.forEach((r, i) => {
      for (const k of refugeLook(r, i).rocks) {
        ctx.fillStyle = `hsl(30, 10%, ${k.light}%)`;
        ctx.beginPath();
        ctx.ellipse(r.x + k.dx, FLOOR + 8, k.rx, k.ry, 0, Math.PI, 0);
        ctx.fill();
      }
    });
  }

  // Posidonia leaves: long flat ribbons, drawn over the fish so hiding fish
  // are partly covered.
  function drawSeagrass(t) {
    ctx.lineCap = 'round';
    ctx.lineWidth = 6;
    sim.refuges.forEach((r, i) => {
      for (const k of refugeLook(r, i).blades) {
        ctx.strokeStyle = `hsla(${k.hue}, 45%, 26%, 0.85)`;
        ctx.beginPath();
        ctx.moveTo(r.x + k.dx, FLOOR + 8);
        for (let s = 1; s <= 6; s++) {
          const sway = Math.sin(t * 0.9 + k.phase + s * 0.6) * s * 2.2;
          ctx.lineTo(r.x + k.dx + sway, FLOOR + 8 - (k.h * s) / 6);
        }
        ctx.stroke();
      }
    });
  }

  // ---------- Food ----------

  function drawFood() {
    // Group by kind so each kind is drawn in one go.
    const byType = FOOD_TYPES.map(() => []);
    for (const p of sim.food) byType[p.type].push(p);

    byType.forEach((items, type) => {
      const ft = FOOD_TYPES[type];
      if (!items.length) return;
      ctx.fillStyle = ft.color;
      ctx.beginPath();
      if (ft.id === 'plankton') {
        for (const p of items) {
          ctx.moveTo(p.x + 2, p.y);
          ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
        }
        ctx.fill();
      } else if (ft.id === 'seaweed') {
        // little upright fronds
        ctx.strokeStyle = ft.color;
        ctx.lineWidth = 2;
        for (const p of items) {
          ctx.moveTo(p.x - 2, p.y + 3);
          ctx.lineTo(p.x - 3, p.y - 4);
          ctx.moveTo(p.x + 1, p.y + 3);
          ctx.lineTo(p.x + 2, p.y - 5);
        }
        ctx.stroke();
      } else if (ft.id === 'benthos') {
        // small shells on the sand
        for (const p of items) {
          ctx.moveTo(p.x + 3, p.y);
          ctx.ellipse(p.x, p.y, 3, 2.2, 0, Math.PI, 0);
        }
        ctx.fill();
      } else {
        // feed pellets
        for (const p of items) {
          ctx.moveTo(p.x + 2.5, p.y);
          ctx.arc(p.x, p.y, 2.5, 0, Math.PI * 2);
        }
        ctx.fill();
        ctx.strokeStyle = 'rgba(90, 70, 30, 0.6)';
        ctx.lineWidth = 0.8;
        ctx.stroke();
      }
    });
  }

  // ---------- Fish ----------

  // Rotate to the direction of travel, keeping the back on top.
  function face(a) {
    const ang = Math.atan2(a.vy, a.vx);
    ctx.save();
    ctx.translate(a.x, a.y);
    ctx.rotate(ang);
    if (Math.cos(ang) < 0) ctx.scale(1, -1);
  }

  function fin(points, style) {
    ctx.fillStyle = style;
    ctx.beginPath();
    ctx.moveTo(points[0], points[1]);
    for (let i = 2; i < points.length; i += 2) ctx.lineTo(points[i], points[i + 1]);
    ctx.closePath();
    ctx.fill();
  }

  function eye(x, y, r, color) {
    ctx.fillStyle = color || '#fff';
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#111';
    ctx.beginPath();
    ctx.arc(x + r * 0.2, y, r * 0.5, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawFish(f) {
    const sp = SPECIES[f.species];
    const r = f.radius * 1.25; // drawn a little larger than the model's size, to be easier to see
    const L = r * 1.6;
    const H = r * 0.85 * sp.body;
    // Well-fed fish are bright; starving fish fade to grey.
    const health = Math.max(0, Math.min(1, f.energy / BIO.maxEnergy));
    const sat = 20 + 65 * health;
    const light = 45 + 14 * health;
    const bodyColor = `hsl(${f.hue}, ${sat}%, ${light}%)`;
    const darkColor = `hsl(${f.hue}, ${sat}%, ${light - 18}%)`;

    face(f);

    // Tail
    ctx.save();
    ctx.translate(-L * 0.75, 0);
    ctx.rotate(Math.sin(f.phase) * 0.4);
    fin([0, 0, -L * 0.8, -H, -L * 0.55, 0, -L * 0.8, H], darkColor);
    ctx.restore();

    // Dorsal fins
    if (sp.id === 'seabass') {
      fin([-L * 0.45, -H * 0.8, -L * 0.3, -H * 1.45, -L * 0.1, -H * 0.85], darkColor);
      fin([L * 0.0, -H * 0.85, L * 0.15, -H * 1.35, L * 0.35, -H * 0.8], darkColor);
    } else if (sp.id === 'seabream') {
      fin([-L * 0.55, -H * 0.7, -L * 0.2, -H * 1.3, L * 0.3, -H * 0.75], darkColor);
    } else if (sp.id === 'rabbitfish') {
      // a row of spines
      fin([-L * 0.6, -H * 0.6, -L * 0.45, -H * 1.35, -L * 0.3, -H * 0.85, -L * 0.15, -H * 1.4,
           0, -H * 0.9, L * 0.15, -H * 1.35, L * 0.35, -H * 0.65], darkColor);
    } else if (sp.id === 'anchovy') {
      // one small fin in the middle of the back
      fin([-L * 0.2, -H * 0.8, -L * 0.05, -H * 1.6, L * 0.1, -H * 0.85], darkColor);
    } else if (sp.id === 'redmullet') {
      // two well-separated dorsal fins
      fin([-L * 0.05, -H * 0.85, L * 0.1, -H * 1.6, L * 0.3, -H * 0.8], darkColor);
      fin([-L * 0.55, -H * 0.75, -L * 0.4, -H * 1.3, -L * 0.2, -H * 0.85], darkColor);
    } else if (sp.id === 'parrotfish') {
      // one long, low dorsal fin
      fin([-L * 0.6, -H * 0.7, -L * 0.5, -H * 1.2, L * 0.3, -H * 1.15, L * 0.4, -H * 0.8], darkColor);
    }

    // Body
    ctx.fillStyle = bodyColor;
    ctx.beginPath();
    ctx.ellipse(0, 0, L, H, 0, 0, Math.PI * 2);
    ctx.fill();

    if (r > 4) {
      if (sp.id === 'sardine') {
        // dark blue back and a row of spots along the side
        ctx.fillStyle = `hsla(${f.hue}, ${sat}%, ${light - 25}%, 0.8)`;
        ctx.beginPath();
        ctx.ellipse(0, -H * 0.4, L * 0.85, H * 0.45, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(20, 30, 50, 0.6)';
        for (let i = 0; i < 3; i++) {
          ctx.beginPath();
          ctx.arc(L * (0.2 - i * 0.28), H * 0.05, r * 0.09, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (sp.id === 'seabass') {
        // silver sides, darker back
        ctx.fillStyle = `hsla(${f.hue}, ${sat * 0.6}%, ${light - 20}%, 0.6)`;
        ctx.beginPath();
        ctx.ellipse(0, -H * 0.45, L * 0.9, H * 0.4, 0, 0, Math.PI * 2);
        ctx.fill();
      } else if (sp.id === 'seabream') {
        // the gold band between the eyes and the dark spot on the gill cover
        ctx.strokeStyle = `hsla(48, 95%, 62%, ${0.5 + 0.5 * health})`;
        ctx.lineWidth = r * 0.25;
        ctx.beginPath();
        ctx.moveTo(L * 0.45, -H * 0.75);
        ctx.lineTo(L * 0.62, -H * 0.2);
        ctx.stroke();
        ctx.fillStyle = 'rgba(30, 25, 20, 0.6)';
        ctx.beginPath();
        ctx.arc(L * 0.32, -H * 0.15, r * 0.14, 0, Math.PI * 2);
        ctx.fill();
      } else if (sp.id === 'rabbitfish') {
        // mottled spots
        ctx.fillStyle = `hsla(${f.hue}, ${sat}%, ${light + 15}%, 0.5)`;
        for (const [x, y] of [[-0.4, -0.3], [-0.1, 0.25], [0.15, -0.35], [-0.55, 0.2], [0.3, 0.2]]) {
          ctx.beginPath();
          ctx.arc(L * x, H * y, r * 0.12, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (sp.id === 'anchovy') {
        // dark back, a bright silver stripe along the side, and the long snout
        // that overhangs the mouth
        ctx.fillStyle = `hsla(${f.hue}, ${sat}%, ${light - 25}%, 0.75)`;
        ctx.beginPath();
        ctx.ellipse(0, -H * 0.45, L * 0.9, H * 0.4, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = `rgba(235, 240, 250, ${0.4 + 0.4 * health})`;
        ctx.lineWidth = Math.max(1, H * 0.3);
        ctx.beginPath();
        ctx.moveTo(-L * 0.75, H * 0.05);
        ctx.lineTo(L * 0.6, H * 0.05);
        ctx.stroke();
        ctx.fillStyle = bodyColor;
        ctx.beginPath();
        ctx.ellipse(L * 0.92, -H * 0.15, L * 0.18, H * 0.35, 0, 0, Math.PI * 2);
        ctx.fill();
      } else if (sp.id === 'redmullet') {
        // yellowish stripe along the side and two barbels under the chin
        ctx.strokeStyle = `hsla(45, 80%, 65%, ${0.3 + 0.4 * health})`;
        ctx.lineWidth = Math.max(1, H * 0.18);
        ctx.beginPath();
        ctx.moveTo(-L * 0.7, 0);
        ctx.lineTo(L * 0.5, -H * 0.05);
        ctx.stroke();
        ctx.strokeStyle = `hsl(${f.hue}, ${sat}%, ${light + 20}%)`;
        ctx.lineWidth = Math.max(0.8, r * 0.07);
        const wiggle = Math.sin(f.phase * 2) * 0.1;
        for (const dx of [0.62, 0.72]) {
          ctx.beginPath();
          ctx.moveTo(L * dx, H * 0.55);
          ctx.lineTo(L * (dx + 0.05), H * (1.25 + wiggle));
          ctx.stroke();
        }
      } else if (sp.id === 'parrotfish') {
        // scale rows and a pale beak
        ctx.strokeStyle = `hsla(${f.hue}, ${sat}%, ${light - 20}%, 0.45)`;
        ctx.lineWidth = Math.max(0.7, r * 0.05);
        for (let i = 0; i < 4; i++) {
          ctx.beginPath();
          ctx.arc(L * (-0.45 + i * 0.25), 0, H * 0.75, -Math.PI * 0.35, Math.PI * 0.35);
          ctx.stroke();
        }
        ctx.fillStyle = 'rgba(240, 235, 215, 0.85)';
        ctx.beginPath();
        ctx.moveTo(L * 0.85, -H * 0.35);
        ctx.lineTo(L * 1.08, 0);
        ctx.lineTo(L * 0.85, H * 0.3);
        ctx.closePath();
        ctx.fill();
      }
      eye(L * 0.55, -H * 0.2, r * 0.2);
    }
    ctx.restore();
  }

  // ---------- Predators ----------

  function drawBluefish(p, r) {
    const L = r * 2.1;
    const H = r * 0.6;
    const health = Math.max(0, Math.min(1, p.energy / p.bio.maxEnergy));
    const light = 30 + 12 * health;
    const back = `hsl(190, 40%, ${light}%)`;

    face(p);
    // Forked tail
    ctx.save();
    ctx.translate(-L * 0.85, 0);
    ctx.rotate(Math.sin(p.phase) * 0.3);
    fin([0, 0, -L * 0.5, -H * 1.4, -L * 0.3, 0, -L * 0.5, H * 1.4], back);
    ctx.restore();
    // Two dorsal fins
    fin([-L * 0.45, -H * 0.75, -L * 0.3, -H * 1.5, -L * 0.15, -H * 0.85], back);
    fin([-L * 0.05, -H * 0.85, L * 0.05, -H * 1.3, L * 0.3, -H * 0.8], back);
    // Body: blue-green back, silver belly, pointed snout
    ctx.fillStyle = back;
    ctx.beginPath();
    ctx.ellipse(0, 0, L, H, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = `rgba(225, 235, 240, ${0.45 + 0.2 * health})`;
    ctx.beginPath();
    ctx.ellipse(0, H * 0.35, L * 0.85, H * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();
    // Mouth
    ctx.strokeStyle = 'rgba(20, 30, 40, 0.7)';
    ctx.lineWidth = r * 0.08;
    ctx.beginPath();
    ctx.moveTo(L * 0.98, H * 0.05);
    ctx.lineTo(L * 0.72, H * 0.25);
    ctx.stroke();
    // Eye: turns red while hunting
    eye(L * 0.7, -H * 0.2, r * 0.15, p.hunting ? '#ff5a4f' : '#f2d36b');
    ctx.restore();
  }

  function drawLionfish(p, r) {
    const L = r * 1.5;
    const H = r * 0.75;
    const health = Math.max(0, Math.min(1, p.energy / p.bio.maxEnergy));
    const stripe = `hsla(355, 60%, ${30 + 10 * health}%, 0.9)`;

    face(p);
    // Long venomous dorsal spines
    ctx.strokeStyle = stripe;
    ctx.lineWidth = r * 0.07;
    for (let i = 0; i < 7; i++) {
      const x = -L * 0.5 + i * L * 0.14;
      ctx.beginPath();
      ctx.moveTo(x, -H * 0.7);
      ctx.lineTo(x - L * 0.1, -H * (1.9 + Math.sin(i * 1.7) * 0.3));
      ctx.stroke();
    }
    // Tail
    ctx.save();
    ctx.translate(-L * 0.85, 0);
    ctx.rotate(Math.sin(p.phase) * 0.2);
    fin([0, 0, -L * 0.45, -H * 0.8, -L * 0.45, H * 0.8], 'rgba(240, 220, 210, 0.8)');
    ctx.restore();
    // Fan-like pectoral fins
    ctx.fillStyle = 'rgba(230, 150, 150, 0.35)';
    ctx.beginPath();
    ctx.moveTo(L * 0.1, H * 0.2);
    ctx.arc(L * 0.1, H * 0.2, L * 0.95, Math.PI * 0.55, Math.PI * 0.95);
    ctx.closePath();
    ctx.fill();
    // Cream body with maroon stripes
    ctx.fillStyle = 'hsl(30, 45%, 88%)';
    ctx.beginPath();
    ctx.ellipse(0, 0, L, H, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.save();
    ctx.clip();
    ctx.strokeStyle = stripe;
    ctx.lineWidth = r * 0.22;
    for (let i = -3; i <= 3; i++) {
      ctx.beginPath();
      ctx.moveTo(i * L * 0.3, -H);
      ctx.lineTo(i * L * 0.3 - L * 0.08, H);
      ctx.stroke();
    }
    ctx.restore();
    eye(L * 0.6, -H * 0.25, r * 0.15, p.hunting ? '#ff5a4f' : '#f2d36b');
    ctx.restore();
  }

  function drawGrouper(p, r) {
    const L = r * 1.8;
    const H = r * 0.85;
    const health = Math.max(0, Math.min(1, p.energy / p.bio.maxEnergy));
    const body = `hsl(28, ${25 + 20 * health}%, ${26 + 10 * health}%)`;
    const dark = `hsl(25, 30%, ${18 + 6 * health}%)`;

    face(p);
    // Rounded tail
    ctx.save();
    ctx.translate(-L * 0.85, 0);
    ctx.rotate(Math.sin(p.phase) * 0.2);
    ctx.fillStyle = dark;
    ctx.beginPath();
    ctx.ellipse(-L * 0.18, 0, L * 0.22, H * 0.7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    // Long spiny dorsal fin
    fin([-L * 0.6, -H * 0.75, -L * 0.45, -H * 1.2, L * 0.25, -H * 1.15, L * 0.35, -H * 0.8], dark);
    // Heavy brown body
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.ellipse(0, 0, L, H, 0, 0, Math.PI * 2);
    ctx.fill();
    // Pale blotches
    ctx.save();
    ctx.clip();
    ctx.fillStyle = 'rgba(235, 215, 170, 0.35)';
    for (const [x, y, s] of [[-0.5, -0.2, 0.2], [-0.15, 0.25, 0.24], [0.2, -0.3, 0.18], [-0.7, 0.3, 0.16], [0.35, 0.3, 0.15]]) {
      ctx.beginPath();
      ctx.ellipse(L * x, H * y, r * s, r * s * 0.7, 0.4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    // Big mouth
    ctx.strokeStyle = 'rgba(20, 10, 5, 0.75)';
    ctx.lineWidth = r * 0.09;
    ctx.beginPath();
    ctx.moveTo(L * 0.99, H * 0.1);
    ctx.lineTo(L * 0.62, H * 0.35);
    ctx.stroke();
    eye(L * 0.62, -H * 0.3, r * 0.15, p.hunting ? '#ff5a4f' : '#f2d36b');
    ctx.restore();
  }

  function drawToadfish(p, r) {
    const L = r * 1.9;
    const H = r * 0.62;
    const health = Math.max(0, Math.min(1, p.energy / p.bio.maxEnergy));
    const back = `hsl(85, 18%, ${32 + 10 * health}%)`;

    face(p);
    // Small tail with a straight edge
    ctx.save();
    ctx.translate(-L * 0.88, 0);
    ctx.rotate(Math.sin(p.phase) * 0.3);
    fin([0, 0, -L * 0.3, -H * 0.9, -L * 0.3, H * 0.9], back);
    ctx.restore();
    // Small dorsal and anal fins set far back
    fin([-L * 0.55, -H * 0.8, -L * 0.42, -H * 1.5, -L * 0.3, -H * 0.85], back);
    fin([-L * 0.55, H * 0.8, -L * 0.42, H * 1.4, -L * 0.3, H * 0.85], 'rgba(220, 225, 230, 0.8)');
    // Olive back with dark spots, silver cheeks and belly
    ctx.fillStyle = `rgba(225, 232, 238, ${0.85 + 0.15 * health})`;
    ctx.beginPath();
    ctx.ellipse(0, 0, L, H, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.save();
    ctx.clip();
    ctx.fillStyle = back;
    ctx.beginPath();
    ctx.ellipse(0, -H * 0.55, L * 1.05, H * 0.7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(25, 30, 20, 0.55)';
    for (let i = 0; i < 6; i++) {
      ctx.beginPath();
      ctx.arc(L * (-0.6 + i * 0.24), -H * (0.45 + 0.15 * (i % 2)), r * 0.07, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    // Beak-like teeth that cut through nets
    ctx.fillStyle = '#f4f1e6';
    ctx.beginPath();
    ctx.ellipse(L * 0.98, 0, r * 0.14, r * 0.1, 0, 0, Math.PI * 2);
    ctx.fill();
    eye(L * 0.6, -H * 0.3, r * 0.17, p.hunting ? '#ff5a4f' : '#9fd3a8');
    ctx.restore();
  }

  function drawPredator(p) {
    const r = p.radius * 1.4; // drawn a bit larger than its catch radius so it stands out
    const id = PRED_SPECIES[p.species].id;
    if (id === 'lionfish') drawLionfish(p, r);
    else if (id === 'grouper') drawGrouper(p, r);
    else if (id === 'toadfish') drawToadfish(p, r);
    else drawBluefish(p, r);
  }

  // ---------- Effects and notices ----------

  // Ripples where a fish was caught, and banners for scenario events.
  let effects = [];
  let notices = [];

  function drawEffects() {
    for (const e of sim.events.splice(0)) {
      if (e.type === 'notice') notices.push({ text: e.text, shown: performance.now() });
      else effects.push(e);
    }
    effects = effects.filter(e => sim.time - e.time >= 0 && sim.time - e.time < 0.8);
    ctx.lineWidth = 2;
    for (const e of effects) {
      const age = sim.time - e.time;
      ctx.strokeStyle = `rgba(255, 255, 255, ${0.7 * (1 - age / 0.8)})`;
      ctx.beginPath();
      ctx.arc(e.x, e.y, 5 + age * 35, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  // The newest notice stays on screen for 5 seconds of real time.
  function drawNotices() {
    const now = performance.now();
    notices = notices.filter(n => now - n.shown < 5000);
    const n = notices[notices.length - 1];
    if (!n) return;
    const fade = Math.min(1, (5000 - (now - n.shown)) / 600);
    ctx.font = '600 24px system-ui, sans-serif';
    const w = ctx.measureText(n.text).width + 40;
    ctx.globalAlpha = fade;
    ctx.fillStyle = 'rgba(5, 20, 32, 0.75)';
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect((WORLD_W - w) / 2, 60, w, 46, 23);
    else ctx.rect((WORLD_W - w) / 2, 60, w, 46); // older browsers
    ctx.fill();
    ctx.fillStyle = '#ffd88a';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(n.text, WORLD_W / 2, 84);
    ctx.globalAlpha = 1;
  }

  // Thermometer readout in the corner, readable on a projector.
  function drawTemperatureBadge() {
    const T = sim.settings.temperature;
    const text = `${T.toFixed(1)} °C`;
    ctx.font = '600 22px system-ui, sans-serif';
    const w = ctx.measureText(text).width + 28;
    ctx.fillStyle = 'rgba(5, 20, 32, 0.55)';
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(14, 14, w, 34, 17);
    else ctx.rect(14, 14, w, 34); // older browsers
    ctx.fill();
    ctx.fillStyle = T < 12 ? '#9fd8ff' : T > 28 ? '#ffb38a' : '#fff';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 28, 32);
  }

  function draw() {
    if (!sandGradient) return;
    ctx.setTransform(scale * dpr, 0, 0, scale * dpr, 0, 0);
    drawScenery(sim.time);
    drawRefugeRocks();
    drawFood();

    if (showSense.checked) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (const f of sim.fish) {
        ctx.moveTo(f.x + f.sense, f.y);
        ctx.arc(f.x, f.y, f.sense, 0, Math.PI * 2);
      }
      ctx.stroke();
    }

    for (const f of sim.fish) drawFish(f);
    for (const p of sim.predators) drawPredator(p);
    drawSeagrass(sim.time);
    drawEffects();
    drawTemperatureBadge();
    drawNotices();

    if (sim.fish.length === 0) {
      ctx.fillStyle = 'rgba(5, 20, 32, 0.55)';
      ctx.fillRect(0, 0, WORLD_W, WORLD_H);
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = '600 44px system-ui, sans-serif';
      ctx.fillText('The fish have died out', WORLD_W / 2, WORLD_H / 2 - 20);
      ctx.font = '24px system-ui, sans-serif';
      ctx.fillText('Adjust the sliders and press Reset', WORLD_W / 2, WORLD_H / 2 + 30);
    }
  }

  // ---------- Stats and chart ----------

  function formatTime(s) {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${String(sec).padStart(2, '0')}`;
  }

  // Blue (0 °C) through white (20 °C) to red (40 °C), matching the legend key.
  function tempColor(T) {
    const k = Math.max(0, Math.min(1, T / T_MAX));
    const [a, b, j] = k < 0.5
      ? [[80, 150, 255], [230, 230, 230], k * 2]
      : [[230, 230, 230], [255, 90, 60], (k - 0.5) * 2];
    return `rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * j)).join(',')})`;
  }

  // Axis maximum that splits into 4 round-numbered gridlines.
  function axisMax(v) {
    return niceCeil(v / 4) * 4;
  }

  function niceCeil(v) {
    const p = Math.pow(10, Math.floor(Math.log10(v)));
    for (const m of [1, 2, 2.5, 5, 10]) if (m * p >= v) return m * p;
    return 10 * p;
  }

  const statEls = {};
  for (const id of ['statTime', 'statFish', 'statPeak', 'statBirths', 'statArrived', 'statStarved',
                    'statOld', 'statEaten', 'statMissed', 'statThermal', 'statGen', 'statSpeed',
                    'statSense', 'statPred', 'statPredPeak', 'statPredBirths', 'statPredStarved',
                    'statPredOld', 'statPredThermal']) {
    statEls[id] = document.getElementById(id);
  }

  // A list of "colour dot, name, value" rows; returns the value elements.
  function statRows(container, items) {
    return items.map(({ name, color }) => {
      const dd = el('dd');
      container.append(el('dt', {}, dot(color), name), dd);
      return dd;
    });
  }
  const speciesCountEls = statRows(document.getElementById('speciesStats'),
    SPECIES.map(sp => ({ name: sp.name, color: speciesColor(sp) })));
  const predCountEls = statRows(document.getElementById('predStats'),
    PRED_SPECIES.map(sp => ({ name: sp.name, color: sp.color })));
  const foodEls = statRows(document.getElementById('foodStats'),
    FOOD_TYPES.map(ft => ({ name: ft.name, color: ft.color })));

  function updateStats() {
    const s = sim.summary();
    const st = sim.stats;
    statEls.statTime.textContent = formatTime(sim.time);
    statEls.statFish.textContent = s.fish;
    statEls.statPeak.textContent = st.peak;
    statEls.statBirths.textContent = st.births;
    statEls.statArrived.textContent = st.arrived;
    statEls.statStarved.textContent = st.starved;
    statEls.statOld.textContent = st.oldAge;
    statEls.statEaten.textContent = st.eaten;
    statEls.statMissed.textContent = st.missed || 0;
    statEls.statThermal.textContent = st.thermal;
    statEls.statGen.textContent = st.maxGeneration;
    statEls.statSpeed.textContent = s.fish ? s.avgSpeed.toFixed(1) : '–';
    statEls.statSense.textContent = s.fish ? s.avgSense.toFixed(1) : '–';
    statEls.statPred.textContent = s.predators;
    statEls.statPredPeak.textContent = st.predPeak;
    statEls.statPredBirths.textContent = st.predBirths;
    statEls.statPredStarved.textContent = st.predStarved;
    statEls.statPredOld.textContent = st.predOldAge;
    statEls.statPredThermal.textContent = st.predThermal;
    speciesCountEls.forEach((dd, i) => { dd.textContent = s.bySpecies[i]; });
    predCountEls.forEach((dd, i) => { dd.textContent = s.predBySpecies[i]; });
    foodEls.forEach((dd, i) => {
      dd.textContent = i === PELLETS
        ? s.foodByType[i]
        : `${s.foodByType[i]} · growth ${Math.round(sim.foodGrowth[i] * 100)}%`;
    });
  }

  function drawChart() {
    const w = chart.clientWidth;
    const h = chart.clientHeight;
    cctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cctx.clearRect(0, 0, w, h);

    const hist = sim.history;
    const padL = 36, padR = 30, padT = 18, padB = 20;
    let max = 10, predMax = 4;
    for (const p of hist) {
      max = Math.max(max, p.food, ...p.bySpecies);
      predMax = Math.max(predMax, ...p.predBySpecies);
    }
    max = axisMax(max);
    predMax = axisMax(predMax);

    const Y = v => padT + (h - padT - padB) * (1 - v / max);
    const YP = v => padT + (h - padT - padB) * (1 - v / predMax);

    cctx.font = '11px system-ui, sans-serif';
    cctx.fillStyle = '#8fb0c4';
    cctx.strokeStyle = 'rgba(143, 176, 196, 0.15)';
    cctx.lineWidth = 1;
    cctx.textAlign = 'right';
    cctx.textBaseline = 'middle';
    for (let i = 0; i <= 4; i++) {
      const v = (max * i) / 4;
      const y = Math.round(Y(v)) + 0.5;
      cctx.beginPath();
      cctx.moveTo(padL, y);
      cctx.lineTo(w - padR, y);
      cctx.stroke();
      cctx.fillText(String(Math.round(v)), padL - 6, y);
    }
    // Right axis: predators (far fewer, so they get their own scale)
    cctx.fillStyle = '#ff8a8a';
    cctx.textAlign = 'left';
    for (let i = 0; i <= 4; i++) {
      const v = (predMax * i) / 4;
      cctx.fillText(String(Math.round(v)), w - padR + 6, Math.round(YP(v)) + 0.5);
    }

    if (hist.length < 2) return;
    const t0 = hist[0].time;
    const t1 = hist[hist.length - 1].time;
    const X = t => padL + ((t - t0) / (t1 - t0 || 1)) * (w - padL - padR);

    // Strip along the top: the sea temperature at each moment, blue = cold, red = hot.
    for (let i = 0; i < hist.length - 1; i++) {
      const x0 = X(hist[i].time);
      cctx.fillStyle = tempColor(hist[i].temperature);
      cctx.fillRect(x0, 3, Math.max(1, X(hist[i + 1].time) - x0 + 0.5), 8);
    }

    const line = (value, color, yOf, dashed) => {
      cctx.strokeStyle = color;
      cctx.lineWidth = 2;
      cctx.lineJoin = 'round';
      cctx.setLineDash(dashed ? [6, 4] : []);
      cctx.beginPath();
      hist.forEach((p, i) => (i ? cctx.lineTo(X(p.time), yOf(value(p))) : cctx.moveTo(X(p.time), yOf(value(p)))));
      cctx.stroke();
      cctx.setLineDash([]);
    };
    line(p => p.food, FOOD_COLOR, Y);
    SPECIES.forEach((sp, i) => line(p => p.bySpecies[i], speciesColor(sp), Y));
    PRED_SPECIES.forEach((sp, i) => line(p => p.predBySpecies[i], sp.color, YP, i > 0));

    cctx.fillStyle = '#8fb0c4';
    cctx.textBaseline = 'alphabetic';
    cctx.textAlign = 'left';
    cctx.fillText(formatTime(t0), padL, h - 4);
    cctx.textAlign = 'right';
    cctx.fillText(formatTime(t1), w - padR, h - 4);
  }

  // ---------- Main loop ----------

  let last = performance.now();
  let acc = 0;
  let uiTimer = 0;

  function frame(now) {
    const real = Math.min(0.1, (now - last) / 1000);
    last = now;

    if (running) {
      acc += real * speed;
      let n = 0;
      while (acc >= STEP && n < MAX_STEPS_PER_FRAME) {
        sim.step(STEP);
        acc -= STEP;
        n++;
      }
      if (n === MAX_STEPS_PER_FRAME) acc = 0; // computer can't keep up; drop the backlog
    }

    draw();

    uiTimer += real;
    if (uiTimer > 0.25) {
      uiTimer = 0;
      syncScenario();
      updateStats();
      drawChart();
    }
    requestAnimationFrame(frame);
  }

  updateStats();
  requestAnimationFrame(frame);
})();

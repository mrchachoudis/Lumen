# Lumen — Aegean Fish Simulator

An interactive, browser-based simulation of Aegean Sea fish. Native and invasive
species find food, grow, breed, pass on (slightly mutated) traits, flee from
predators, and live or die depending on the sea temperature. It's built for
teaching, with the long-term aim of comparing fish farms with wild populations.

No build step or dependencies — it's plain HTML, CSS and JavaScript.

The plan for growing this into a full farm-vs-wild teaching simulator is in
[ROADMAP.md](ROADMAP.md).

## Files

| File         | What it does                                                          |
|--------------|-----------------------------------------------------------------------|
| `index.html` | Page layout, sliders and stats panels                                 |
| `style.css`  | Styling (responsive down to phone width)                              |
| `sim.js`     | The model: species, food, predators, temperature, scenarios. No drawing. |
| `main.js`    | Drawing the sea and chart, wiring up the controls, main loop          |

## Running it

Double-click `index.html`, or serve the folder locally:

```bash
python -m http.server 8765
```

then open http://localhost:8765.

## Putting it on a website

Upload `index.html`, `style.css`, `sim.js` and `main.js` to the same folder on your
host. To embed it in another page (e.g. a university course page):

```html
<iframe src="https://your-site.example/lumen/" width="100%" height="1100"
        style="border:0" title="Aegean fish simulator"></iframe>
```

When you change any of the files, bump the `?v=` number on the `style.css`, `sim.js`
and `main.js` links in `index.html`, so visitors' browsers fetch the new version
instead of a cached copy.

## The species

| Species | Greek | Status | Lives in | Best | Eats / hunts |
|---|---|---|---|---|---|
| Sardine (*Sardina pilchardus*) | Σαρδέλα | native | 9–27 °C | 15 °C | plankton; swims in schools |
| Sea bass (*Dicentrarchus labrax*) | Λαβράκι | native | 3–32 °C | 22 °C | shellfish & worms on the sea floor |
| Sea bream (*Sparus aurata*) | Τσιπούρα | native | 6–33 °C | 25 °C | shellfish & worms on the sea floor |
| Rabbitfish (*Siganus luridus*) | Γερμανός | invasive | 14–35 °C | 27 °C | seaweed on reefs and seagrass |
| Bluefish (*Pomatomus saltatrix*) | Γοφάρι | native predator | 10–30 °C | 22 °C | chases fish in open water |
| Lionfish (*Pterois miles*) | Λεοντόψαρο | invasive predator | 14–34 °C | 27 °C | ambushes fish around reefs |

The ranges are simplified for teaching, not exact limits.

## How the model works

- **Energy**: every fish burns energy constantly. Faster fish (more muscle) and
  better eyesight cost more to maintain, and swimming costs rise with the cube of
  speed, like drag in real water.
- **Food**: plankton drifts in open water, seaweed grows on reefs and seagrass, and
  shellfish & worms live on the sand. Each grows at its own rate depending on the
  sea temperature (plankton is most plentiful in cool water, as in the Aegean spring
  bloom) and dies off faster when warm. Each species eats only its own foods, which
  lets them live side by side. Clicking the water drops feed pellets that every
  species eats.
- **Depth zones**: sardines keep to the upper water, sea bass and sea bream to the
  bottom, and rabbitfish stay around the reefs where their seaweed grows.
- **Breeding**: an adult with enough energy produces a baby. Sardines live fast
  (mature young, breed often, die young); sea bass and sea bream are slower.
- **Inheritance**: babies copy their parent's species, speed and eyesight with small
  random mutations, so traits evolve.
- **Predators**: bluefish chase fish in open water and lunge when close; lionfish
  lurk around reefs, can hunt inside them, and local fish react to them late. Both
  rest after each catch, breed slowly and starve if they can't eat. Predators favour
  whichever species is most common, which lets rare species recover.
- **Schooling**: sardines swim in schools, and a strike at a sardine in a school
  often misses (the "confusion effect").
- **Hiding places**: Posidonia seagrass meadows and rocky reefs, each sheltering a
  limited number of fish from bluefish.
- **Open sea** (can be switched off): when a species that lives here becomes rare, a
  few more swim in from the surrounding sea, but only if the temperature suits them.
  Switch it off to see a closed system, where predators and sardines rarely coexist.
- **Temperature**: away from its best temperature a fish swims more slowly and
  breeds less often (not at all near its limits). Outside its range it loses energy
  quickly and dies of heat or cold stress.
- **Scenarios** change the temperature live without resetting the fish: *Aegean
  year* (15–26 °C, one year = 4 minutes), *Marine heatwave* (25 → 31 °C), *North
  Aegean year* (11–25 °C, lionfish arrive) and *Warming Aegean* (+1 °C every 25
  seconds from 16 °C, invaders arrive once it's warm). Moving the temperature slider
  by hand switches back to manual control. The strip along the top of the chart
  shows the temperature over time.
- **Death**: starvation, old age, being eaten, or heat/cold stress.

Tunable constants are at the top of `sim.js`: `BIO` (small fish), `SPECIES`,
`PRED` and `PRED_SPECIES` (predators), `FOOD_TYPES` and `FOOD_DECAY` (food),
`THERMAL` (temperature effects), `OPEN_SEA`, `REFUGE` (hiding places) and
`SCENARIOS`.

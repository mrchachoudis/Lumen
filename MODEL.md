# Model and assumptions

This document lists where the numbers in `sim.js` come from, how confident we can
be in each, and what the model leaves out. It's a first version of the Roadmap's
Session 32 document and should be reviewed by someone who works on these species.

## How to read the temperature numbers

Each species has three temperatures:

- **tempOpt** – where it does best (fastest swimming, most frequent breeding).
- **tempMin / tempMax** – the edges of its range. Performance falls to zero there, and
  beyond them the fish loses energy fast and dies of heat or cold stress.

Published figures come in a few kinds, and they don't mean the same thing:

- **Lab lethal limits** (e.g. lionfish 10 °C): the temperature that kills fish in a
  tank experiment. Real fish usually stop feeding well before this.
- **FishBase "preferred temperature"**: a model estimate from where the species has
  been recorded (AquaMaps). Useful for comparing species, but it's driven by where
  most records come from. For sardine and anchovy most records are from the
  Atlantic, so these ranges run colder than the Aegean.
- **Spawning temperatures**: the water temperature when eggs are found.

The model's ranges blend these into one simple curve per species, so treat them as
"about right" rather than exact.

## Temperature and metabolism (new)

A fish's resting metabolism speeds up as water warms. The model uses a **Q10 of 2**:
the energy a fish burns just staying alive (plus the upkeep of its muscles and eyes)
doubles for every 10 °C warmer. This is scaled to 1 at each species' best
temperature, so:

- above its best temperature a fish gets hungrier and is also slower, which is why
  cool-water species (sardine) struggle in hot summers and heatwaves;
- below it, a fish needs little food, which is how sea bream survive winters when
  they almost stop eating.

Evidence: across 69 fish species, resting metabolism rises with a Q10 of about 1.8
between species and about 2.4 within a species (Clarke & Johnston 1999). 2 sits
between the two. Swimming cost is unchanged (it rises with the cube of speed).

Simplifications: the model has no oxygen yet (Roadmap Session 10), so it can't show
that warm water also holds less oxygen while fish need more.

## Thermal performance curve

Performance is `1 − x²`, where x is the distance from the optimum as a fraction of
the distance to the limit on that side. Real thermal performance curves are usually
asymmetric: a slow rise from cold and a steep fall above the optimum. The model gets
that asymmetry from the numbers (for most species the optimum is much closer to
tempMax than tempMin) rather than from the shape of the formula.

## Species

Confidence: **High** = several consistent sources. **Medium** = one good source, or
sources that disagree a little. **Low** = estimated to fit the evidence, no direct
measurement found.

### Sardine – *Sardina pilchardus* (native)

| Parameter | Value | Confidence | Evidence |
|---|---|---|---|
| tempOpt | 15 °C | Medium | Spawns at about 13–18 °C in the Mediterranean and Atlantic; spawning in the Gulf of Tunis peaks at the coldest time of year (13.4 °C) [1]. |
| tempMin / tempMax | 9 / 27 °C | Low | FishBase preferred range is 7.1–17.3 °C (Atlantic-dominated) [2]; Aegean sardines live through summers of 26–28 °C by moving deeper. |
| Life history | matures fast, short-lived | High | Matures at age 0–1 [3]; Aegean samples are mostly 1–3 years old [4]; max recorded 15 years (Atlantic) [2]. |
| Spawning season | Nov–Apr, peak Feb | Medium | North Aegean / Marmara study [5]. |

### Anchovy – *Engraulis encrasicolus* (native, new)

| Parameter | Value | Confidence | Evidence |
|---|---|---|---|
| tempOpt | 21 °C | Medium | North Aegean (Gökçeada) spawning May–October, starting at 15.9 °C and peaking at 20.8–23.2 °C [6]; central Mediterranean summer spawning at 24–25 °C [7]. |
| tempMin / tempMax | 8 / 29 °C | Low | Present all year in the Aegean, including the north; no upper temperature limit detected for eggs and larvae in the NW Mediterranean [1b]. |
| Life history | faster than sardine | Medium | Matures in its first year; short-lived. |

Why it's here: the classic sardine–anchovy pair. Both eat plankton, but sardines
spawn in winter and anchovies in summer, so in the *Aegean year* scenario they take
turns. Warming and salinity changes are shrinking the anchovy's spawning habitat in
the NW Mediterranean [8].

### Sea bass – *Dicentrarchus labrax* (native)

| Parameter | Value | Confidence | Evidence |
|---|---|---|---|
| tempOpt | 22 °C | High | Fastest juvenile growth at 22–25 °C; optimum culture 20–24 °C; some populations peak at 26 °C [9][10]. |
| tempMin / tempMax | 3 / 32 °C | High | Lethal limits about 2–3 °C and 30–32 °C [10]. |
| Diet | "shellfish & worms" | Medium – simplified | Young fish eat mostly crustaceans (mysid shrimps), worms and molluscs [11]; **adults are mainly fish-eaters** where small fish are plentiful [12]. The model leaves out fish-eating. |

### Sea bream – *Sparus aurata* (native)

| Parameter | Value | Confidence | Evidence |
|---|---|---|---|
| tempMin | **5 °C** (was 6) | High | Lower lethal temperature about 5 °C [13][14]. |
| Feeding | almost stops below 13 °C | High | Food intake falls sharply below 13 °C; "winter disease" below about 12–14 °C [13][14]. |
| tempOpt / tempMax | 25 / 33 °C | Medium | Warm-water farm species; not re-checked in this pass. |
| Breeding | winter | Medium | Spawns in winter, triggered by falling temperature [15]. Starts life as male, becomes female (protandrous). |

### Red mullet – *Mullus barbatus* (native, new)

| Parameter | Value | Confidence | Evidence |
|---|---|---|---|
| tempOpt | 19 °C | Medium | Peak spawning condition at bottom temperatures of 18–19 °C (NE Levant) [16]. |
| tempMax | 28 °C | Medium | Tolerates about 27 °C, then moves deeper [16]. |
| tempMin | 8 °C | Low | Estimated; lives on the shelf down to 300 m [17]. |
| Life history | matures at 1 year, lives 5–8 | Medium | North Aegean: spawns March–September, mature at one year [18]; lifespan 5–8 years [17]. |
| Diet | benthos | High | Crustaceans and polychaete worms dominate [19]. |

Why it's here: a third bottom feeder competing with sea bass and sea bream for the
same food.

### Rabbitfish – *Siganus luridus* (invasive)

| Parameter | Value | Confidence | Evidence |
|---|---|---|---|
| tempOpt | 27 °C | Medium | FishBase preferred range 24.8–29.2 °C, mean 27 °C [20]. |
| tempMin | 14 °C | Low | In the Cyclades its distribution follows winter minimum sea temperature [21], but no study gave an exact limit. |
| Breeding | summer | High | Gökova Bay (SE Aegean): starts in May, peaks in August [22]; March–August across the Mediterranean [23]. |

### Parrotfish – *Sparisoma cretense* (native, new)

| Parameter | Value | Confidence | Evidence |
|---|---|---|---|
| temps | 12 / 24 / 31 °C | Low | A warm-water native ("thermophilic") that has been spreading north with warming, now recorded in the north Aegean (Saros Bay) [24][25]. FishBase's model range (15–20 °C) is Atlantic-dominated. |
| Diet | seaweed | High | Grazes algae on rocky reefs. |

Why it's here: it's the native herbivore most affected by rabbitfish. In the east
Aegean, rabbitfish foraging lowered parrotfish feeding rates, while the salema
(*Sarpa salpa*) avoided competition by using seagrass more [26]. Off Crete,
rabbitfish and salema did >90 % of the grazing [27]. In Turkey, rabbitfish
grazing stripped experimental reef plots of algae within a month [28].

### Bluefish – *Pomatomus saltatrix* (native predator)

| Parameter | Value | Confidence | Evidence |
|---|---|---|---|
| temps | 10 / 22 / 30 °C | Medium | FishBase preferred range 8.4–27.5 °C, mean 21.1 °C [29]. Struggles to handle prey in cold water [30]. No lab lethal limit found. |

### Lionfish – *Pterois miles* (invasive predator)

| Parameter | Value | Confidence | Evidence |
|---|---|---|---|
| tempMin | **13 °C** (was 14) | High | Lab lethal minimum about 10 °C; feeding stops at about 16 °C; none seen eating below 13 °C [31][32]. The model uses 13 °C because a lionfish that can't eat starves. |
| History | first Greek record 2015 | High | Corsini-Foka & Kondylatos 2015 [33]; spreading north through the Aegean [34]. |
| Breeding | very fast in reality | Medium | Females can spawn every 2–4 days all year (Atlantic data) [35]. The model's lionfish breed more slowly than that so the simulation stays balanced. |

### Dusky grouper – *Epinephelus marginatus* (native predator, new)

| Parameter | Value | Confidence | Evidence |
|---|---|---|---|
| temps | 11 / 22 / 31 °C | Medium | FishBase preferred range 13.3–25.8 °C, mean 19 °C [36]; spawns in the warmest weeks (25–26 °C at the surface) [37]. |
| Life history | very slow | High | Long-lived, slow-growing, female first then male; spawning aggregations make it easy to overfish; on the IUCN Red List [38][39]. In the model it breeds the slowest of all predators. |
| Behaviour | ambush, recognised by prey | Medium | Reef ambush hunter; native, so local fish react to it normally (unlike lionfish). |

### Silver-cheeked toadfish – *Lagocephalus sceleratus* (invasive predator, new)

| Parameter | Value | Confidence | Evidence |
|---|---|---|---|
| temps | 13 / 27 / 33 °C | Low–medium | FishBase preferred range 21.6–28.6 °C, mean 27.3 °C [40]; now found up to the north Aegean, so the lower limit is set below FishBase's range. |
| Diet | fish (in the model) | High | Mainly fish, then crustaceans and molluscs incl. cuttlefish and octopus [41][42]. |
| Impact | nets, poison | High | Damages nets and lines; tetrodotoxin isn't destroyed by cooking [42][43]. Recorded in Greece since 2005 [44]. |

## Scenario claims

- **Aegean warming**: about 0.3 °C per decade (1982–2021 satellite data) [45], up to
  about 0.5 °C per decade in the north Aegean [46]. The scenario text now says
  0.3–0.5 °C (was 0.3–0.6).
- **2024 heatwave**: Greek seas had their longest marine heatwaves on record with the
  highest cumulative intensity [47]. The old text said "most intense", which no source
  supported for peak intensity, so it was reworded.

## Known simplifications

- Adult sea bass eat fish in reality; here they only eat bottom food.
- Predators eat only fish. Real groupers and toadfish eat a lot of octopus and crabs.
- Lionfish breed far more slowly than real ones.
- The open-sea "rescue effect" adds a few fish of every rare species, so with more
  species the predators get more free food than in a closed sea.
- No oxygen, depth refuges from heat, or size-limited predation yet (Roadmap
  Sessions 10 and 15).

## Sources

1. Sardine & anchovy spawning temperatures: [Frontiers in Marine Science 2022](https://frontiersin.org/articles/10.3389/fmars.2022.956654/full); Gulf of Tunis: [VLIZ PDF](https://www.vliz.be/imisdocs/publications/ocrd/136045.pdf)
1b. NW Mediterranean egg/larva SST limits (sardine ~13 °C upper threshold, none for anchovy): [AGRIS record](https://agris.fao.org/search/ru/records/65debebf0f3e94b9e5d0dace)
2. FishBase, *Sardina pilchardus*: [fishbase.org](https://www.fishbase.org/summary/Sardina-pilchardus.html)
3. Sardine maturity, central Mediterranean: [Frontiers in Marine Science 2021](https://www.frontiersin.org/articles/10.3389/fmars.2021.715846/full)
4. Sardine age & growth, Edremit Bay (north Aegean): [Balıkesir University](https://acikerisim.balikesir.edu.tr/items/40d61e55-d754-4cb6-8a26-ede7b4969f41)
5. Sardine reproduction, Marmara & north Aegean: [Oceanological and Hydrobiological Studies](https://czasopisma.bg.ug.edu.pl/index.php/oandhs/article/download/13688/12236/22263)
6. Anchovy spawning, Gökçeada (north Aegean): [Journal of the Black Sea/Mediterranean Environment](https://blackmeditjournal.org/wp-content/uploads/6-20201_84-99.pdf)
7. Anchovy summer spawning at 24–25 °C: [PMC7922735](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC7922735/)
8. Anchovy spawning habitat shrinking with warming, NW Mediterranean: [AGRIS record](https://agris.fao.org/search/en/records/65dea94d0f3e94b9e5d043fa)
9. Sea bass temperature and growth: [PMC10044243](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC10044243/)
10. Sea bass growth optimum and lethal limits: [ULPGC PDF](https://accedacris.ulpgc.es/bitstream/10553/60015/1/alterationofgrowth.pdf)
11. Sea bass diet, Bardawil Lagoon: [SINJAS](https://sinjas.journals.ekb.eg/article_415671.html)
12. Adult sea bass as a major fish predator, Bay of Biscay: [ICES Journal of Marine Science](https://academic.oup.com/icesjms/article/70/2/452/797965)
13. Sea bream winter syndrome and feeding: [Aquaculture Environment Interactions 10:511](https://int-res.com/abstracts/aei/v10/p511-528)
14. Sea bream lower lethal temperature: [Hrčak](https://hrcak.srce.hr/en/323824)
15. Sea bream seasonal reproduction: [SCVMJ](https://scvmj.journals.ekb.eg/article_59206.html)
16. Red mullet and bottom temperature, NE Levant: [METU thesis](https://avesis.metu.edu.tr/yonetilen-tez/2f48572e-8494-4ef2-8e51-4890e666442b/evaluation-of-the-demersal-fish-assemblages-of-the-northeastern-levant-sea)
17. Red mullet depth and lifespan, Aegean: [Marine Life Science](https://dergipark.org.tr/tr/pub/marlife/article/1834416)
18. Red mullet biology, Edremit Bay: [Balıkesir University](https://acikerisim.balikesir.edu.tr/items/67218f64-999f-4057-b038-a3b658b12284/full)
19. Red mullet diet: [Acta Ichthyologica et Piscatoria 41(2)](https://aiep.pensoft.net/article_preview.php?id=26208); [Wikipedia overview](https://en.wikipedia.org/wiki/Mullus_barbatus)
20. FishBase, *Siganus luridus*: [fishbase.mnhn.fr](https://fishbase.mnhn.fr/summary/4613)
21. *S. luridus* distribution in the Cyclades: [Acta Ichthyologica et Piscatoria 2009](https://doaj.org/article/d8242df9eafe4438afd9d836f287aabe)
22. *S. luridus* reproduction, Gökova Bay: [DergiPark](https://dergipark.org.tr/en/download/article-file/5284094)
23. *S. luridus* profile: [IUCN Global Invasive Species Database](https://www.iucngisd.org/gisd/species.php?sc=1907)
24. Parrotfish northward spread: [J. Marine Science and Engineering 9(5):536](https://www.mdpi.com/2077-1312/9/5/536)
25. Parrotfish in Saros Bay (north Aegean): [Kastamonu University](https://acikerisim.kastamonu.edu.tr/entities/publication/f8690b01-ffb2-4925-a445-c7434468c364)
26. Rabbitfish vs native herbivores, east Aegean: [Archipelagos Institute](https://archipelago.gr/impacts-of-invasive-rabbitfish-species-on-native-herbivore-communities-in-eastern-aegean-coastal-ecosystems/)
27. Grazing by rabbitfish and salema, Crete: [Remote Sensing in Ecology and Conservation 2023](https://doaj.org/article/c424785ae2d64834b5b79c6b78f020c9)
28. Rabbitfish stripping algae, Turkey (Sala et al. 2011): [PLOS ONE](https://pmc.ncbi.nlm.nih.gov/articles/PMC3043076)
29. FishBase, *Pomatomus saltatrix*: [fishbase.net.br](https://fishbase.net.br/summary/364)
30. Bluefish feeding at low temperature (Morley & Buckel): [JEMBE PDF](https://cmast.ncsu.edu/wp-content/uploads/2017/04/JEMBE_bluefish_anchovy_temperature.pdf)
31. Lionfish thermal limits (Kimball et al. 2004): [Marine Ecology Progress Series 283:269](https://int-res.com/abstracts/meps/v283/p269-278)
32. Lionfish thesis (feeding cessation): [NC State](https://repository.lib.ncsu.edu/items/ebf10353-d9f3-4090-baf1-36ce7cd343e0)
33. First lionfish in Greece (Corsini-Foka & Kondylatos 2015): [ELNAIS](https://elnais.hcmr.gr/?p=2162)
34. Lionfish spread in the Aegean, citizen science (Giovos et al. 2018): [University of Plymouth](https://pearl.plymouth.ac.uk/handle/10026.1/11837)
35. Lionfish spawning frequency: [Frontiers in Marine Science 2015](https://www.frontiersin.org/journals/marine-science/articles/10.3389/fmars.2015.00007/pdf)
36. FishBase, *Epinephelus marginatus*: [fishbase.se](https://www.fishbase.se/country/CountrySpeciesSummary.php?c_code=070&id=6470)
37. Grouper spawning and temperature, Medes Islands: [Marine Ecology Progress Series 325:187](https://int-res.com/abstracts/meps/v325/p187-194)
38. Grouper biology and conservation: [AGRIS review](https://agris.fao.org/search/en/records/65dfcb034c5aef494fe56670)
39. Grouper overview: [Wikipedia](https://en.wikipedia.org/wiki/Epinephelus_marginatus)
40. FishBase, *Lagocephalus sceleratus*: [fishbase.se](https://www.fishbase.se/country/CountrySpeciesSummary.php?c_code=792&genusname=Lagocephalus&speciesname=sceleratus)
41. Toadfish diet off Crete (2025): [Mediterranean Marine Science](https://ejournals.epublishing.ekt.gr/index.php/hcmr-med-mar-sc/article/download/38444/29939)
42. Toadfish biology and ecology review (Ulman et al. 2021): [NeoBiota](https://neobiota.pensoft.net/article/71767/)
43. Toadfish health risks in Greece: [To Vima](https://www.tovima.com/science/local-red-cross-cites-risks-from-invasive-pufferfish-in-greek-waters/)
44. Pufferfish species spreading in Greek seas: [To Vima](https://www.tovima.com/society/six-pufferfish-species-now-spreading-across-greek-seas/amp/)
45. SST trends in the Black, Marmara and Aegean Seas, 1982–2021: [ITU](https://research.itu.edu.tr/tr/publications/sea-surface-temperature-and-marine-heatwave-variability-in-interc/)
46. North Aegean warming (EGU 2023): [Copernicus](https://presentations.copernicus.org/EGU23/EGU23-15096_presentation.pdf)
47. 2024 marine heatwaves in Greek seas: [J. Marine Science and Engineering 12(11):2020](https://www.mdpi.com/2077-1312/12/11/2020)
48. Fish metabolism and temperature (Clarke & Johnston 1999): [NERC Open Research Archive](https://nora.nerc.ac.uk/id/eprint/503085)
49. Thermal performance curve shapes: [PMC11326125](https://pmc.ncbi.nlm.nih.gov/articles/PMC11326125)

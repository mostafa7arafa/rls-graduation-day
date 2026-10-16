# RLS: Graduation Day — Design

> Goal (from the original plan): **a playable digital RLS that makes Hussein and Hefny laugh.** Not a technically impressive generic game.

## Why this is attempt #3
| Attempt | Tech | What went wrong |
|---|---|---|
| RLS Graduation Impossible | Phaser 3, side-scrolling beat-'em-up | All art drawn in code with rounded rectangles: looked like stick figures, heads clipped. The genre is fighting, but the comedy lives in dialogue. |
| RLS ESCAPE | Godot 4, 3D third-person | Huge scope for a first game (3D, navmesh across floors, split-screen co-op). Procedural boxes for art. Claude couldn't see/run the editor, so testing fell on Mostafa. |
| **RLS (this)** | Phaser 4, top-down 2D RPG | Real pixel art baked to PNGs, comedy-first genre, runs in a browser, Claude can playtest it headlessly, shareable as a link. |

## Pillars
1. **Recognition over realism.** Your friends should spot themselves from 20 m: Mostafa = buzz cut, mustache + soul patch, blue hoodie. Hussein = bandaged head, keeper gloves, orange. Hefny = huge curly hair, books, green, turns red.
2. **Friendship is the story, school is the stage.** Hussein's disasters, Hefny's anger, Karim's absurd popularity, Habeba, teachers picking on Hussein.
3. **Explore → laugh → objective → teacher encounter → back to the court.** Never fight-fight-fight.
4. **Who leads changes everything.** TAB swaps the leader; every NPC and object reacts differently. This is the cheapest, funniest content multiplier we have.
5. **You can't beat a teacher, you win them over.** Undertale-style encounters: ACT (one per friend), dodge their "attacks", MERCY when CALM is full. FIGHT always fails comically.

## Chapter 1 (built, v0.1)
Bell rings → gate chained ("no student leaves with unfinished business") → Mr Abdelfattah hints Mr Hassan has the key and loves his oud perfume → Mr Hassan encounter (chalk rain, green stick sweeps, oud clouds) → key → gate → street → PA: "Sheikh Nasser has prepared... a QUIZ." Side jokes: library closed since 2009, Hussein's filing drawer, Karim's car parked *inside*, Hussein's goal, the swings, the warm water cooler, the taboor flagpole, canteen auntie's 2019 debt, Habeba.

## Roadmap (each chapter = one teacher, one new mechanic)
| Ch | Teacher | Encounter mechanic | Notes |
|---|---|---|---|
| 2 | **Sheikh Nasser** (mosque corner) | **Quiz battle** — multiple choice where his "correct" answers are confidently wrong; you must answer what *he* thinks | First floor unlock. Great for Claude-written question packs |
| 3 | **Mr Yasser** (English) | **Spelling bullet-hell** — misspelled words fly at you; dodge wrong ones, catch right ones | He bullied Hussein → Hussein's revenge chapter |
| 4 | **Mr Abdo & Mr Ahmed Rezk** (science lab) | **Double boss / lab puzzle** — mix chemicals; Hefny's chapter (he loves science) | Hefny solo segment |
| 5 | **Mr Abdelkareem** (math, greedy) | **Bargaining boss** — economy: pay for "private lessons" or haggle; ful sandwiches are currency | Hefny hates math: rage meter matters |
| 6 | **Mr Amr** (gym) | **Rhythm / QTE** push-ups & laps | Comic relief chapter |
| Finale | **Karim** | **Penalty shootout on the court**, Hussein in goal | Callback to the court hub, Habeba watching. Hefny's final rage |

## Ideas bank (from research — pick, don't do all)
- **Friend-specific overworld abilities** (Zelda-style gating): Hussein dives (reach things under desks / through gaps), Hefny's rage shoves stuck doors and lockers, Mostafa hacks the PA/projector/phone. Gates progress on swapping leaders, not just jokes.
- **Court hub "bench talks"** (Mass Effect camp idea): between chapters the three sit on the bench and talk; new lines unlock from flags. Pure friendship content.
- **Memories collectibles**: 12 hidden photos/objects; each opens a 3-line flashback; ending slideshow. Could use pixelated real photos (local only).
- **Habeba status effect**: in any encounter where she's present, the boys get "Flustered" (ACT menu text scrambles).
- **Teacher ACTs evolve**: repeating an ACT gives diminishing but funnier responses (already done for Mr Hassan; keep the pattern).
- **Phone controls + share link**: on-screen D-pad, deploy to GitHub Pages / itch.io so friends play on their phones.
- **Local co-op**: followers can be driven by player 2/3 on gamepads (the party system already supports it).
- **AI-powered teacher** (portfolio piece): Sheikh Nasser improvises quiz questions via Claude through a tiny backend (never put the API key in the browser). Pre-generate packs as an offline fallback.
- **Egyptian voice stingers**: a few recorded/ElevenLabs lines ("3andoko 7essa fara8!") at key moments.
- **Time of day**: the school gets darker/weirder through the chapters (Phaser 4 lighting/filters).
- **Achievements**: "No scratch on Mr Hassan", "Talked to Habeba as all three", "Read every notice board".

## Art direction
16×16 tiles, 16×24 chibi characters, dark-plum outline, warm Egyptian-school palette: cream walls with the green oil-paint band, terrazzo floors, interlock courtyard pavers, green iron railings. Upgrade path: LimeZu *Modern Interiors* ($1.50, has classrooms + a character generator, **credit required, no redistribution of raw assets**) — the tile/sheet sizes already match.

## Cast & lore (from Mostafa)
- **Mostafa** — AI engineer, "the Engineer". Light-medium skin, dark angled brows, thin mustache + soul patch, very short dark hair.
- **Hussein** — hates school, best goalkeeper, irresponsible and injury-prone, slightly chubby, loved being bullied (made everyone laugh). **Owns a tractor** (family farm) — save it for a big payoff later in the story, not a throwaway line. Fair skin, hazel/green eyes, dark thick wavy hair.
- **Mohamed Hefny** — nerd (no glasses), wants to be a doctor, loves science hates math, anger issues (turns red, strong). Fair skin, arched brows, big open smile, dark brown curly hair.
- **Karim** (final villain) — rich kid, car, iPhone, gold watches, sunglasses; rarely attends, buys grades; beloved; tall football star (headers); won Habeba over Hussein & Hefny. Most hated by Hefny.
- **Habeba** — the girl both Hussein & Hefny liked; chose Karim. Legendary NPC: everyone acts dumb near her.
- **Teachers** — Mr Hassan (scary, oud perfume, green stick — Ch1 ✓). Sheikh Nasser (religion, knows little — quiz). Mr Yasser (English, bullied Hussein). Mr Abdo & Mr Ahmed Rezk (science, picked on Hussein). Mr Ibrahim (social studies, friendly). Mr Amr (gym). Mr Abdelfattah (Arabic, funny, beloved — guide NPC ✓). Mr Abdelkareem (math, greedy). Misses Doaa, Shimaa, Hager (young teachers).
- **School** — boxy, 4 floors. Ground floor: offices + library. Small garden (swings/slides). Small 5-a-side football court — the core memory and the hub.

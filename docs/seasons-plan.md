# RLS: Seasons plan (draft, before implementation)

RLS becomes a collection of **seasons**, picked from the home menu. Each season is its own story with its own save.

- **Season 1: Graduation Day.** The current 7-chapter game, unchanged.
- **Season 2: The Cup (كأس المدرسة).** The school football tournament.
- Later seasons are side stories.

Status (16 Oct 2026): match approved by the author ("super fun"). **The cup is built**: warm-up, QF, SF, final, penalties, bracket, story lines, both difficulties, trophy, anime cutscenes for signature moves. Not yet: real sprites for Saif / Abdallah / Elrediny / Mr Amr Karate / the other grades, the between-rounds overworld, the season menu + separate saves for Season 1. Second opinion from Pi (GPT-6.1 Sol), read-only review, merged in.

---

## 1. Season 2: what really happened (author's answers, 16 Oct 2026)

- **Setting:** the final year *before* graduation (a prequel). We won the cup and even beat the teachers. The semi-final against Saif was the hardest match. The game ends with the cup.
- **Teams (8):** the 7 grades that entered plus the teachers. Egyptian names: 5th Primary, 6th Primary, 1st Prep, 2nd Prep, 3rd Prep, 1st Secondary, **2nd Secondary (us)**. 3rd Secondary doesn't enter. That gives **quarter-final, semi-final, final**.
- **Format:** **4 vs 4** (keeper plus 3 outfield) with one substitute, because the court barely fits 3v3. 10 minutes split into two halves; a draw goes to penalties.
- **Mostafa** is the **coach**: half-time team talk, tactics, subs and the injured knee. **Mohamed Hefny** is the **chant leader** in the crowd and looks after Hussein's injuries. Neither of them plays.
- **The chant:** «حسين السد العالي». Hussein is *the High Dam*. The crowd sings it after every big save.

### The court (from the CAD sketch, standing at the main entrance looking in)
- A long, narrow court, about **28 × 13 m**. The goals are at the north end (school building) and the south end (canteen).
- Surface: grey **street stone tiles** (بلاط الشارع), not grass.
- The **school wall on the right** (east): the ball bounces off it.
- On the **left** (west): the 1.5 m pathway, where the crowd stands and Hefny leads the chants, then the garden. The ball goes out on that side, so a kick-in.
- The main entrance and the canteen are at the south end; the school building is at the north.
- The pitch is **vertical** on screen (top-down, scrolling up and down), so the real geography stays true: wall on the right, crowd and garden on the left.
- About 16 px per metre: the court is 208 px wide and 448 px long, about 1.7 screens tall. The players are the normal 16×24 sprites.
- The whole school is a bit shorter than the sketch; the court proportions are right. The S2 overworld is a new map of this real layout. Season 1's green horizontal court stays as it is.

### Bracket
| | Match | Notes |
|---|---|---|
| Friendly | us vs **2nd Prep "the Twins"** | Tutorial before the draw. The twins swap shirts and the referee never notices. |
| QF | **us vs 1st Secondary (Abdallah)** | Left-footed rocket, telegraphed: he shifts the ball to his left and the crowd gasps. Hussein hurts his knee saving one. |
| QF | 1st Prep (Saif) vs 3rd Prep (the villains: older, cocky, dirty tackles) | Saif's small team knocks them out. We watch it from the pathway. |
| QF | Teachers vs 5th Primary | 12–0. Sheikh Nasser apologises to each child individually. |
| QF | 6th Primary vs 2nd Prep | The twins go out. |
| SF | **us vs 1st Prep (Saif)**, the brother derby | **The hardest match.** Hussein plays hurt. |
| SF | Teachers vs 6th Primary | |
| Final | **us vs the Teachers** | We win. |

Saif is 4 years younger. If we're 2nd Secondary, that puts him in 1st Prep (to confirm). He's **small**, which the sprite should show.

### Our team
| | Role | Signature |
|---|---|---|
| Hussein | GK | "The High Dam". Neuer-style saves. Knee meter: he plays to the last drop. |
| Karim | Captain, striker | Headers, long shots, top scorer |
| Ahmed Warshan | All-rounder | The good guy. Backup keeper. |
| Ahmed Elrediny | Midfield | Warshan plus a bit more skill |
| Ibrahim El Shazly | Sub / defence | Decent, with the occasional comic mistake |

### The teachers (final)
| | Role | Signature |
|---|---|---|
| Mr Ahmed Rezk | GK | Aggressively *normal* |
| Mr Ibrahim | Dribbler | Short. Stops to show off when the women teachers cheer, which gives you a window. |
| Sheikh Nasser | Shooter | Plays in a galabeya. Slow, but a cannon. |
| **Mr Amr Karate** (new character; not gym Mr Amr) | Playmaker | Square-shaped, goatee and moustache (دقن دوجلاس). Magic passes. |
| Mr Abdelfattah | Sub | |

Mr Abdo or gym Mr Amr come on as surprise subs.

### Rivals
- **Saif:** small. Dribbles, assists, hates losing, yells at teammates (and they then play worse for a moment).
- **Abdallah:** left foot, rocket shots.
- **Abdallah's mother**, the students relations manager, wears niqab: shown warmly and respectfully, never as a joke.
- Looks for Saif, Abdallah and Elrediny are invented.

### Difficulty
- **Story:** lose a match and you retry it.
- **Cup:** lose a match and the tournament starts over.

### Two players (two controllers)
- **Co-op:** player 1 controls the outfield team. Player 2 *is Hussein* in goal, with manual dives. "Me and Hussein together."
- **Versus:** an exhibition mode outside the story where you pick any two teams (us vs Saif, us vs the teachers...).

## 2. The match: assisted arcade

References:
- **EA FC Rush**: 5v5 with AI keepers, a pitch about 64×47 m, a single 7-minute clock.
- **Sloclap's Rematch**: walls, no fouls, no offside, 6 minutes plus golden goal.
- **Nintendo World Cup / Sensible Soccer**: top-down arcade with comedy special moves.
- **Inazuma Eleven**: RPG exploration plus football matches, with special moves paid for from a gauge.

Decision: **real-time, but assisted.** This matches Pi's recommendation.
- You control one player and switch to the one nearest the ball.
- Passing is assisted and directional. Shoot and tackle are contextual. Teammates make their own support runs.
- The clock *shows* 10 minutes (2 × 5); in real time a half is about 2.5 min (option: full length).
- A few slow-motion "signature" beats, never a QTE on every shot.

Command-based matches (Captain Tsubasa style) are the fallback if the real-time prototype isn't fun.

- **Rules:** no offside. Wall on the right = rebounds; kick-ins on the garden side and the goal lines. Fouls are comedy events only. A draw goes to a penalty shootout (shootout *rules* extracted from PenaltyScene; the Karim/Habeba theatre stays in S1).
- **Ball:** x/y plus fake height z, drawn with a shadow. Ground pass, lob, charged shot, a header band.
- **AI:** Buckland's *Simple Soccer* architecture (Programming Game AI by Example), which is literally 4 field players plus a keeper:
  - team states: attacking, defending, kickoff
  - field-player FSM: wait, chase, dribble, kick, receive, support attacker, return home
  - keeper FSM: tend goal, intercept, return home, put in play
  - supporting-spot scoring and steering

  Each player has stats plus data-driven signature traits.
- **Engine shape:** a pure-TypeScript fixed-timestep simulation (`src/match/`) that doesn't depend on Phaser. It uses seeded randomness and replayable input logs. MatchScene only draws it. This allows:
  - headless AI-vs-AI batches to find deadlocks and balance each round
  - rule unit tests
  - a playtest bot that plays a match
- **Input:** the keyboard bridge stays for menus and Season 1. Matches get a new **action adapter** with:
  - an analog movement vector
  - pressed/held/released actions with charge time
  - which pad pressed it
  - cleared state on blur, pause or disconnect

  The current bridge snaps sticks to 8 directions and merges bumpers and pads, so it can't do this. The phone layout gets contextual buttons (A = pass/tackle, B = shoot/hold) plus auto-sprint, because two thumbs can't do more.

## 3. Seasons shell: what has to change in this codebase
- `save.ts`: one save per season. Season 1 keeps the `rls-save` key and its migration. Season 2 gets its own key, defaults and party type. The season must be chosen before load/reset.
- `TitleScene`: RLS logo, then season cards, then Continue/New Game for that season.
- `WorldScene`/`UIScene`: they import S1's story, maps, party, clearance form and yearbook directly. These go behind a small **Season contract** (story, maps, party, HUD items, credits). S1 plugs in as-is. S2 starts with its own small campaign runner and only reuses WorldScene where that's cheap.
- New match scene lifecycle: its own pause handling, and registration in `main.ts`/`BootScene`.
- Regression: S1 `full` playtest in English and Arabic must still pass.

## 4. Milestones (risk first)
1. **M1 Playable match slice (grey boxes):** the real court (vertical, wall on the right), 4v4, movement/pass/shot/tackle, basic AI *and* keeper together, plus the per-pad action adapter (player 2 can take Hussein). **Tested on the real controllers and a real phone** before anything else is built. Go/no-go on real-time vs command.
2. **M2 Seasons shell:** season select, per-season saves, S1 untouched.
3. **M3 Match depth:** better AI, signature traits, lobs/headers, the rare SAVE beats, Hussein's knee, the penalty shootout, headless balancing.
4. **M4 Art:** Saif, Abdallah, his mother, Elrediny, Mr Amr Karate, invented teams, kit palette swaps. New frames appended (kick, slide, dive, header): the existing 9 are never reordered. Also the court and ball spin.
5. **M5 Story:** the draw, training drills that teach the controls, between-round overworld, bracket board, the final, credits, all of it in Arabic too.
6. **M6 Polish:** crowd and darbuka chants, Hefny as text commentator(?), README and post.
7. 2-player versus exhibition mode. Co-op (player 2 = Hussein in goal) already works from M3, because the M1 input adapter knows which pad is which from day one.

## 5. Skills to add
From `gamedev-skills/awesome-gamedev-agent-skills` (same source as the current design skills, Apache-2.0):
- `game-ai`: FSMs, steering, behaviour trees
- `physics-tuning`
- `camera-systems`
- optionally `ai-behavior-trees-utility-ai`

No sports-AI skill exists, so we write a project-local **`football-ai`** skill: the Simple Soccer architecture, our rules and our tuning numbers, so every session follows the same playbook.

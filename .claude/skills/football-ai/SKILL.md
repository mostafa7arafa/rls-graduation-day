---
name: football-ai
description: >
  How RLS Season 2 football works and how to change it safely: the match simulation
  (src/match/sim.ts), its AI (Buckland "Simple Soccer" cut to 4-a-side), ball physics with
  fake height, the per-player controller input, and the headless balancer. Use when touching
  anything in src/match/, MatchScene, src/systems/actions.ts, team stats, keeper behaviour,
  difficulty, or when the user mentions the football season, the cup, a match, tactics, Saif,
  Abdallah, the teachers' team, or Hussein in goal.
---

# Football in RLS (Season 2: The Cup)

The real facts (who played, the court, the bracket) live in `docs/seasons-plan.md`. Keep them true:
these are real people and a real school.

## Shape of the code
| Piece | File | Rule |
|---|---|---|
| Court geometry | `src/match/court.ts` | 16 px = 1 m. Court 13 x 22 m, vertical. School wall on the RIGHT (ball bounces), garden side LEFT (ball out = kick-in), building goal top, canteen goal bottom. |
| Teams + stats | `src/match/teams.ts` | Stats 0..1. 4-a-side: `gk` + 3 `field` + `sub`. `ai.reaction` = decision interval (s), `ai.aggression` 0..1. Every name shown goes through `tr()`: add Arabic in `src/data/ar/match.ts`. |
| The match | `src/match/sim.ts` | **Pure TS, no Phaser, no DOM, no Math.random.** Fixed `DT`, seeded RNG, all input passed to `step()`. Team 0 attacks UP (y to 0), team 1 attacks DOWN. |
| Drawing + menus | `src/scenes/MatchScene.ts` | Reads `m.events` after each step for sound/text. Never puts rules here. |
| Input | `src/systems/actions.ts` | One `SlotInput` per human. Keyboard + touch (touch presses keys) + first pad = P1; second pad = P2. Quick taps are latched until the next read. FIFA layout: Cross pass, Square shoot (hold), Circle lob, Triangle through, R2/R1 sprint, L1 switch. |
| Button numbers per controller | `src/systems/padmap.ts` | Standard pads (real DualSense/Xbox) vs generic Linux pads (e.g. the author's QIXIONG: Cross 0, Circle 1, Square 3, Triangle 4, L1 6, R1 7, L2 8, R2 9, Share 10, Options 11, d-pad on axes 6/7). Never hard-code button indices anywhere else. |
| Crowd | `src/systems/crowd.ts` | Synth murmur that swells near goal, ooh / roar / applause, formant-voice chants ("Hu-SEIN! el-SADD el-AA-li!"). Music track `stadium`. |
| Balancer | `tools/match-sim.mjs` | `node tools/match-sim.mjs rls teachers 200`: AI vs AI, W/D/L, goals, shots, saves, possession, stuck balls. |

## The cup and signature moves
- `src/match/cup.ts`: 8 teams, warm-up friendly (2nd Prep) → QF (1st Sec, Abdallah) → SF (1st Prep, Saif: the hardest) →
  final (teachers). Other matches are simulated with the real engine; `STORY` forces the results that really happened.
  Knockout draws go to a penalty shootout (`phase 'pens'`: 5 each, then sudden death; the human takes our kicks and is
  the keeper for theirs). Story difficulty = replay a lost match; Cup = start again.
- Signature moves (`SPECIALS` in sim.ts, 13 of them, kinds shot / dribble / pass / tackle / save, each with an inner `line`):
  a qualifying moment sets `m.pending` and emits `special`; the sim is frozen until `release()`. MatchScene plays the cut-in
  (`src/scenes/match/cutin.ts`; tackles and saves are DUELS against the man on the ball / the last shooter), then releases:
  **the AI plays the move, not the human**, with ~0.5 s of slow motion. Max 2 per player per match, 18 s apart (~8-12
  per match). Headless code (balancer, cup simulation) must call `release()` whenever `pending`.
- Fouls: a failed tackle from behind can be a foul (`foul` event, free kick where it happened); the second by the same
  player is a yellow card (`card`): Mr Amr's panel. ~3 fouls a match. `lost` = someone was tackled (Saif shouts).
- Mercy rule (option in the cup hub, `rls-mercy`, off by default): `MatchConfig.mercy` = 5 ends the match after a goal
  that makes the lead 5 (`full` event with `kind: 'mercy'`).
- Comments: `src/match/banter.ts` pools; MatchScene `shout(key)` draws one whose speaker is present and shows it as a
  bubble, or as a portrait toast when the speaker is off camera. Add lines freely (with Arabic); keep pools long.
- `m.tactic[team]` (-1 defend, 0, 1 attack) shifts pressing and shooting via `aggr()`; set by the coach's half-time talk.
- The shootout a human sees is NOT the sim's: MatchScene opens `Shootout` (front view, aim + power, keeper tells) and
  hands the kicks back with `m.finishPens(kicks)`. The sim's own `pens` phase is only for AI-vs-AI (balancer, cup sim).
- `MatchScene.cutting` = a cut-in, talk or shootout is on: the sim isn't stepped and pause is blocked. Events from calling
  sim methods directly (outside `step()`) are cleared by the next step and never reach the scene.
- Balance per round (AI rls vs them, knockout): prep2 ~99%, sec1 ~81%, prep1 ~75%, teachers ~62%.

## AI (decide → steer)
- **Team state** each tick: attacking (we own the ball) or defending / loose ball.
- **Defending:** players sorted by time-to-ball. Rank 0 presses (and tackles), rank 1 covers the lane between the
  ball and our goal, rank 2 holds the formation. A human teammate counts in the ranking.
- **Attacking:** the carrier decides on its reaction timer: shoot (in range, lane clear, closer = keener) → pass
  (`bestPass`: open + forward + sensible distance, lane clear) → dribble at goal sliding away from the nearest
  defender. One teammate runs to the **supporting spot** (grid of candidates scored on: safe pass lane, closer to
  goal, ~72 px from the carrier, space), the other holds shape.
- **Keeper:** sits on the ball–goal line, steps out as the ball nears; reads a shot's crossing point and moves or
  dives there (`startDive(..., need)`: a dive covers only the distance needed, never a fixed burst: that bug
  made keepers fly past the ball). Whether a shot on target is saved is `pSave` in `contacts()` (skill, shot
  speed, placement, diving). Tune saves there, not by breaking the positioning.
- Steering is arrive-to-target with an acceleration cap (`movePlayers`), then circle separation.

## Rules that bit us (keep them)
- **Measure before tuning.** When goals or shots look wrong, trace it: where shots come from, how many defenders are goal-side,
  who is stunned (see the debug pattern in the balancer). Twice the real cause was a bug, not a number: defenders stunned by
  spammed tackles, and a defender chasing from *behind* shoving the carrier toward goal.
- **Only a goal-side defender holds firm** against the carrier in the collision push; from behind it's an even shove.
- **Passing:** the receiver is AI-driven until he traps it (control switches on reception, not on the pass), runs to the meeting
  point, has a bigger trap radius (MAGNET). Pass speed is weighted to arrive (~80 px/s left). Clear every `receiving` flag on
  any trap/catch, or defenders chase passes that are gone.
- **Shot / tackle chances are per second,** scaled by the team's decision interval: a per-decision chance compounds to "always".
- **Teams change ends at half time** (`topTeam`): the court isn't symmetric (wall one side, garden the other). Use
  `attackDir/ownGoalY/oppGoalY`, never `team === 0`.
- **Seed scrambling + fixed starting think timers:** mulberry32's first numbers correlate for seeds 1,2,3..., which gave the home
  team a ~57% edge in mirror matches. Any new per-team randomness at match start must not come from the first draws.
- **Update order alternates every tick.** With a fixed order, the team that thinks first lost ~55/45 in a mirror
  match. Verify any AI change with a mirror match (`rls rls`): W and L must be within noise.
- **Control follows the ball:** a pass switches the human to the receiver, a pickup switches to the carrier.
- **Buttons held from a menu are not presses:** `MatchScene.prime()` runs on the next frame (the menu key fires
  inside Phaser's handler before the action listener sees it).
- **The keyboard bridge is filtered during play** (`bridgeOnly([START, MUTE])`), or pad 1 would also drive the
  keyboard player. Restore it (`bridgeOnly(null)`) for every menu.
- Pace now: goals ~10 per match (5 real minutes), shots ~19 per team, passes ~75% completed, no keeper punts, no stuck balls.
  Mirror matches (`rls rls 600`) must be even within noise. AI `rls` beats AI `teachers` ~2:1 on purpose: a human in control is
  usually worse than the AI at first, and the author found the old teachers overpowered.

## Workflow
1. Change the sim, then `npx tsc --noEmit`.
2. `node tools/match-sim.mjs rls teachers 200` and a mirror `rls rls 200` (deadlocks, balance, side bias).
3. `node tools/playtest.mjs match` (keyboard bot plays a full short match), `node tools/playtest.mjs match2`
   (two fake controllers: co-op, P2 = Hussein; versus, P2 = the teachers; Square charges; Start pauses),
   `node tools/playtest.mjs generic` (a generic Linux pad: Square shoots, L2 doesn't mute, d-pad on axes, Options pauses). Look at the
   screenshots in `tools/preview/playtest/match*/`.
4. Phones: the touch buttons press keys, so the keyboard path covers them; test with real touch events (CDP
   `Input.dispatchTouchEvent`), not synthetic PointerEvents (`setPointerCapture` rejects those).
5. AI-vs-AI balance is not fun-testing. The author plays it on real controllers before anything is "done" — and **nothing is
   pushed (= deployed) until they have.**

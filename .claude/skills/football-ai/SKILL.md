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
| Input | `src/systems/actions.ts` | One `SlotInput` per human. Keyboard + touch (touch presses keys) + first pad = P1; second pad = P2. Quick taps are latched until the next read. |
| Balancer | `tools/match-sim.mjs` | `node tools/match-sim.mjs rls teachers 200`: AI vs AI, W/D/L, goals, shots, saves, possession, stuck balls. |

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
- **Update order alternates every tick.** With a fixed order, the team that thinks first lost ~55/45 in a mirror
  match. Verify any AI change with a mirror match (`rls rls`): W and L must be within noise.
- **Control follows the ball:** a pass switches the human to the receiver, a pickup switches to the carrier.
- **Buttons held from a menu are not presses:** `MatchScene.prime()` runs on the next frame (the menu key fires
  inside Phaser's handler before the action listener sees it).
- **The keyboard bridge is filtered during play** (`bridgeOnly([START, MUTE])`), or pad 1 would also drive the
  keyboard player. Restore it (`bridgeOnly(null)`) for every menu.
- Pace now: goals ~6-7 per match, shots ~12-16 per team, no stuck balls. A change that pushes goals above ~9 or
  makes 0-0 common needs a reason.

## Workflow
1. Change the sim, then `npx tsc --noEmit`.
2. `node tools/match-sim.mjs rls teachers 200` and a mirror `rls rls 200` (deadlocks, balance, side bias).
3. `node tools/playtest.mjs match` (keyboard bot plays a full short match), `node tools/playtest.mjs match2`
   (two fake controllers: co-op, P2 = Hussein; versus, P2 = the teachers; charge; Start pauses). Look at the
   screenshots in `tools/preview/playtest/match*/`.
4. Phones: the touch buttons press keys, so the keyboard path covers them; test with real touch events (CDP
   `Input.dispatchTouchEvent`), not synthetic PointerEvents (`setPointerCapture` rejects those).
5. AI-vs-AI balance is not fun-testing. The author plays it on real controllers before anything is "done".

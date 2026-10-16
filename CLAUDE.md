# RLS: Graduation Day

Top-down 2D comedy RPG (Undertale / Pokémon style) about three real friends — Mostafa, Hussein, Mohamed Hefny — trapped in Rosetta Language School (Rashid, Egypt) on graduation day. Successor to two abandoned attempts (Phaser beat-'em-up, Godot 3D) — see `docs/design.md` for why we pivoted.

## Run
- `npm run dev` → http://localhost:5173
- `npm run art` → re-bake all pixel art into `public/assets/` (run after editing anything in `tools/art/` or `src/data/map.ts`)
- `npm run build` → typecheck + production build in `dist/` (static, deployable anywhere)
- `node tools/playtest.mjs <smoke|full|battle|ch2|...>` (chN scenarios start from a save at that chapter) → headless playthrough with screenshots in `tools/preview/playtest/` (dev server must be running). **Run `full` after any story/flow change** and look at the screenshots. `LANG=ar node tools/playtest.mjs full` does the same in Arabic.
- `node tools/i18n-check.mjs` → lists English lines with no Arabic translation, and stale Arabic keys

## Stack
Phaser **4** (not 3 — APIs differ, e.g. no `setTintFill`; use the Phaser skills in `.claude/skills/`) + TypeScript + Vite. No other runtime deps.

## Where things live
| What | File |
|---|---|
| All dialogue, jokes, NPCs, inspectable spots, quest logic | `src/data/story/chN.ts`, one per chapter (the screenplay — most edits go here); `recurring.ts` = characters who stay all game; `types.ts` = what a script can do (`Ctx`) |
| Floors (ASCII, 1 char = 16px tile), props, stairs/warps | `src/data/map.ts` (data only — the art baker reads it) |
| Speakers: name, portrait, voice pitch, colour | `src/data/cast.ts` |
| Overworld: movement, party/followers, interaction, props | `src/scenes/WorldScene.ts` |
| Mr Hassan's encounter (ACT / dodge / MERCY) | `src/scenes/BattleScene.ts` |
| Chapter 2+ encounters (one mechanic each), shared base `Encounter.ts` | `src/scenes/encounter/*.ts` |
| Dialogue box, choices, HUD, toasts | `src/scenes/UIScene.ts` |
| Save (flags/items, localStorage, versioned) | `src/systems/save.ts` |
| Synth SFX + voice reactions (no audio files) | `src/systems/sfx.ts` |
| Background music (text-written chiptune, maqam scales + darbuka) | `src/systems/music.ts` |
| Egyptian Arabic translation (English line → Masri) | `src/data/ar/chN.ts`, lookup in `src/systems/i18n.ts` |
| Pixel art source (characters, tiles, props) | `tools/art/*.mjs`, toolkit `tools/pix.mjs` |

## Conventions
- **Art is baked, not drawn at runtime.** Every sprite is authored pixel-by-pixel in `tools/art/` and exported to PNG. Never draw characters with Phaser Graphics — that's what made the old versions look bad. Preview sheets land in `tools/preview/` (open `map.png` / `characters.png` to eyeball).
- Tile order in `tools/art/tiles.mjs` = tile index. **Append only**, never reorder. `src/data/tiles.gen.ts` is generated.
- Characters: 16×24 frames, 9 per sheet (down×3, up×3, side×3 facing left; flip for right). Auto 1px outline `#1b1420`.
- Internal resolution 480×270, `pixelArt: true`, font Press Start 2P at 8px (has ▼ ▶ ♥; no Arabic glyphs).
- **Two languages.** English is written inline as the source; `src/data/ar/*.ts` maps each exact English string to Egyptian Arabic (adapt jokes, don't translate literally). UIScene/BattleScene call `tr()` at display time, so scripts never deal with language. **Any new or edited English line needs its Arabic entry** — run `node tools/i18n-check.mjs`. New text objects use `txt()` from `i18n.ts` for their style (Arabic = Noto Kufi 12px, RTL; RTL texts anchor by their right edge, and layouts mirror in Arabic).
- Voice reactions: `c.emote(who, mark)` also plays that character's grunt (gasp/aww/growl/huh/sigh); `c.react(who, 'laugh'|'noo'|'ow')` for sound only. Use them on punchlines.
- Music: `music.play('title'|'school'|'battle')`; tracks are note strings in `music.ts`, easy to edit.
- Story state = flags in `save.ts`; `chapter` flag = current chapter. NPCs/spots/props take `when` so the world changes with the story; scripts can `teleport`, `walk`, `solo`, `chapter` (title card) — see `story/types.ts`.
- Story state = flags in `save.ts`. Scripts are `async (c: Ctx) => {...}`; use `by(c, {mostafa, hussein, hefny})` for leader-dependent lines — that's the core comedy mechanic, every new interaction should use it where it's funny.
- Keyboard menus must be **event-driven** (`keydown`), not polled with `JustDown` — quick taps get lost.
- Keep jokes affectionate; these are real people. Lore and personalities: `docs/design.md`.
- Commits: no AI attribution lines (portfolio repo).

## Skills (project-local, `.claude/skills/`)
Phaser 4 official: game-setup-and-config, scenes, tilemaps, sprites-and-images, animations, tweens, cameras, input-keyboard-mouse-touch, text-and-bitmaptext, loading-assets, physics-arcade, scale-and-responsive, v4-new-features, audio-and-sound, particles.
Design (gamedev-skills): game-feel, dialogue-systems, level-design, rpg, game-ui-ux, save-systems, audio-design, prototype-fast.

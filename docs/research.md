# Research notes — skills, assets, design (2026-10-15)

## Agent skills installed (project-local in `.claude/skills/`)
Chosen by install count + source reputation, and read before installing (they're pure instructions/snippets, no scripts run).

| Source | Why trust it | Skills taken |
|---|---|---|
| [phaserjs/phaser](https://skills.sh/phaserjs/phaser/tilemaps) — official Phaser repo (40k★) | Written by the engine authors, targets **Phaser 4** | game-setup-and-config, scenes, tilemaps, sprites-and-images, animations, tweens, cameras, input-keyboard-mouse-touch, text-and-bitmaptext, loading-assets, physics-arcade, scale-and-responsive, v4-new-features, audio-and-sound, particles |
| [gamedev-skills/awesome-gamedev-agent-skills](https://skills.sh/gamedev-skills/awesome-gamedev-agent-skills/rpg) (1.5k★, actively maintained, ~4k installs) | Engine-neutral craft knowledge, good pitfalls sections | game-feel, dialogue-systems, level-design, rpg, game-ui-ux, save-systems, audio-design, prototype-fast |

Already paid off: the Phaser 4 skills flagged that `setTintFill()` is gone in v4, and that `createLayer` can return a GPU layer.

Considered, not installed: `jeffallan/claude-skills@game-developer` (generic), `omer-metin/...@pixel-art-sprites` (low-star repo), Godot/Unity/three.js skill packs (wrong engine), `gamedev-skills@create-game-assets` (runs Python pipelines; not needed while art is hand-authored).
Worth adding later: `gamedev-skills` → `itch-publish` (sharing), `visual-novel` (bench talks), `game-ai` (if teachers start chasing you), `phaserjs/phaser@filters-and-postfx` (lighting).

## Asset options
- **LimeZu Modern Interiors** — https://limezu.itch.io/moderninteriors — pay-what-you-want, full pack from $1.50: 16/32/48px, classroom + library designs, Character Generator 2.0 (needs full version). License: use/edit in commercial or non-commercial projects, **must credit LimeZu**, no reselling/redistributing the assets. Best upgrade path for v0.2+.
- CC0 school tilesets are scarce; OpenGameArt has generic CC0 top-down packs ([Tiny Top Down Pack](https://opengameart.org/content/tiny-top-down-pack)); school-specific itch packs ([Japanese School 8x8](https://dillond967.itch.io/japanese-school-tileset), [School Daze 16x](https://goblinwire.itch.io/school-daze/purchase), [Modern Study Time 32x](https://kauzz.itch.io/modern-study-time-32x32)) need license checks.
- Current approach: our own pixel art baked by `tools/bake-art.mjs` — fully owned, no licensing, and tuned to look like an *Egyptian* school (oil-paint wall band, terrazzo, interlock pavers, bench-desks, taboor flagpole), which no asset pack has.

## Design references
- Undertale's comedy works because the jokes are *sincere* and the mechanics support the theme (sparing instead of killing) — [Kill Screen: Behind the humor of Toby Fox's Undertale](https://killscreen.com/behind-humor-toby-foxs-undertale), Toby Fox on EarthBound being "funny and strange, but also sincere and emotional" ([Inverse](https://www.inverse.com/gaming/undertale-playstation-plus)). → Our teachers are won over, never defeated; the ending of every encounter should land a sincere beat ("you were my favourite disaster").
- Counterpoint: jokes alone don't carry a game, and pure references fall flat — [Giant Bomb review](https://giantbomb.com/reviews/undertale-review). → Every chapter needs a *new mechanic*, not just new lines (see roadmap in design.md).
- From the installed skills: layer 5–8 tiny feedbacks per impact and scale juice to importance (game-feel); alternate tension/rest and teach-then-test (level-design); dialogue as data with flags, avoid inventing a scripting language (dialogue-systems); version your save format from day one (save-systems — done).

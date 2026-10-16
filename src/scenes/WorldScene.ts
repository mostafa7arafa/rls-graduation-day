import * as Phaser from 'phaser';
import { MAP, LEGEND, SOLID } from '../data/map';
import { TILE_NAMES } from '../data/tiles.gen';
import { NPCS, SPOTS, intro, ending, objective } from '../data/story';
import type { Ctx, Npc } from '../data/story';
import { PARTY } from '../data/cast';
import { state, flag, setFlag, save } from '../systems/save';
import type { Who } from '../systems/save';
import { sfx } from '../systems/sfx';
import { music } from '../systems/music';
import { CAST } from '../data/cast';
import { TILE, WALK, RUN, FONT } from '../config';
import type { UIScene } from './UIScene';

type Dir = 'down' | 'up' | 'side';
type Actor = Phaser.Physics.Arcade.Sprite;
type Sprite = Phaser.GameObjects.Sprite;

const FEET = 8;            // sprite centre -> feet offset (24px tall frames)
const TRAIL_STEP = 2;      // px between recorded leader positions
const GAP = 7;             // trail entries between party members (~14px)

export class WorldScene extends Phaser.Scene {
  private layer!: Phaser.Tilemaps.TilemapLayer;
  private party: Record<Who, Actor> = {} as Record<Who, Actor>;
  private order: Who[] = [...PARTY];
  private npcs = new Map<string, { sprite: Sprite; def: Npc }>();
  private bob = { v: 0 };
  private trail: { x: number; y: number }[] = [];
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private prompt!: Phaser.GameObjects.Text;
  private ui!: UIScene;
  private cutscene = false;
  private ending = false;

  constructor() { super('world'); }

  private get leader(): Actor { return this.party[this.order[0]]; }

  create() {
    this.ui = this.scene.get('ui') as UIScene;
    this.npcs.clear(); this.trail = []; this.cutscene = false; this.ending = false;

    // ── tilemap from the ASCII map
    const idx = (name: string) => (TILE_NAMES as readonly string[]).indexOf(name);
    const data = MAP.map(row => [...row].map(ch => idx(LEGEND[ch] ?? 'void')));
    const map = this.make.tilemap({ data, tileWidth: TILE, tileHeight: TILE });
    const ts = map.addTilesetImage('tiles', 'tiles', TILE, TILE, 0, 0)!;
    this.layer = (map.createLayer(0, ts, 0, 0) as Phaser.Tilemaps.TilemapLayer).setDepth(0);
    this.layer.setCollision([...SOLID].map(ch => idx(LEGEND[ch])).filter(i => i >= 0));
    if (flag('gate_open')) this.openGate(true);
    const mw = map.widthInPixels, mh = map.heightInPixels;
    this.physics.world.setBounds(0, 0, mw, mh);
    this.cameras.main.setBounds(0, 0, mw, mh).setRoundPixels(true);

    // ── props (y-sorted). blockers = invisible static zones at their footprint
    const blockers = this.physics.add.staticGroup();
    const block = (x: number, y: number, w: number, h: number) => {
      const z = this.add.zone(x + w / 2, y + h / 2, w, h); blockers.add(z); return z;
    };
    const prop = (key: string, x: number, y: number, flat = false) => {
      const img = this.add.image(x, y, key).setOrigin(0);
      img.setDepth(flat ? 1 : y + img.height);
      return img;
    };
    prop('court', 16 * TILE, 18 * TILE, true);
    prop('goalL', 16 * TILE - 6, 18 * TILE + 92); prop('goalR', 40 * TILE - 14, 18 * TILE + 92);
    for (const [x, y, k] of [[2, 17, 'tree1'], [8, 22, 'tree2'], [3, 40, 'tree2'], [10, 41, 'tree1'], [50, 41, 'tree1'], [52, 24, 'tree2']] as const) {
      prop(k, x * TILE, y * TILE); block(x * TILE + 13, y * TILE + 38, 10, 8);
    }
    prop('swings', 4 * TILE, 32 * TILE); block(4 * TILE + 2, 32 * TILE + 30, 4, 8); block(4 * TILE + 51, 32 * TILE + 30, 4, 8);
    prop('car', 44 * TILE, 36 * TILE); block(44 * TILE + 2, 36 * TILE + 14, 60, 20);
    prop('flag', 47 * TILE, 24 * TILE); block(47 * TILE, 24 * TILE + 56, 7, 7);

    // ── party
    for (const who of PARTY) {
      const s = this.physics.add.sprite(state.x, state.y - FEET, who, 0);
      s.setSize(10, 6).setOffset(3, 17).setCollideWorldBounds(true);
      s.setData('dir', 'up');
      this.party[who] = s;
    }
    this.order = [state.leader, ...PARTY.filter(p => p !== state.leader)];
    // pre-seed the trail so followers start lined up behind (south of) the leader
    for (let i = 0; i < 30; i++) this.trail.push({ x: state.x, y: state.y - FEET + (29 - i) * TRAIL_STEP });
    this.applyLeader();

    // ── NPCs
    for (const def of NPCS) {
      const s = this.add.sprite(def.x * TILE + 8, def.y * TILE + 16 - FEET, def.id, def.dir === 'up' ? 3 : def.dir === 'side' ? 6 : 0);
      s.setFlipX(!!def.flip).setData('dir', def.dir);
      this.npcs.set(def.id, { sprite: s, def });
      blockers.add(this.add.zone(s.x, s.y + FEET, 12, 8));
    }
    // ambient life: Mr Hassan's oud cloud, Habeba's legendary sparkle
    const hz = this.npcs.get('hassan')!.sprite;
    this.add.particles(hz.x, hz.y - 4, 'cloud', { speedY: { min: -10, max: -4 }, speedX: { min: -6, max: 6 }, scale: { start: 0.25, end: 0.6 }, alpha: { start: 0.35, end: 0 }, lifespan: 2200, frequency: 260 }).setDepth(hz.y + 20);
    const hb = this.npcs.get('habeba')!.sprite;
    this.add.particles(hb.x, hb.y, 'sparkle', { x: { min: -10, max: 10 }, y: { min: -14, max: 6 }, scale: { start: 1, end: 0 }, lifespan: 900, frequency: 350 }).setDepth(hb.y + 20);

    // every member gets colliders; followers simply have their bodies disabled
    for (const p of PARTY) { this.physics.add.collider(this.party[p], this.layer); this.physics.add.collider(this.party[p], blockers); }

    // ── interaction prompt
    this.prompt = this.add.text(0, 0, 'Z', { fontFamily: FONT, fontSize: '8px', color: '#1b1420', backgroundColor: '#f2c94c', padding: { x: 2, y: 1 } })
      .setOrigin(0.5).setDepth(10000).setVisible(false);
    this.bob.v = 0;
    this.tweens.add({ targets: this.bob, v: -2, yoyo: true, repeat: -1, duration: 350 });

    // ── input
    const kb = this.input.keyboard!;
    this.cursors = kb.createCursorKeys();
    this.keys = kb.addKeys('W,A,S,D,SHIFT,Z,SPACE,ENTER,TAB,M,ONE,TWO,THREE') as Record<string, Phaser.Input.Keyboard.Key>;
    kb.addCapture('TAB,SPACE,UP,DOWN,LEFT,RIGHT');
    kb.on('keydown-TAB', () => this.swapLeader());
    kb.on('keydown-ONE', () => this.swapLeader('mostafa'));
    kb.on('keydown-TWO', () => this.swapLeader('hussein'));
    kb.on('keydown-THREE', () => this.swapLeader('hefny'));
    kb.on('keydown-M', () => this.ui.toast(sfx.toggleMute() ? 'Sound OFF' : 'Sound ON'));
    const interact = () => this.tryInteract();
    kb.on('keydown-Z', interact); kb.on('keydown-SPACE', interact); kb.on('keydown-ENTER', interact);

    this.time.addEvent({ delay: 4000, loop: true, callback: () => this.persist() });
    this.ui.setObjective(objective());
    this.cameras.main.fadeIn(600, 27, 20, 32);

    // the music kicks in once the last bell has rung
    if (!flag('intro_done')) this.run(async (c) => { music.stop(); await intro(c); setFlag('intro_done'); music.play('school'); });
    else music.play('school');
  }

  // ───────────────────────────────────────── party
  private applyLeader() {
    PARTY.forEach(p => { (this.party[p].body as Phaser.Physics.Arcade.Body).enable = p === this.order[0]; });
    this.cameras.main.startFollow(this.leader, true, 0.15, 0.15);
    state.leader = this.order[0];
    this.ui.setLeader(this.order[0]);
  }

  private swapLeader(to?: Who) {
    if (this.cutscene) return;
    const cur = this.order[0];
    const next = to ?? this.order[1];
    if (next === cur) return;
    const old = this.leader;
    const nl = this.party[next];
    nl.setPosition(old.x, old.y).setData('dir', old.getData('dir'));
    // TAB rotates (A,B,C -> B,C,A) so all three get a turn; 1/2/3 jump straight to someone
    this.order = to ? [next, ...this.order.filter(p => p !== next)] : [...this.order.slice(1), cur];
    old.setVelocity(0, 0);
    this.applyLeader();
    this.tweens.add({ targets: nl, scaleX: { from: 1.4, to: 1 }, scaleY: { from: 0.7, to: 1 }, duration: 220, ease: 'Back.out' });
    sfx.select();
  }

  // ───────────────────────────────────────── loop
  update() {
    const L = this.leader;
    let vx = 0, vy = 0;
    if (!this.cutscene && !this.ui.busy) {
      const k = this.keys, c = this.cursors;
      if (c.left.isDown || k.A.isDown) vx -= 1;
      if (c.right.isDown || k.D.isDown) vx += 1;
      if (c.up.isDown || k.W.isDown) vy -= 1;
      if (c.down.isDown || k.S.isDown) vy += 1;
    }
    const speed = this.keys.SHIFT.isDown ? RUN : WALK;
    const len = Math.hypot(vx, vy) || 1;
    L.setVelocity((vx / len) * speed, (vy / len) * speed);
    if (vx || vy) {
      const dir: Dir = Math.abs(vx) > Math.abs(vy) ? 'side' : vy < 0 ? 'up' : 'down';
      L.setData('dir', dir);
      if (dir === 'side') L.setFlipX(vx > 0);
      L.anims.play(`${this.order[0]}-walk-${dir}`, true);
      L.anims.timeScale = speed === RUN ? 1.6 : 1;
    } else {
      L.anims.play(`${this.order[0]}-idle-${L.getData('dir')}`, true);
    }

    // breadcrumb trail -> followers
    const last = this.trail[this.trail.length - 1];
    if (Math.hypot(L.x - last.x, L.y - last.y) >= TRAIL_STEP) {
      this.trail.push({ x: L.x, y: L.y });
      if (this.trail.length > 200) this.trail.shift();
    }
    this.order.slice(1).forEach((who, i) => {
      const s = this.party[who];
      const t = this.trail[Math.max(0, this.trail.length - 1 - (i + 1) * GAP)];
      const dx = t.x - s.x, dy = t.y - s.y;
      if (Math.abs(dx) + Math.abs(dy) > 0.3) {
        const dir: Dir = Math.abs(dx) > Math.abs(dy) ? 'side' : dy < 0 ? 'up' : 'down';
        s.setData('dir', dir); if (dir === 'side') s.setFlipX(dx > 0);
        s.anims.play(`${who}-walk-${dir}`, true);
      } else s.anims.play(`${who}-idle-${s.getData('dir')}`, true);
      s.setPosition(t.x, t.y);
    });

    // y-sort everyone who walks
    for (const p of PARTY) this.party[p].setDepth(this.party[p].y + 12);
    this.npcs.forEach(({ sprite }) => sprite.setDepth(sprite.y + 12));

    // interaction prompt
    const target = this.cutscene || this.ui.busy ? null : this.probe();
    this.prompt.setVisible(!!target);
    if (target) this.prompt.setPosition(L.x, L.y - 22 + this.bob.v);

    // walking out of the open gate ends the chapter
    if (flag('gate_open') && !this.ending && L.y + FEET > 46 * TILE + 4) {
      this.ending = true;
      this.run(ending);
    }
  }

  // ───────────────────────────────────────── interaction
  private probe(): { npc?: string; spot?: number } | null {
    const L = this.leader, dir = L.getData('dir') as Dir;
    const fx = L.x + (dir === 'side' ? (L.flipX ? 12 : -12) : 0);
    const fy = L.y + FEET + (dir === 'down' ? 12 : dir === 'up' ? -12 : 0);
    // NPCs can be reached across one tile of furniture (counters, teacher desks)
    const far = { x: L.x + (fx - L.x) * 2.4, y: L.y + FEET + (fy - L.y - FEET) * 2.4 };
    for (const [id, { sprite }] of this.npcs) {
      const nx = sprite.x, ny = sprite.y + FEET;
      if (Math.hypot(nx - fx, ny - fy) < 14 || Math.hypot(nx - far.x, ny - far.y) < 11) return { npc: id };
    }
    const tx = Math.floor(fx / TILE), ty = Math.floor(fy / TILE);
    const i = SPOTS.findIndex(s => tx >= s.x && tx < s.x + (s.w ?? 1) && ty >= s.y && ty < s.y + (s.h ?? 1));
    return i >= 0 ? { spot: i } : null;
  }

  private tryInteract() {
    if (this.cutscene || this.ui.busy) return;
    const hit = this.probe(); if (!hit) return;
    if (hit.npc) {
      const { sprite, def } = this.npcs.get(hit.npc)!;
      this.faceTowards(sprite, this.leader);
      this.run(def.script).then(() => {
        sprite.setFrame(def.dir === 'up' ? 3 : def.dir === 'side' ? 6 : 0).setFlipX(!!def.flip);
      });
    } else if (hit.spot !== undefined) this.run(SPOTS[hit.spot].script);
  }

  private faceTowards(s: Sprite, t: Sprite) {
    const dx = t.x - s.x, dy = t.y - s.y;
    if (Math.abs(dx) > Math.abs(dy)) { s.setFrame(6).setFlipX(dx > 0); } else s.setFrame(dy < 0 ? 3 : 0);
  }

  private actor(who: string): Sprite | undefined {
    return (this.party as Record<string, Sprite>)[who] ?? this.npcs.get(who)?.sprite;
  }

  private async run(script: (c: Ctx) => Promise<void>) {
    this.cutscene = true;
    this.leader.setVelocity(0, 0);
    try { await script(this.ctx()); }
    finally {
      this.ui.close();
      this.cutscene = false;
      this.ui.setObjective(objective());
      this.persist();
    }
  }

  private persist() {
    if (this.ending) return;
    state.x = this.leader.x; state.y = this.leader.y + FEET;
    save();
  }

  openGate(silent = false) {
    for (let x = 26; x <= 29; x++) this.layer.putTileAt((TILE_NAMES as readonly string[]).indexOf('pavers'), x, 45);
    if (!silent) { sfx.door(); setFlag('gate_open'); }
  }

  private ctx(): Ctx {
    return {
      leader: this.order[0],
      say: (who, text) => this.ui.say(who, text),
      choose: (opts, who, prompt) => this.ui.choose(opts, who, prompt),
      wait: (ms) => new Promise(r => this.time.delayedCall(ms, r)),
      shake: (i = 0.004, ms = 250) => this.cameras.main.shake(ms, i),
      emote: (who, mark) => {
        const a = this.actor(who); if (!a) return;
        const t = this.add.text(a.x, a.y - 16, mark === '<3' ? '♥' : mark, { fontFamily: FONT, fontSize: '8px', color: mark === '<3' ? '#ff6b8a' : mark === '#' ? '#ff4040' : '#f4f0e8', backgroundColor: '#1b1420', padding: { x: 2, y: 2 } })
          .setOrigin(0.5, 1).setDepth(10001);
        this.tweens.chain({ targets: t, tweens: [{ y: a.y - 22, duration: 200, ease: 'Back.out' }, { alpha: 0, delay: 1100, duration: 300, onComplete: () => t.destroy() }] });
        sfx.react(CAST[who]?.voice ?? 300, mark);
      },
      react: (who, kind) => sfx.react(CAST[who]?.voice ?? 300, kind),
      tint: (who, color, ms) => {
        const a = this.actor(who); if (!a) return;
        a.setTint(color);
        this.time.delayedCall(ms, () => a.clearTint());
      },
      battle: (id) => new Promise<boolean>(resolve => {
        this.ui.close();
        this.scene.pause();
        this.scene.launch('battle', { enemy: id, onEnd: (won: boolean) => { this.scene.resume(); this.cameras.main.fadeIn(300); music.play('school'); resolve(won); } });
      }),
      toast: (t) => { sfx.item(); this.ui.toast(t); },
      bell: () => sfx.bell(),
      openGate: () => this.openGate(),
      sting: () => { music.stop(0.1); sfx.sting(); },
      finish: () => new Promise<void>(r => {
        this.cameras.main.fadeOut(1200, 27, 20, 32);
        this.cameras.main.once('camerafadeoutcomplete', () => {
          setFlag('chapter1_done'); save();
          this.scene.stop('ui'); this.scene.start('title', { credits: true }); r();
        });
      }),
    };
  }
}

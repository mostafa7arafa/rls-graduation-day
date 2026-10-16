import * as Phaser from 'phaser';
import { MAPS, LEGEND, SOLID } from '../data/map';
import type { MapDef, PropDef } from '../data/map';
import { TILE_NAMES } from '../data/tiles.gen';
import { NPCS, SPOTS, intro, objective, exitScript, enterScript, signed } from '../data/story';
import type { Ctx, Npc, Face, EncounterId, Script } from '../data/story';
import { PARTY, CAST } from '../data/cast';
import { state, flag, setFlag, save, hasItem } from '../systems/save';
import type { Who } from '../systems/save';
import { sfx } from '../systems/sfx';
import { music } from '../systems/music';
import { TILE, WALK, RUN, FONT } from '../config';
import type { UIScene } from './UIScene';

type Dir = 'down' | 'up' | 'side';
type Actor = Phaser.Physics.Arcade.Sprite;
type Sprite = Phaser.GameObjects.Sprite;
type Zone = Phaser.GameObjects.Zone;

const FEET = 8;            // sprite centre -> feet offset (24px tall frames)
const TRAIL_STEP = 2;      // px between recorded leader positions
const GAP = 7;             // trail entries between party members (~14px)

/** encounter id -> the scene that plays it */
const ENCOUNTER_SCENE: Record<EncounterId, string> = {
  hassan: 'battle', nasser: 'quiz', yasser: 'spelling', lab: 'lab', abdelkareem: 'haggle', amr: 'rhythm', karim: 'penalty',
};
/** map `when` strings: 'flag' or '!flag' */
const cond = (when?: string) => !when || (when.startsWith('!') ? !flag(when.slice(1)) : flag(when));

export class WorldScene extends Phaser.Scene {
  private mapId = 'ground';
  private def!: MapDef;
  private layer!: Phaser.Tilemaps.TilemapLayer;
  private blockers!: Phaser.Physics.Arcade.StaticGroup;
  private party: Record<Who, Actor> = {} as Record<Who, Actor>;
  private order: Who[] = [...PARTY];
  private npcs = new Map<string, { sprite: Sprite; def: Npc; zone?: Zone; fx?: Phaser.GameObjects.Particles.ParticleEmitter }>();
  private props = new Map<PropDef, { img: Phaser.GameObjects.Image; zones: Zone[] }>();
  private scripted = new Set<Sprite>();     // actors a script is currently walking
  private bob = { v: 0 };
  private trail: { x: number; y: number }[] = [];
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private prompt!: Phaser.GameObjects.Text;
  private ui!: UIScene;
  private cutscene = false;
  private ending = false;
  // survive scene.restart() (same instance): a script that teleports keeps running in the new map
  private resumeTeleport: (() => void) | null = null;
  private musicHeld = false;

  constructor() { super('world'); }

  private get leader(): Actor { return this.party[this.order[0]]; }

  create() {
    this.ui = this.scene.get('ui') as UIScene;
    this.npcs.clear(); this.props.clear(); this.scripted.clear(); this.trail = [];
    this.cutscene = !!this.resumeTeleport; this.ending = false;
    this.mapId = MAPS[state.map] ? state.map : 'ground';
    this.def = MAPS[this.mapId];

    // ── tilemap from the ASCII map
    const idx = (name: string) => (TILE_NAMES as readonly string[]).indexOf(name);
    const data = this.def.rows.map(row => [...row].map(ch => idx(LEGEND[ch] ?? 'void')));
    const map = this.make.tilemap({ data, tileWidth: TILE, tileHeight: TILE });
    const ts = map.addTilesetImage('tiles', 'tiles', TILE, TILE, 0, 0)!;
    this.layer = (map.createLayer(0, ts, 0, 0) as Phaser.Tilemaps.TilemapLayer).setDepth(0);
    this.layer.setCollision([...SOLID].map(ch => idx(LEGEND[ch])).filter(i => i >= 0));
    if (flag('gate_open') && this.mapId === 'ground') this.openGate(true);
    const mw = map.widthInPixels, mh = map.heightInPixels;
    this.physics.world.setBounds(0, 0, mw, mh);
    this.cameras.main.setBounds(0, 0, mw, mh).setRoundPixels(true);
    this.blockers = this.physics.add.staticGroup();

    // ── party
    const face = state.dir ?? 'up';
    const dir: Dir = face === 'left' || face === 'right' ? 'side' : face;
    for (const who of PARTY) {
      const s = this.physics.add.sprite(state.x, state.y - FEET, who, 0);
      s.setSize(10, 6).setOffset(3, 17).setCollideWorldBounds(true);
      s.setData('dir', dir).setFlipX(face === 'right');
      this.party[who] = s;
    }
    this.order = [state.leader, ...PARTY.filter(p => p !== state.leader)];
    // pre-seed the trail so followers start lined up behind the leader
    const back = { up: [0, 1], down: [0, -1], left: [1, 0], right: [-1, 0] }[face];
    for (let i = 0; i < 30; i++) this.trail.push({ x: state.x + back[0] * (29 - i) * TRAIL_STEP, y: state.y - FEET + back[1] * (29 - i) * TRAIL_STEP });
    this.applySolo();

    this.sync();
    for (const p of PARTY) { this.physics.add.collider(this.party[p], this.layer); this.physics.add.collider(this.party[p], this.blockers); }

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
    this.refreshHud();
    this.cameras.main.fadeIn(400, 27, 20, 32);

    if (this.resumeTeleport) {
      const resume = this.resumeTeleport; this.resumeTeleport = null;
      if (!this.musicHeld) music.play(this.def.music);
      resume();
    } else if (!flag('intro_done')) {
      // the music kicks in once the last bell has rung
      this.run(async (c) => { music.stop(); await intro(c); setFlag('intro_done'); music.play(this.def.music); });
    } else music.play(this.def.music);
  }

  // ───────────────────────────────────────── NPCs & props that come and go with the story
  sync() {
    for (const p of this.def.props) {
      const want = cond(p.when), have = this.props.get(p);
      if (want && !have) {
        const img = this.add.image(p.x, p.y, p.key).setOrigin(0);
        img.setDepth(p.flat ? 1 : p.y + img.height);
        this.props.set(p, { img, zones: (p.block ?? []).map(([dx, dy, w, h]) => this.block(p.x + dx + w / 2, p.y + dy + h / 2, w, h)) });
      } else if (!want && have) {
        have.img.destroy(); have.zones.forEach(z => z.destroy()); this.props.delete(p);
      }
    }
    for (const def of NPCS) {
      if ((def.map ?? 'ground') !== this.mapId) continue;
      const want = !def.when || def.when(), have = this.npcs.get(def.id);
      if (want && !have) this.addNpc(def);
      else if (!want && have) { have.sprite.destroy(); have.zone?.destroy(); have.fx?.destroy(); this.npcs.delete(def.id); }
    }
  }

  private block(cx: number, cy: number, w: number, h: number): Zone {
    const z = this.add.zone(cx, cy, w, h); this.blockers.add(z); return z;
  }

  private addNpc(def: Npc) {
    const key = def.sprite ?? def.id;
    const s = this.add.sprite(def.x * TILE + 8, def.y * TILE + 16 - FEET, key, def.dir === 'up' ? 3 : def.dir === 'side' ? 6 : 0);
    s.setFlipX(!!def.flip).setData('dir', def.dir);
    const entry: { sprite: Sprite; def: Npc; zone?: Zone; fx?: Phaser.GameObjects.Particles.ParticleEmitter } = { sprite: s, def, zone: this.block(s.x, s.y + FEET, 12, 8) };
    // ambient life: Mr Hassan's oud cloud, Habeba's legendary sparkle
    if (key === 'hassan') entry.fx = this.add.particles(s.x, s.y - 4, 'cloud', { speedY: { min: -10, max: -4 }, speedX: { min: -6, max: 6 }, scale: { start: 0.25, end: 0.6 }, alpha: { start: 0.35, end: 0 }, lifespan: 2200, frequency: 260 }).setDepth(s.y + 20);
    if (key === 'habeba') entry.fx = this.add.particles(s.x, s.y, 'sparkle', { x: { min: -10, max: 10 }, y: { min: -14, max: 6 }, scale: { start: 1, end: 0 }, lifespan: 900, frequency: 350 }).setDepth(s.y + 20);
    this.npcs.set(def.id, entry);
  }

  private refreshHud() {
    this.ui.setObjective(objective());
    this.ui.setForm(hasItem('form') ? signed() : -1);
  }

  // ───────────────────────────────────────── party
  /** solo mode (e.g. Hefny alone in the lab): only one member exists in the world */
  private applySolo() {
    const solo = state.flags.solo as Who | undefined;
    if (solo) this.order = [solo];
    else if (this.order.length < PARTY.length) this.order = [this.order[0], ...PARTY.filter(p => p !== this.order[0])];
    for (const p of PARTY) {
      const on = this.order.includes(p);
      this.party[p].setVisible(on);
      if (on && p !== this.order[0]) this.party[p].setPosition(this.leader.x, this.leader.y);
    }
    this.applyLeader();
  }

  private applyLeader() {
    PARTY.forEach(p => { (this.party[p].body as Phaser.Physics.Arcade.Body).enable = p === this.order[0]; });
    this.cameras.main.startFollow(this.leader, true, 0.15, 0.15);
    state.leader = this.order[0];
    this.ui.setLeader(this.order[0]);
  }

  private swapLeader(to?: Who) {
    if (this.cutscene || this.order.length < 2) return;
    const cur = this.order[0];
    const next = to ?? this.order[1];
    if (next === cur || !this.order.includes(next)) return;
    const old = this.leader;
    const nl = this.party[next];
    nl.setPosition(old.x, old.y).setData('dir', old.getData('dir')).setFlipX(old.flipX);
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
    if (!this.scripted.has(L)) {
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
    }

    // breadcrumb trail -> followers
    const last = this.trail[this.trail.length - 1];
    if (Math.hypot(L.x - last.x, L.y - last.y) >= TRAIL_STEP) {
      this.trail.push({ x: L.x, y: L.y });
      if (this.trail.length > 200) this.trail.shift();
    }
    this.order.slice(1).forEach((who, i) => {
      const s = this.party[who];
      if (this.scripted.has(s)) return;
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

    if (this.cutscene || this.ui.busy) return;
    // stairs & doors to other maps
    const fx = L.x, fy = L.y + FEET;
    for (const w of this.def.warps) {
      if (cond(w.when) && fx >= w.x * TILE && fx < (w.x + w.w) * TILE && fy >= w.y * TILE && fy < (w.y + w.h) * TILE) {
        sfx.door();
        this.run(async (c) => { await c.teleport(w.to, w.tx, w.ty, w.dir); const enter = enterScript(w.to); if (enter) await enter(c); });
        return;
      }
    }
    // walking out of the open main gate
    if (this.mapId === 'ground' && !this.ending && fy > 46 * TILE + 4) {
      const exit = exitScript();
      if (exit) { this.ending = true; this.run(exit); }
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
      if (!sprite.visible) continue;
      const nx = sprite.x, ny = sprite.y + FEET;
      if (Math.hypot(nx - fx, ny - fy) < 14 || Math.hypot(nx - far.x, ny - far.y) < 11) return { npc: id };
    }
    const tx = Math.floor(fx / TILE), ty = Math.floor(fy / TILE);
    const i = SPOTS.findIndex(s => (s.map ?? 'ground') === this.mapId && (!s.when || s.when())
      && tx >= s.x && tx < s.x + (s.w ?? 1) && ty >= s.y && ty < s.y + (s.h ?? 1));
    return i >= 0 ? { spot: i } : null;
  }

  private tryInteract() {
    if (this.cutscene || this.ui.busy) return;
    const hit = this.probe(); if (!hit) return;
    if (hit.npc) {
      const { sprite, def } = this.npcs.get(hit.npc)!;
      this.faceTowards(sprite, this.leader);
      this.run(def.script).then(() => {
        if (sprite.active) sprite.setFrame(def.dir === 'up' ? 3 : def.dir === 'side' ? 6 : 0).setFlipX(!!def.flip);
      });
    } else if (hit.spot !== undefined) this.run(SPOTS[hit.spot].script);
  }

  private faceTowards(s: Sprite, t: Sprite) {
    const dx = t.x - s.x, dy = t.y - s.y;
    if (Math.abs(dx) > Math.abs(dy)) { s.setFrame(6).setFlipX(dx > 0); } else s.setFrame(dy < 0 ? 3 : 0);
  }

  /** a party member, or an NPC by id, or the first NPC wearing that sprite */
  private actor(who: string): Sprite | undefined {
    if ((PARTY as readonly string[]).includes(who)) return this.party[who as Who];
    const byId = this.npcs.get(who)?.sprite;
    if (byId) return byId;
    for (const { sprite, def } of this.npcs.values()) if ((def.sprite ?? def.id) === who) return sprite;
    return undefined;
  }
  private npcEntry(s: Sprite) { for (const e of this.npcs.values()) if (e.sprite === s) return e; return undefined; }

  private async run(script: Script) {
    this.cutscene = true;
    this.leader.setVelocity(0, 0);
    try { await script(this.ctx()); }
    finally {
      this.ui.close(); this.ui.setBoxTop(false);
      this.cutscene = false;
      this.sync();
      this.refreshHud();
      if (this.musicHeld) { this.musicHeld = false; music.play(this.def.music); }
      this.persist();
    }
  }

  private persist() {
    if (this.ending) return;
    const L = this.leader, d = L.getData('dir') as Dir;
    state.map = this.mapId;
    state.x = L.x; state.y = L.y + FEET;
    state.dir = d === 'side' ? (L.flipX ? 'right' : 'left') : d;
    save();
  }

  openGate(silent = false) {
    for (let x = 26; x <= 29; x++) this.layer.putTileAt((TILE_NAMES as readonly string[]).indexOf('pavers'), x, 45);
    if (!silent) { sfx.door(); setFlag('gate_open'); }
  }

  private tween(cfg: Phaser.Types.Tweens.TweenBuilderConfig) {
    return new Promise<void>(r => this.tweens.add({ ...cfg, onComplete: () => r() }));
  }

  private ctx(): Ctx {
    return {
      leader: this.order[0],
      say: (who, text) => this.ui.say(who, text),
      choose: (opts, who, prompt) => this.ui.choose(opts, who, prompt),
      wait: (ms) => new Promise(r => this.time.delayedCall(ms, r)),
      shake: (i = 0.004, ms = 250) => this.cameras.main.shake(ms, i),
      emote: (who, mark) => {
        const a = this.actor(who); if (!a || !a.visible) return;
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
        this.scene.launch(ENCOUNTER_SCENE[id], { enemy: id, onEnd: (won: boolean) => {
          this.scene.resume(); this.cameras.main.fadeIn(300);
          music.play(this.def.music); resolve(won);
        } });
      }),
      toast: (t) => { sfx.item(); this.ui.toast(t); },
      bell: () => sfx.bell(),
      openGate: () => this.openGate(),
      sting: () => { music.stop(0.1); sfx.sting(); },
      music: (track) => { this.musicHeld = true; if (track) music.play(track); else music.stop(); },
      chapter: async (n, title, during) => {
        await this.ui.chapterCard(n, title);
        if (during) await during();
        await this.ui.chapterCardHide();
      },
      teleport: (mapId, x, y, dir = 'up') => new Promise<void>(resolve => {
        this.persist();
        Object.assign(state, { map: mapId, x: x * TILE, y: y * TILE, dir });
        save();
        this.resumeTeleport = resolve;
        this.cameras.main.fadeOut(200, 27, 20, 32);
        this.cameras.main.once('camerafadeoutcomplete', () => this.scene.restart());
      }),
      walk: async (who, steps, speed = WALK) => {
        const a = this.actor(who); if (!a) return;
        const npc = this.npcEntry(a);
        npc?.zone?.destroy(); if (npc) npc.zone = undefined;
        this.scripted.add(a);
        const key = a.texture.key;
        for (const [dx, dy] of steps) {
          const dir: Dir = Math.abs(dx) > Math.abs(dy) ? 'side' : dy < 0 ? 'up' : 'down';
          if (dir === 'side') a.setFlipX(dx > 0);
          a.setData('dir', dir);
          a.anims.play(`${key}-walk-${dir}`, true);
          await this.tween({ targets: a, x: a.x + dx * TILE, y: a.y + dy * TILE, duration: (Math.hypot(dx, dy) * TILE / speed) * 1000 });
        }
        a.anims.play(`${key}-idle-${a.getData('dir')}`, true);
        this.scripted.delete(a);
        if (npc) npc.zone = this.block(a.x, a.y + FEET, 12, 8);
      },
      face: (who, f) => {
        const a = this.actor(who); if (!a) return;
        const dir: Dir = f === 'left' || f === 'right' ? 'side' : f;
        a.setData('dir', dir); if (dir === 'side') a.setFlipX(f === 'right');
        a.anims.play(`${a.texture.key}-idle-${dir}`, true);
      },
      show: (who, v) => { this.actor(who)?.setVisible(v); },
      solo: (who) => { setFlag('solo', who ?? 0); if (!who) delete state.flags.solo; this.applySolo(); },
      moveProp: async (id, dx, dy, ms) => {
        for (const [p, e] of this.props) if (p.id === id) {
          e.zones.forEach(z => z.destroy()); e.zones = [];
          if (p.key.startsWith('tractor') && dx) e.img.setFlipX(dx > 0); // tractor art faces left
          await this.tween({ targets: e.img, x: e.img.x + dx, y: e.img.y + dy, duration: ms, onUpdate: () => e.img.setDepth(e.img.y + e.img.height) });
        }
      },
      swapProp: (id, texture) => { for (const [p, e] of this.props) if (p.id === id) e.img.setTexture(texture); },
      sound: (name) => sfx[name](),
      sync: () => this.sync(),
      boxTop: (on) => this.ui.setBoxTop(on),
      credits: () => new Promise<void>(r => {
        this.cameras.main.fadeOut(1500, 27, 20, 32);
        this.cameras.main.once('camerafadeoutcomplete', () => {
          setFlag('game_done'); save();
          this.scene.stop('ui'); this.scene.start('credits'); r();
        });
      }),
    };
  }
}

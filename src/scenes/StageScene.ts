import * as Phaser from 'phaser';
import { W, H, TILE, WALK } from '../config';
import { sfx } from '../systems/sfx';
import { music } from '../systems/music';
import { tr, txt, isAr } from '../systems/i18n';
import { CAST } from '../data/cast';
import { MAPS, LEGEND } from '../data/map';
import { TILE_NAMES } from '../data/tiles.gen';
import { drawCourt } from './match/courtArt';
import { specialCutin } from './match/cutin';
import type { Step } from '../match/cup';
import type { Reaction } from '../systems/sfx';

// The team talks between cup matches, staged with the characters instead of a text box over a board:
// a real place (the Season 1 classroom, or the football court with its red playground), people walk
// in, talk (portrait + typewriter), react, and the big rivalries get an anime duel cut-in.
// Launched on top of CupScene; emits 'done' when the script ends (or ESC / Start skips it).
// Scripts are data: `Step` in src/match/cup.ts.

type Dir = 'down' | 'up' | 'side';
const SPRITE: Record<string, string> = { ziad: 'twin', zeyad: 'twin' };   // actor id -> sprite, when they differ
const COLORS: Record<string, number> = { saif: 0x7fd0f0, abdallah: 0x3a7bd5, nasser: 0xf4f0e8, amrk: 0xf4f0e8, ibrahim: 0xf4f0e8, rezk: 0xf4f0e8 };

export class StageScene extends Phaser.Scene {
  private actors = new Map<string, Phaser.GameObjects.Sprite>();
  private world: Phaser.GameObjects.GameObject[] = [];
  private box!: Phaser.GameObjects.Container;
  private face!: Phaser.GameObjects.Image;
  private frame!: Phaser.GameObjects.Rectangle;
  private name!: Phaser.GameObjects.Text;
  private text!: Phaser.GameObjects.Text;
  private more!: Phaser.GameObjects.Text;
  private advance: (() => void) | null = null;
  private typing: Phaser.Time.TimerEvent | null = null;
  private full = '';
  private skipped = false;
  private kit = false;                       // on the court, our players wear the red kit

  constructor() { super('stage'); }

  create(data: { script: Step[] }) {
    this.actors.clear(); this.world = []; this.skipped = false; this.advance = null;
    this.cameras.main.setBackgroundColor('#120d14').fadeIn(250);
    this.buildBox();
    this.add.text(W - 6, 6, tr('ESC: skip'), txt(8, { color: '#6d5b64' })).setOrigin(1, 0).setScrollFactor(0).setDepth(6000);
    this.input.keyboard!.on('keydown', (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k === 'escape') return this.finish();
      if (k === 'z' || k === 'enter' || k === ' ' || k === 'x') this.press();
    });
    this.input.on('pointerdown', () => this.press());
    void this.run(data.script);
  }

  private buildBox() {
    const bw = W - 24, bh = 62, y = H - bh / 2 - 8;
    const bg = this.add.rectangle(W / 2, y, bw, bh, 0x1b1420, 0.95).setStrokeStyle(2, 0xc23b3b);
    const ar = isAr();
    this.face = this.add.image(ar ? W - 44 : 44, y, 'mostafa_face').setScale(2.6);
    const fr = this.frame = this.add.rectangle(ar ? W - 44 : 44, y, 46, 46).setStrokeStyle(2, 0x6d5b64);
    this.name = this.add.text(ar ? W - 76 : 76, y - 22, '', txt(8, { color: '#f2c94c' })).setOrigin(ar ? 1 : 0, 0.5);
    this.text = this.add.text(ar ? W - 76 : 76, y - 12, '', txt(8, { color: '#f4f0e8', wordWrap: { width: bw - 80 }, lineSpacing: ar ? -2 : 5 })).setOrigin(ar ? 1 : 0, 0);
    this.more = this.add.text(ar ? 22 : W - 22, y + 22, '▼', txt(8, { color: '#f2c94c', rtl: false })).setOrigin(0.5);
    this.tweens.add({ targets: this.more, y: y + 19, yoyo: true, repeat: -1, duration: 300 });
    this.box = this.add.container(0, 0, [bg, this.face, fr, this.name, this.text, this.more]).setScrollFactor(0).setDepth(5000).setVisible(false);
  }

  private press() {
    if (this.typing) { this.typing.remove(); this.typing = null; this.text.setText(this.full); this.more.setVisible(true); return; }
    const f = this.advance; this.advance = null; f?.();
  }
  private finish() {
    if (this.skipped) return;
    this.skipped = true;
    this.cameras.main.fadeOut(200);
    this.cameras.main.once('camerafadeoutcomplete', () => this.events.emit('done'));
  }
  private wait(ms: number) { return new Promise<void>(r => this.time.delayedCall(ms, () => r())); }

  private async run(script: Step[]) {
    for (const st of script) {
      if (this.skipped) return;
      await this.step(st);
    }
    this.finish();
  }

  // ───────────────────────── places
  private place(where: string) {
    this.world.forEach(o => o.destroy()); this.world = [];
    this.actors.forEach(a => a.destroy()); this.actors.clear();
    const cam = this.cameras.main;
    this.kit = where === 'court';
    if (where === 'court') {
      const before = this.children.list.length;
      drawCourt(this);
      this.world = this.children.list.slice(before);
      cam.setScroll(0, 89);
      music.play('stadium');
    } else {
      // the Season 1 ground floor; the classroom is its top-left room
      const idx = (n: string) => (TILE_NAMES as readonly string[]).indexOf(n);
      const data = MAPS.ground.rows.map(row => [...row].map(ch => idx(LEGEND[ch] ?? 'void')));
      const map = this.make.tilemap({ data, tileWidth: TILE, tileHeight: TILE });
      const ts = map.addTilesetImage('tiles', 'tiles', TILE, TILE, 0, 0)!;
      this.world.push((map.createLayer(0, ts, 0, 0) as Phaser.Tilemaps.TilemapLayer).setDepth(0));
      cam.setScroll(136 - W / 2, 96 - H / 2 + 20);
      music.play('school');
    }
  }

  // ───────────────────────── one step
  private async step(st: Step) {
    switch (st[0]) {
      case 'at': this.box.setVisible(false); this.place(st[1]); return this.wait(250);
      case 'cam': return new Promise<void>(r => this.tweens.add({ targets: this.cameras.main, scrollX: st[1] - W / 2, scrollY: st[2] - H / 2 + 30, duration: 700, ease: 'Sine.inOut', onComplete: () => r() }));
      case 'on': {
        const [, id, x, y, dir] = st;
        const spr = this.add.sprite(x, y, this.spriteOf(id), 0).setOrigin(0.5, 1).setDepth(y);
        this.actors.set(id, spr); this.face_(spr, dir ?? 'down', false);
        return;
      }
      case 'off': this.actors.get(st[1])?.destroy(); this.actors.delete(st[1]); return;
      case 'walk': {
        const [, id, x, y] = st, a = this.actors.get(id); if (!a) return;
        const dx = x - a.x, dy = y - a.y, d = Math.hypot(dx, dy);
        const dir: Dir = Math.abs(dy) > Math.abs(dx) ? (dy < 0 ? 'up' : 'down') : 'side';
        a.setFlipX(dir === 'side' && dx > 0).play(`${a.texture.key}-walk-${dir}`);
        await new Promise<void>(r => this.tweens.add({ targets: a, x, y, duration: d / WALK * 1000, onUpdate: () => a.setDepth(a.y), onComplete: () => r() }));
        a.play(`${a.texture.key}-idle-${dir}`);
        return;
      }
      case 'face': { const a = this.actors.get(st[1]); if (a) this.face_(a, st[2], st[2] === 'side' && st[3] === 'right'); return; }
      case 'say': return this.say(st[1], st[2]);
      case 'emote': return this.emote(st[1], st[2] as Reaction);
      case 'jump': {
        const ids = st.slice(1) as string[];
        ids.forEach((id, i) => { const a = this.actors.get(id); if (a) this.tweens.add({ targets: a, y: a.y - 8, yoyo: true, repeat: 2, duration: 130, delay: i * 60 }); });
        sfx.cheer();
        return this.wait(800);
      }
      case 'thud': this.cameras.main.shake(180, 0.008); sfx.hit(); return this.wait(300);
      case 'wait': return this.wait(st[1]);
      case 'cut': {
        const [, id, move, line] = st;
        this.box.setVisible(false);
        return new Promise<void>(r => specialCutin(this, { hero: this.actor(id), move, line }, r));
      }
      case 'duel': {
        const [, a, b, move, line] = st;
        this.box.setVisible(false);
        return new Promise<void>(r => specialCutin(this, { hero: this.actor(b), foe: this.actor(a), move, line }, r));
      }
    }
  }
  private spriteOf(id: string) { return this.kit && this.textures.exists(`fb_${id}`) ? `fb_${id}` : SPRITE[id] ?? id; }
  private actor(id: string) { return { sprite: this.spriteOf(id), color: COLORS[id] ?? 0xc23b3b, name: CAST[id]?.name ?? id }; }
  private face_(a: Phaser.GameObjects.Sprite, dir: Dir, right: boolean) {
    a.play(`${a.texture.key}-idle-${dir}`).setFlipX(right);
  }

  private say(who: string, line: string) {
    const sp = CAST[who], a = this.actors.get(who);
    this.box.setVisible(true);
    const narr = who === 'narrator';
    this.face.setVisible(!narr); this.frame.setVisible(!narr);
    if (!narr) this.face.setTexture(this.textures.exists(`${SPRITE[who] ?? who}_face`) ? `${SPRITE[who] ?? who}_face` : sp?.face ?? 'mostafa_face');
    this.name.setText(narr ? '' : tr(sp?.name ?? who)).setColor(sp?.color ?? '#f2c94c');
    const ar = isAr();
    this.text.setX(narr ? (ar ? W - 26 : 26) : (ar ? W - 76 : 76)).setWordWrapWidth(narr ? W - 56 : W - 104);
    this.full = tr(line); this.text.setText(''); this.more.setVisible(false);
    // the speaker bobs while talking
    if (a) this.tweens.add({ targets: a, y: a.y - 2, yoyo: true, repeat: 1, duration: 90 });
    let i = 0;
    this.typing = this.time.addEvent({ delay: 22, loop: true, callback: () => {
      i++; this.text.setText(this.full.slice(0, i));
      if (i % 2 === 0 && this.full[i] !== ' ') sfx.blip(sp?.voice ?? 300);
      if (i >= this.full.length) { this.typing?.remove(); this.typing = null; this.more.setVisible(true); }
    } });
    return new Promise<void>(r => { this.advance = r; });
  }
  private emote(who: string, mark: Reaction) {
    const a = this.actors.get(who); if (!a) return;
    const t = this.add.text(a.x, a.y - 26, mark === '<3' ? '♥' : mark, txt(8, { color: mark === '#' ? '#ff6060' : '#f2c94c', rtl: false }))
      .setOrigin(0.5, 1).setDepth(4000).setStroke('#1b1420', 3);
    this.tweens.add({ targets: t, y: t.y - 6, duration: 160, yoyo: true });
    this.time.delayedCall(900, () => t.destroy());
    sfx.react(CAST[who]?.voice ?? 300, mark);
    return this.wait(500);
  }
}

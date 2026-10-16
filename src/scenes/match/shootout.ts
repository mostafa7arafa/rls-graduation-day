import * as Phaser from 'phaser';
import { W, H } from '../../config';
import { sfx, tone, sample } from '../../systems/sfx';
import { crowd as voices } from '../../systems/crowd';
import { tr, txt, fmt, num, isAr } from '../../systems/i18n';
import { CAST } from '../../data/cast';
import type { SlotInput, Side } from '../../match/sim';
import type { TeamDef, PlayerDef } from '../../match/teams';

// The penalty shootout, on its own front-view screen (like the graduation shootout in chapter 7):
//   SHOOTING: move the target anywhere on the goal with the stick (it sways a little under pressure),
//             press shoot to lock it, then press again to stop the power bar. Green = clean strike;
//             red = it rises (over the bar if you aimed high); too soft = an easy save.
//   IN GOAL:  watch the kicker. Just before the run-up he gives away a side (a flash by his head;
//             good kickers sometimes lie). Hold a direction and press ✕ to dive. Dive too early and
//             a cool kicker just rolls it the other way.
// Five each, then sudden death. The result goes back to the match with Match.finishPens().

const G = { x: 150, y: 40, w: 180, h: 84 };       // the goal mouth on screen
const SPOT = { x: W / 2, y: 228 };
const D = 2600;
type Kick = { team: Side; scored: boolean };
export interface ShootoutSetup {
  teams: [TeamDef, TeamDef];
  shooterSlot: (team: Side) => number;               // which human takes this team's kicks (-1 = AI)
  keeperSlot: (team: Side) => number;                // which human keeps goal for this team (-1 = AI)
  read: () => Map<number, SlotInput>;
}
const LINES_US = ['Twelve years. One kick.', 'Do not look at the keeper. Look at the net.', 'Hefny is screaming. Good. Louder.', 'Breathe. Then hit it.'];
const LINES_THEM = ['They are only 2nd Secondary.', 'Left or right? I know. He does not.', 'The whole school is watching. Fine.'];

export class Shootout {
  private c: Phaser.GameObjects.Container;
  private keeper!: Phaser.GameObjects.Sprite;
  private kicker!: Phaser.GameObjects.Sprite;
  private ball!: Phaser.GameObjects.Image;
  private shadow!: Phaser.GameObjects.Ellipse;
  private reticle!: Phaser.GameObjects.Graphics;
  private barBg!: Phaser.GameObjects.Rectangle;
  private bar!: Phaser.GameObjects.Rectangle;
  private timer!: Phaser.GameObjects.Rectangle;
  private dots!: Phaser.GameObjects.Graphics;
  private dotX: [number, number] = [0, 0];
  private big!: Phaser.GameObjects.Text;
  private small!: Phaser.GameObjects.Text;
  private hint!: Phaser.GameObjects.Text;
  private tell!: Phaser.GameObjects.Image;
  private kicks: Kick[] = [];
  private prev = new Map<number, SlotInput>();
  private inputs = new Map<number, SlotInput>();
  private pressed = new Map<number, boolean>();
  private alive = true;
  /** what the human is doing right now (for the HUD and the playtest bot) */
  phase: 'idle' | 'aim' | 'power' | 'keep' = 'idle';

  constructor(private s: Phaser.Scene, private o: ShootoutSetup, private done: (kicks: Kick[]) => void) {
    this.c = s.add.container(0, 0).setScrollFactor(0).setDepth(D);
    this.build();
    void this.run();
  }

  /** called every frame by MatchScene: input edges for "pressed this frame" */
  update() {
    this.inputs = this.o.read();
    for (const [slot, i] of this.inputs) {
      const p = this.prev.get(slot);
      const now = i.shoot || i.pass, before = !!p && (p.shoot || p.pass);
      if (now && !before) this.pressed.set(slot, true);
      this.prev.set(slot, { ...i });
    }
  }
  private take(slot: number) { const v = this.pressed.get(slot); this.pressed.set(slot, false); return !!v; }
  private stick(slot: number) { return this.inputs.get(slot) ?? { mx: 0, my: 0 } as SlotInput; }

  private build() {
    const s = this.s, c = this.c;
    const g = s.add.graphics();
    // the school building behind the goal, then the stone court
    g.fillStyle(0xd9c9a3).fillRect(0, 0, W, 132);
    for (let x = 14; x < W; x += 52) { g.fillStyle(0x6fa8c8).fillRect(x, 8, 24, 20); g.fillStyle(0x4a7a96).fillRect(x, 26, 24, 2); }
    g.fillStyle(0xc9b994).fillRect(0, 124, W, 8);
    g.fillStyle(0x8f8a85).fillRect(0, 132, W, H - 132);
    g.fillStyle(0x86817c);
    for (let y = 132; y < H; y += 12) for (let x = ((y - 132) / 12) % 2 ? 0 : 12; x < W; x += 24) g.fillRect(x, y, 12, 6);
    g.lineStyle(2, 0xeef2e6, 0.9).lineBetween(0, 132, W, 132);
    g.beginPath(); g.arc(W / 2, 132, 120, 0.15, Math.PI - 0.15); g.strokePath();
    g.fillStyle(0xeef2e6).fillEllipse(SPOT.x, SPOT.y, 10, 4);
    // the goal: net, then the frame
    g.fillStyle(0xdfe4ea, 0.18).fillRect(G.x, G.y, G.w, G.h);
    g.lineStyle(1, 0xd8dde3, 0.45);
    for (let x = G.x; x <= G.x + G.w; x += 9) g.lineBetween(x, G.y, x, G.y + G.h);
    for (let y = G.y; y <= G.y + G.h; y += 9) g.lineBetween(G.x, y, G.x + G.w, y);
    g.fillStyle(0xf4f0e8).fillRect(G.x - 4, G.y - 4, G.w + 8, 4).fillRect(G.x - 4, G.y - 4, 4, G.h + 4).fillRect(G.x + G.w, G.y - 4, 4, G.h + 4);
    c.add(g);
    // the rest of both teams, watching from the halfway line (backs to us), crowd along the sides
    const watchers = [...this.o.teams[0].field, ...this.o.teams[1].field];
    watchers.forEach((p, i) => c.add(s.add.sprite(70 + i * 22 + (i >= 3 ? 210 : 0), H - 4, p.sprite, 3).setOrigin(0.5, 1).setScale(1.5).setAlpha(0.9)));
    this.keeper = s.add.sprite(W / 2, G.y + G.h + 2, 'hussein', 0).setOrigin(0.5, 1).setScale(3);
    this.shadow = s.add.ellipse(SPOT.x, SPOT.y + 2, 14, 5, 0x000000, 0.35);
    this.ball = s.add.image(SPOT.x, SPOT.y - 4, 'ball').setScale(1.6);
    this.kicker = s.add.sprite(W / 2, H - 6, 'karim', 3).setOrigin(0.5, 1).setScale(3.4);
    this.reticle = s.add.graphics().setVisible(false);
    this.barBg = s.add.rectangle(W / 2 + 70, 250, 10, 70, 0x1b1420).setOrigin(0.5, 1).setStrokeStyle(1, 0xf4f0e8).setVisible(false);
    this.bar = s.add.rectangle(W / 2 + 70, 249, 8, 68, 0xf2c94c).setOrigin(0.5, 1).setVisible(false);
    this.timer = s.add.rectangle(G.x, G.y - 10, G.w, 3, 0xf2c94c).setOrigin(0, 0.5).setVisible(false);
    this.tell = s.add.image(0, 0, 'sparkle').setScale(3).setVisible(false);
    c.add([this.keeper, this.shadow, this.ball, this.kicker, this.reticle, this.barBg, this.bar, this.timer, this.tell]);
    // the board: five dots each
    c.add(s.add.rectangle(W / 2, 12, 300, 20, 0x1b1420, 0.85));
    const nameStyle = txt(8, { color: '#f4f0e8', rtl: false });
    const left = isAr() ? 1 : 0;   // Arabic: home on the right, like the match board
    const tA = s.add.text(W / 2 + (left ? 76 : -76), 12, tr(this.o.teams[0].short), nameStyle).setOrigin(left ? 0 : 1, 0.5);
    const tB = s.add.text(W / 2 + (left ? -76 : 76), 12, tr(this.o.teams[1].short), nameStyle).setOrigin(left ? 1 : 0, 0.5);
    this.dotX = [W / 2 + (left ? 40 : -40), W / 2 + (left ? -40 : 40)];
    this.dots = s.add.graphics();
    c.add([tA, tB, this.dots]);
    this.big = s.add.text(W / 2, 150, '', txt(16, { color: '#f2c94c', align: 'center' })).setOrigin(0.5).setStroke('#1b1420', 6);
    this.small = s.add.text(W / 2, 176, '', txt(8, { color: '#ffffff', align: 'center' })).setOrigin(0.5).setStroke('#1b1420', 4);
    c.add(s.add.rectangle(W / 2, H - 8, W, 16, 0x1b1420, 0.7));
    this.hint = s.add.text(W / 2, H - 8, '', txt(8, { color: '#cfc6b8' })).setOrigin(0.5);
    c.add([this.big, this.small, this.hint]);
    c.setAlpha(0);
    s.tweens.add({ targets: c, alpha: 1, duration: 300 });
    this.refresh();
  }

  private refresh() {
    // five dots a side: green = scored, red = missed, hollow = still to come (sudden death keeps the last five)
    const g = this.dots.clear();
    for (const t of [0, 1] as Side[]) {
      const mine = this.kicks.filter(k => k.team === t), from = Math.max(0, mine.length - 5);
      for (let i = 0; i < 5; i++) {
        const k = mine[from + i], x = this.dotX[t] + (isAr() ? 2 - i : i - 2) * 9;   // Arabic reads right to left
        if (!k) g.lineStyle(1, 0xcfc6b8).strokeCircle(x, 12, 3);
        else g.fillStyle(k.scored ? 0x7fe07a : 0xff5050).fillCircle(x, 12, 3.5);
      }
    }
  }
  private say(big: string, small = '', ms = 1200) {
    this.big.setText(big).setAlpha(1).setScale(big ? 1.5 : 1); this.small.setText(small).setAlpha(1);
    if (big) this.s.tweens.add({ targets: this.big, scale: 1, duration: 200, ease: 'Back.out' });
    this.s.tweens.killTweensOf([this.small]);
    this.s.tweens.add({ targets: [this.big, this.small], alpha: 0, delay: ms, duration: 300 });
  }
  private wait(ms: number) { return new Promise<void>(r => this.s.time.delayedCall(ms, () => r())); }
  private score(): [number, number] { return [0, 1].map(t => this.kicks.filter(k => k.team === t && k.scored).length) as [number, number]; }
  private decided() {
    const [a, b] = this.score(), na = this.kicks.filter(k => k.team === 0).length, nb = this.kicks.filter(k => k.team === 1).length;
    if (na <= 5 && nb <= 5) return a + (5 - na) < b || b + (5 - nb) < a || (na === 5 && nb === 5 && a !== b);
    return na === nb && a !== b;
  }
  /** would this kick decide it? (scoring wins, or missing loses) */
  private decisive(team: Side) {
    const save = this.kicks;
    const tryIt = (scored: boolean) => { this.kicks = [...save, { team, scored }]; const d = this.decided(); this.kicks = save; return d; };
    return tryIt(true) || tryIt(false);
  }

  private takers(team: Side): PlayerDef[] {
    const t = this.o.teams[team];
    // the striker first, the keeper last (Hussein would take one; that's the story)
    const f = [t.field[2], t.field[1], t.field[0], ...(t.sub ? [t.sub] : []), t.gk];
    return f;
  }

  private async run() {
    await this.wait(500);
    this.say(tr('PENALTIES!'), tr('Five each. Then sudden death.'), 1600);
    voices.excite(1);
    await this.wait(2000);
    for (let n = 0; this.alive; n++) {
      const team = (n % 2) as Side, round = Math.floor(n / 2);
      if (round === 5 && team === 0) { this.say(tr('SUDDEN DEATH'), tr('One miss and it is over.'), 1600); await this.wait(1900); }
      const def = this.takers(team)[round % this.takers(team).length];
      const scored = await this.kick(team, def, round);
      this.kicks.push({ team, scored });
      this.refresh();
      await this.wait(1300);
      if (this.decided()) break;
    }
    if (!this.alive) return;
    const [a, b] = this.score();
    this.say(a > b ? tr('WE WIN!') : fmt('{team} win.', { team: tr(this.o.teams[1].name) }), `${tr('PENS')} ${num(a)} - ${num(b)}`, 2000);
    if (a > b) { voices.roar(); sfx.win(); } else voices.applause();
    await this.wait(2600);
    this.s.tweens.add({ targets: this.c, alpha: 0, duration: 300, onComplete: () => { this.destroy(); this.done(this.kicks); } });
  }
  destroy() { this.alive = false; this.c.destroy(); }

  // ───────────────────────── one kick
  private async kick(team: Side, def: PlayerDef, round: number): Promise<boolean> {
    const other = (1 - team) as Side, kd = this.o.teams[other].gk;
    this.keeper.setTexture(kd.sprite, 0).setPosition(W / 2, G.y + G.h + 2).setAngle(0).setFlipX(false);
    this.kicker.setTexture(def.sprite, 3).setPosition(W / 2, H - 6).setAngle(0);
    this.ball.setPosition(SPOT.x, SPOT.y - 4).setScale(1.6).setVisible(true); this.shadow.setPosition(SPOT.x, SPOT.y + 2).setVisible(true);
    const decisive = this.decisive(team);
    const name = tr(CAST[def.id]?.name ?? def.id);
    // the kicker's moment: his eyes, his thought
    const pool = team === 0 ? LINES_US : LINES_THEM;
    await this.eyes(def, this.o.teams[team].color, decisive ? 'Everything. On this one.' : pool[(round + team) % pool.length]);
    if (decisive) { this.say(tr('THIS KICK DECIDES IT'), name, 1400); this.heartbeat(6); await this.wait(1500); }
    else { this.say('', name, 900); }
    const shooter = this.o.shooterSlot(team), keeper = this.o.keeperSlot(other);
    let target: { x: number; y: number; power: number };
    let dive: { x: number; high: boolean; at: number } | null = null;
    const skill = kd.keeper ?? 0.5;
    if (shooter >= 0) {
      this.hint.setText(tr('Stick: aim · □/X: lock it · again: power'));
      target = await this.humanAim(shooter, def, decisive);
      // the AI keeper guesses; good keepers read the run-up a little
      const zones = [G.x + 30, W / 2, G.x + G.w - 30];
      const read = Math.random() < 0.12 + skill * 0.15;
      const guess = read ? zones.reduce((a, z) => Math.abs(z - target.x) < Math.abs(a - target.x) ? z : a) : zones[Math.floor(Math.random() * 3)];
      dive = { x: guess, high: target.y < G.y + 34 && read, at: 0 };
      await this.runUp();
    } else {
      this.hint.setText(keeper >= 0 ? tr('Watch for the flash · direction + ✕/Z: dive') : '');
      const res = await this.aiShot(def, keeper, decisive);
      target = res.target; dive = res.dive;
      if (keeper < 0) {
        const zones = [G.x + 30, W / 2, G.x + G.w - 30];
        const read = Math.random() < 0.12 + skill * 0.15;
        const guess = read ? zones.reduce((a, z) => Math.abs(z - target.x) < Math.abs(a - target.x) ? z : a) : zones[Math.floor(Math.random() * 3)];
        dive = { x: guess, high: target.y < G.y + 34 && read, at: 0 };
      }
    }
    this.hint.setText('');
    // the strike
    if (!sample('shot', 0.7)) sfx.kick();
    if (dive) this.diveTo(dive.x, dive.high);
    const slow = decisive ? 2 : 1;
    const out = target.x < G.x - 2 || target.x > G.x + G.w + 2 || target.y < G.y - 2;
    const post = !out ? false : (Math.abs(target.x - G.x) < 7 || Math.abs(target.x - (G.x + G.w)) < 7) && target.y > G.y - 6 || (Math.abs(target.y - G.y) < 6 && target.x > G.x - 4 && target.x < G.x + G.w + 4);
    await new Promise<void>(r => this.s.tweens.add({ targets: this.ball, x: target.x, y: target.y, scale: 0.9, duration: (300 + (100 - target.power) * 3) * slow, ease: 'Quad.out', onComplete: () => r() }));
    this.s.tweens.add({ targets: this.shadow, x: target.x, y: G.y + G.h + 4, duration: 200 });
    // saved?
    let saved = false;
    if (!out && dive) {
      const reach = 16 + skill * 10 + (target.power < 30 ? 30 : 0) - (target.power > 70 ? (target.power - 70) * 0.25 : 0) - (target.y < G.y + 20 ? 6 : 0);
      saved = Math.abs(target.x - dive.x) < reach && (dive.high || target.y > G.y + 22 || Math.abs(target.x - dive.x) < 14);
    }
    if (out) {
      if (post) { if (!sample('post', 0.8)) sfx.bump(); this.s.tweens.add({ targets: this.ball, y: target.y + 60, x: target.x + (target.x < W / 2 ? -40 : 40), duration: 400 }); }
      else this.s.tweens.add({ targets: this.ball, y: target.y - 40, alpha: 0, duration: 400, onComplete: () => this.ball.setAlpha(1) });
      this.say(post ? tr('THE POST!') : target.y < G.y ? tr('OVER THE BAR!') : tr('WIDE!'), name);
      voices.ooh();
      return false;
    }
    if (saved) {
      if (!sample('impact', 0.6)) sfx.hit();
      this.s.tweens.add({ targets: this.ball, x: target.x + (target.x < W / 2 ? -70 : 70), y: 150, duration: 350 });
      const keeperName = tr(CAST[kd.id]?.name ?? kd.id);
      this.say(tr('SAVED!'), keeperName);
      this.s.cameras.main.shake(150, 0.006);
      if (kd.id === 'hussein') { voices.hussein(); voices.applause(); } else voices.ooh();
      return false;
    }
    this.s.tweens.add({ targets: this.ball, y: target.y - 4, duration: 120, yoyo: true });   // the net bulges
    this.say(tr('GOAL!'), name);
    this.s.cameras.main.flash(120, 255, 255, 255);
    if (team === 0) voices.roar(); else voices.applause();
    return true;
  }

  private async eyes(def: PlayerDef, color: number, line: string) {
    const s = this.s, c = this.c;
    const strip = s.add.rectangle(0, 92, W, 54, color).setOrigin(0, 0.5);
    const shade = s.add.rectangle(0, 92, W, 54, 0x000000, 0.45).setOrigin(0, 0.5);
    const key = s.textures.exists(`${def.sprite}_face`) ? `${def.sprite}_face` : `${def.id}_face`;
    const eyes = s.add.image(W / 2, 92, key).setScale(13).setOrigin(0.5, 7 / 16).setCrop(0, 5, 16, 4);
    const mono = s.add.text(W / 2, 128, `"${tr(line)}"`, txt(8, { color: '#ffffff' })).setOrigin(0.5).setStroke('#000000', 4);
    c.add([strip, shade, eyes, mono]);
    strip.scaleY = 0; shade.scaleY = 0;
    if (!sample('whoosh', 0.4)) tone(180, 0.3, 'sawtooth', 0.04, 1200);
    s.tweens.add({ targets: [strip, shade], scaleY: 1, duration: 120 });
    s.tweens.add({ targets: eyes, x: { from: W / 2 + 24, to: W / 2 }, duration: 240 });
    await this.wait(1150);
    s.tweens.add({ targets: [strip, shade, eyes, mono], alpha: 0, duration: 160, onComplete: () => [strip, shade, eyes, mono].forEach(o => o.destroy()) });
    await this.wait(170);
  }
  private heartbeat(n: number) { for (let i = 0; i < n; i++) { tone(60, 0.12, 'sine', 0.25, 40, i * 0.55); tone(55, 0.1, 'sine', 0.18, 38, i * 0.55 + 0.16); } }

  private async runUp() {
    this.s.tweens.add({ targets: this.kicker, y: H - 26, duration: 260 });
    await this.wait(280);
  }

  /** the human aims: free target on the goal (with a little sway), lock, then the power bar */
  private async humanAim(slot: number, def: PlayerDef, decisive: boolean) {
    let x = W / 2, y = G.y + G.h / 2, t = 0;
    const sway = 2 + (decisive ? 5 : 2) * (1.15 - def.shot);
    this.reticle.setVisible(true); this.timer.setVisible(true).setSize(G.w, 3); this.phase = 'aim';
    this.take(slot);
    const LIMIT = 6000;
    const aim = await new Promise<{ x: number; y: number }>(res => {
      const ev = this.s.time.addEvent({ delay: 16, loop: true, callback: () => {
        t += 16;
        const i = this.stick(slot);
        x = Phaser.Math.Clamp(x + i.mx * 2.3, G.x - 26, G.x + G.w + 26);
        y = Phaser.Math.Clamp(y + i.my * 2.3, G.y - 26, G.y + G.h - 4);
        const sx = x + Math.sin(t * 0.004) * sway, sy = y + Math.cos(t * 0.0057) * sway * 0.7;
        this.drawReticle(sx, sy, 0xf2c94c);
        this.timer.setSize(G.w * (1 - t / LIMIT), 3);
        if (this.take(slot) || t > LIMIT) { ev.remove(); sfx.select(); res({ x: sx, y: sy }); }
      } });
    });
    this.timer.setVisible(false);
    // power: the bar pumps up and down; stop it in the green
    this.barBg.setVisible(true); this.bar.setVisible(true); this.phase = 'power';
    let p = 0; t = 0;
    const power = await new Promise<number>(res => {
      const ev = this.s.time.addEvent({ delay: 16, loop: true, callback: () => {
        t += 16;
        p = Math.abs(Math.sin(t * 0.0022)) * 100;
        this.bar.setSize(8, 68 * p / 100).setFillStyle(p > 85 ? 0xff4040 : p >= 45 ? 0x7fe07a : 0xf2c94c);
        if (this.take(slot) || t > 5000) { ev.remove(); sfx.select(); res(p); }
      } });
    });
    this.reticle.setVisible(false); this.barBg.setVisible(false); this.bar.setVisible(false); this.phase = 'idle';
    // red = it rises; a little error for everyone, more when you hammer it
    const err = (1 - def.shot) * 5 * (power > 85 ? 2.2 : 1);
    return { x: aim.x + (Math.random() - 0.5) * 2 * err, y: aim.y - (power > 85 ? (power - 85) * 2.4 : 0) + (Math.random() - 0.5) * err, power };
  }
  private drawReticle(x: number, y: number, color: number) {
    const g = this.reticle.clear();
    g.lineStyle(2, 0x1b1420).strokeCircle(x, y, 7);
    g.lineStyle(1, color).strokeCircle(x, y, 6).lineBetween(x - 10, y, x - 3, y).lineBetween(x + 3, y, x + 10, y).lineBetween(x, y - 10, x, y - 3).lineBetween(x, y + 3, x, y + 10);
  }

  /** an AI kicker: a tell (sometimes a lie), the run-up, and the human keeper's dive */
  private async aiShot(def: PlayerDef, keeper: number, decisive: boolean) {
    const zone = Math.floor(Math.random() * 3);   // 0 left, 1 middle, 2 right (as we look at it)
    const high = Math.random() < 0.35;
    const liar = def.shot > 0.85 && Math.random() < 0.3;
    const shown = liar ? (zone === 1 ? (Math.random() < 0.5 ? 0 : 2) : 2 - zone) : zone;
    let dive: { x: number; high: boolean; at: number } | null = null;
    let finalZone = zone;
    const listen = keeper >= 0;
    if (listen) { this.take(keeper); this.phase = 'keep'; }
    const zoneX = (z: number) => [G.x + 30, W / 2, G.x + G.w - 30][z];
    const tick = () => {
      if (!listen || dive) return;
      if (this.take(keeper)) {
        const i = this.stick(keeper);
        const z = i.mx < -0.4 ? 0 : i.mx > 0.4 ? 2 : 1;
        dive = { x: zoneX(z), high: i.my < -0.4, at: this.s.time.now };
        this.diveTo(dive.x, dive.high);
        sfx.select();
      }
    };
    const ev = this.s.time.addEvent({ delay: 16, loop: true, callback: tick });
    await this.wait(400);
    // the tell: a flash by his head on the side he'll go (from our view)
    const tellMs = Math.max(260, 620 - def.shot * 300) * (decisive ? 0.8 : 1);
    this.tell.setPosition(W / 2 + (shown - 1) * 24, shown === 1 ? H - 96 : H - 74).setVisible(true).setScale(1);
    this.s.tweens.add({ targets: this.tell, scale: 3.5, duration: 120, yoyo: true, hold: 60 });
    tone(1400, 0.08, 'square', 0.04);
    await this.wait(tellMs);
    this.tell.setVisible(false);
    await this.wait(250);
    // a cool head punishes an early dive: he just puts it the other way
    if (dive && def.shot > 0.75 && Math.random() < 0.6) finalZone = Math.abs(zoneX(zone) - (dive as { x: number }).x) < 20 ? (zone === 1 ? 0 : 1) : zone;
    await this.runUp();
    // late dives still count, up to the moment of the kick
    tick(); ev.remove(); this.phase = 'idle';
    const miss = Math.random() < 0.05 + 0.12 * (1 - def.shot) + (decisive ? 0.05 : 0);
    let x = zoneX(finalZone) + (Math.random() - 0.5) * 30, y = high ? G.y + 14 + Math.random() * 10 : G.y + 50 + Math.random() * 26;
    if (miss) { if (Math.random() < 0.5) y = G.y - 14; else x = finalZone === 0 ? G.x - 12 : G.x + G.w + 12; }
    const power = 55 + Math.random() * 35;
    // a keeper who never moved: stands in the middle (saves anything near him)
    if (listen && !dive) dive = { x: W / 2, high: true, at: 0 };
    return { target: { x, y, power }, dive };
  }

  private diveTo(x: number, high: boolean) {
    const k = this.keeper, mid = Math.abs(x - W / 2) < 10;
    k.setFrame(mid ? 0 : 6).setFlipX(x > W / 2);
    this.s.tweens.add({ targets: k, x, y: mid ? (high ? G.y + G.h - 18 : G.y + G.h + 2) : high ? G.y + G.h - 30 : G.y + G.h, angle: mid ? 0 : x < W / 2 ? -70 : 70, duration: 230, ease: 'Quad.out' });
  }
}

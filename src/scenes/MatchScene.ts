import * as Phaser from 'phaser';
import { W, H, FONT } from '../config';
import { sfx, tone, sample, loadSamples } from '../systems/sfx';
import { music } from '../systems/music';
import { crowd as voices } from '../systems/crowd';
import { tr, txt, isAr, num, fmt } from '../systems/i18n';
import { bridgeOnly, padStyle, START } from '../systems/gamepad';
import { touchActive } from '../systems/touch';
import { startActions, readSlots, pads, clearTaps } from '../systems/actions';
import { CAST } from '../data/cast';
import { Match, DT, SPECIALS } from '../match/sim';
import type { Control, MatchEvent, Player } from '../match/sim';
import { TEAMS } from '../match/teams';
import { CW, CL } from '../match/court';
import { specialCutin, goalCutin, talkCutin, vsIntro } from './match/cutin';
import type { Actor } from './match/cutin';
import { Shootout } from './match/shootout';
import { drawCourt, drawCrowd, OX, OY, WORLD_H } from './match/courtArt';

// SEASON 2: one football match on the real RLS court (see src/match/court.ts).
// The match itself is src/match/sim.ts; this scene draws it, reads the controllers, and runs the
// menus around it, plus the drama: anime cut-ins (./match/cutin.ts), the front-view penalty shootout
// (./match/shootout.ts), Mr Amr refereeing, the coach's half-time talk, shouting players, Hussein's knee.
//
// Modes: 1 PLAYER (you control the outfield, AI Hussein in goal), CO-OP (player 2 IS Hussein),
// VERSUS (player 2 controls the teachers).

const HALF_SECONDS = 150;                   // real seconds per half; the clock SHOWS 5 minutes
type Mode = 'menu' | 'play' | 'pause' | 'end' | 'talk';
type Kind = 'solo' | 'coop' | 'versus';
interface Setup { home?: string; away?: string; kind?: Kind; knockout?: boolean; friendly?: boolean; cup?: boolean }

interface Body { spr: Phaser.GameObjects.Sprite; ring: Phaser.GameObjects.Ellipse; mark: Phaser.GameObjects.Text }

export class MatchScene extends Phaser.Scene {
  private m!: Match;
  private mode: Mode = 'menu';
  private kind: Kind = 'solo';
  private acc = 0;
  private bodies = new Map<Player, Body>();
  private ball!: Phaser.GameObjects.Image;
  private shadow!: Phaser.GameObjects.Ellipse;
  private power!: Phaser.GameObjects.Rectangle;
  private powerBg!: Phaser.GameObjects.Rectangle;
  private scoreText!: Phaser.GameObjects.Text;
  private homeText!: Phaser.GameObjects.Text;
  private awayText!: Phaser.GameObjects.Text;
  private clockText!: Phaser.GameObjects.Text;
  private banner!: Phaser.GameObjects.Text;
  private sub!: Phaser.GameObjects.Text;
  private hint!: Phaser.GameObjects.Text;
  private who!: Phaser.GameObjects.Text;
  private whoBg!: Phaser.GameObjects.Rectangle;
  private crowd: Phaser.GameObjects.Sprite[] = [];
  private hefny!: Phaser.GameObjects.Sprite;
  private coach!: Phaser.GameObjects.Sprite;
  private ballHist: { x: number; y: number }[] = [];
  private panel: Phaser.GameObjects.GameObject[] = [];
  private menuItems: string[] = [];
  private menuSel = 0;
  private menuTexts: Phaser.GameObjects.Text[] = [];
  private stopActions: (() => void) | null = null;
  private padCount = -1;
  private camY = 0;
  private needPrime = false;
  private lastShot = -1e9;
  private lastOoh = -1e9;
  private setup: Setup = {};
  private cutting = false;
  private shootout: Shootout | null = null;
  private slow = 0;                          // seconds of slow motion left (after a signature move)
  private trail: Phaser.GameObjects.Image[] = [];
  private ref!: Phaser.GameObjects.Sprite;
  private bubbles: Phaser.GameObjects.Container[] = [];
  private lastBubble = -1e9;
  private kneeDone = false;
  private lastMinute = false;
  private firstKick = true;
  private lastShooter: Player | null = null;
  private teachersWatching: Phaser.GameObjects.Sprite[] = [];

  constructor() { super('match'); }

  create(data: Setup = {}) {
    this.setup = data ?? {}; this.cutting = false; this.shootout = null; this.slow = 0; this.trail = []; this.bubbles = [];
    this.kneeDone = false; this.lastMinute = false; this.firstKick = true; this.lastShooter = null; this.teachersWatching = [];
    void loadSamples();
    this.mode = 'menu'; this.acc = 0; this.bodies.clear(); this.crowd = []; this.panel = []; this.padCount = -1;
    this.cameras.main.setBackgroundColor('#2a2f2a').fadeIn(300);
    this.cameras.main.setBounds(0, 0, W, WORLD_H);
    music.play('stadium');
    voices.start();
    this.drawCourt();
    this.m = new Match({ home: TEAMS[data?.home ?? 'rls'], away: TEAMS[data?.away ?? 'teachers'], controls: [], halfSeconds: HALF_SECONDS, seed: Date.now() & 0xffff, knockout: !!data?.knockout });
    for (const p of this.m.players) {
      const ring = this.add.ellipse(0, 0, 12, 5, this.m.teams[p.team].color, 0.55);
      const spr = this.add.sprite(0, 0, p.def.sprite, 0).setOrigin(0.5, 1);
      const mark = this.add.text(0, 0, '▼', { fontFamily: FONT, fontSize: '8px', color: '#f2c94c' }).setOrigin(0.5, 1).setVisible(false);
      this.bodies.set(p, { spr, ring, mark });
    }
    this.shadow = this.add.ellipse(0, 0, 6, 3, 0x000000, 0.35);
    this.ball = this.add.image(0, 0, 'ball').setScale(0.6);
    for (let i = 0; i < 5; i++) this.trail.push(this.add.image(0, 0, 'ball').setScale(0.6).setAlpha(0).setTint(0xfff0a0));
    // the referee: Mr Amr (gym), whistle in mouth, never far from the ball
    this.ref = this.add.sprite(OX + CW / 2 + 30, OY + CL / 2, 'amr', 0).setOrigin(0.5, 1);
    this.powerBg = this.add.rectangle(0, 0, 18, 4, 0x1b1420).setVisible(false).setDepth(900);
    this.power = this.add.rectangle(0, 0, 16, 2, 0xf2c94c).setOrigin(0, 0.5).setVisible(false).setDepth(901);
    this.hud();
    this.render();
    this.camY = this.cameras.main.scrollY = OY + CL / 2 - H / 2;

    this.stopActions = startActions();
    this.input.keyboard!.on('keydown', (e: KeyboardEvent) => this.onKey(e));
    this.events.once('shutdown', () => { this.stopActions?.(); bridgeOnly(null); voices.stop(); });
    if (this.setup.home) this.time.delayedCall(400, () => this.kickoff(this.setup.kind ?? 'solo'));   // from the cup: straight in
    else this.openMenu();
  }

  // ───────────────────────── the court (./match/courtArt.ts) and who's watching
  private drawCourt() {
    drawCourt(this);
    const fans = ['student1', 'student2', 'student5', 'shazly', 'student4', 'student6', 'amin', 'student7', 'basha', 'student8'];
    const away = this.setup.away ?? 'teachers';
    // the final: the women teachers came to watch (Mr Ibrahim has noticed)
    if (away === 'teachers') { fans[1] = 'doaa'; fans[3] = 'shimaa'; fans[5] = 'hager'; }
    const { crowd, hefny, mostafa } = drawCrowd(this, fans);
    this.crowd = crowd; this.hefny = hefny; this.coach = mostafa;
    if (away === 'teachers') this.teachersWatching = [crowd[1], crowd[3], crowd[5]];
  }

  private hud() {
    const fixed = <T extends Phaser.GameObjects.Components.ScrollFactor & Phaser.GameObjects.Components.Depth>(o: T) => o.setScrollFactor(0).setDepth(1000);
    fixed(this.add.rectangle(W / 2, 11, 230, 18, 0x1b1420, 0.85));
    // home | score | away as three texts, so right-to-left text can't reorder the score
    this.homeText = fixed(this.add.text(W / 2 - 30, 7, tr(this.m.teams[0].short), txt(8, { color: '#f4f0e8', rtl: false })).setOrigin(1, 0.5));
    this.awayText = fixed(this.add.text(W / 2 + 30, 7, tr(this.m.teams[1].short), txt(8, { color: '#f4f0e8', rtl: false })).setOrigin(0, 0.5));
    this.scoreText = fixed(this.add.text(W / 2, 7, '', txt(8, { color: '#f2c94c', rtl: false })).setOrigin(0.5));
    this.clockText = fixed(this.add.text(W / 2, 18, '', txt(8, { color: '#cfc6b8', rtl: false })).setOrigin(0.5));
    this.banner = fixed(this.add.text(W / 2, H / 2 - 20, '', txt(16, { color: '#f2c94c' })).setOrigin(0.5).setShadow(2, 2, '#c23b3b', 0, false, true));
    this.sub = fixed(this.add.text(W / 2, H / 2 + 4, '', txt(8, { color: '#f4f0e8' })).setOrigin(0.5));
    fixed(this.add.rectangle(W / 2, H - 7, W, 14, 0x1b1420, 0.7));
    this.hint = fixed(this.add.text(W / 2, H - 7, '', txt(8, { color: '#cfc6b8' })).setOrigin(0.5));
    this.whoBg = fixed(this.add.rectangle(isAr() ? W : 0, 31, 120, 14, 0x1b1420, 0.7).setOrigin(isAr() ? 1 : 0, 0.5));
    this.who = fixed(this.add.text(isAr() ? W - 6 : 6, 31, '', txt(8, { color: '#f2c94c' })).setOrigin(isAr() ? 1 : 0, 0.5));
  }

  // ───────────────────────── menus (event-driven)
  private openMenu() {
    this.mode = 'menu'; bridgeOnly(null);
    this.showPanel(tr('THE CUP · PROTOTYPE'), fmt('{a} vs {b}', { a: tr(this.m.teams[0].name), b: tr(this.m.teams[1].name) }),
      ['1 PLAYER', 'CO-OP: P2 IS HUSSEIN', 'VERSUS: P2 IS THE TEACHERS', 'BACK TO TITLE']);
  }
  private showPanel(title: string, line: string, items: string[]) {
    this.clearPanel();
    const h = 56 + items.length * 16;
    const fixed = <T extends Phaser.GameObjects.GameObject & Phaser.GameObjects.Components.ScrollFactor & Phaser.GameObjects.Components.Depth>(o: T) => { o.setScrollFactor(0).setDepth(2700); this.panel.push(o); return o; };
    fixed(this.add.rectangle(W / 2, H / 2, 300, h, 0x1b1420, 0.92).setStrokeStyle(2, 0xc23b3b));
    fixed(this.add.text(W / 2, H / 2 - h / 2 + 14, title, txt(8, { color: '#f2c94c' })).setOrigin(0.5));
    fixed(this.add.text(W / 2, H / 2 - h / 2 + 30, line, txt(8, { color: '#cfc6b8' })).setOrigin(0.5));
    this.menuItems = items; this.menuSel = 0;
    this.menuTexts = items.map((_, i) => fixed(this.add.text(W / 2, H / 2 - h / 2 + 50 + i * 16, '', txt(8, { color: '#f4f0e8' })).setOrigin(0.5)));
    this.renderMenu();
  }
  private clearPanel() { this.panel.forEach(o => o.destroy()); this.panel = []; this.menuTexts = []; this.menuItems = []; }
  private renderMenu() {
    this.menuTexts.forEach((t, i) => {
      const o = tr(this.menuItems[i]), on = i === this.menuSel;
      t.setText(on ? (isAr() ? `◀ ${o} ▶` : `▶ ${o} ◀`) : o).setColor(on ? '#f2c94c' : '#f4f0e8');
    });
  }
  private onKey(e: KeyboardEvent) {
    const k = e.key.toLowerCase();
    if (this.mode === 'play') { if (k === 'escape') this.pause(); if (k === 'm') sfx.toggleMute(); return; }
    if (!this.menuItems.length) return;
    if (k === 'arrowup' || k === 'w') { this.menuSel = (this.menuSel + this.menuItems.length - 1) % this.menuItems.length; sfx.move(); this.renderMenu(); }
    else if (k === 'arrowdown' || k === 's') { this.menuSel = (this.menuSel + 1) % this.menuItems.length; sfx.move(); this.renderMenu(); }
    else if (k === 'z' || k === 'enter' || k === ' ') { sfx.select(); this.choose(this.menuItems[this.menuSel]); }
    else if ((k === 'escape' || k === 'x') && this.mode === 'pause') { sfx.back(); this.resume(); }
  }
  private choose(o: string) {
    switch (o) {
      case '1 PLAYER': return this.kickoff('solo');
      case 'CO-OP: P2 IS HUSSEIN': return this.kickoff('coop');
      case 'VERSUS: P2 IS THE TEACHERS': return this.kickoff('versus');
      case 'RESUME': return this.resume();
      case 'RESTART': case 'PLAY AGAIN': return this.scene.restart(this.setup);
      case 'BACK TO TITLE': case 'QUIT TO TITLE': return this.leave('title');
      case 'QUIT TO CUP': case 'BACK TO CUP': return this.leave('cup', { friendly: true });
      case 'CONTINUE': return this.leave('cup', { result: this.result() });
      case 'ATTACK': case 'BALANCED': case 'DEFEND': return this.setTactic(o);
    }
  }
  private kickoff(kind: Kind) {
    this.kind = kind; this.clearPanel(); this.mode = 'play';
    bridgeOnly([START]);
    this.syncControls(true);
    const go = () => { this.cutting = false; this.prime(); this.flash(tr('KICK OFF!'), ''); sfx.whistle(); };
    if (!this.firstKick) return go();
    this.firstKick = false;
    // before the first kick-off: the line-ups, VS, the two stars eye to eye
    this.cutting = true;
    const side = (t: 0 | 1) => {
      const d = this.m.teams[t], star = [d.gk, ...d.field].find(p => SPECIALS[p.id] && SPECIALS[p.id].kind !== 'save') ?? d.field[2];
      return { name: d.name, color: d.color, sprites: [d.gk, ...d.field].map(p => p.sprite), star: star.sprite };
    };
    vsIntro(this, side(0), side(1), go);
  }
  private pause() { if (this.shootout || this.cutting) return; this.mode = 'pause'; bridgeOnly(null); this.showPanel(tr('PAUSED'), this.scoreLine(), ['RESUME', 'RESTART', this.setup.home ? 'QUIT TO CUP' : 'QUIT TO TITLE']); }
  private leave(scene: string, data: object = {}) {
    this.cameras.main.fadeOut(300); this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start(scene, data));
  }
  /** for the cup: did we win, and the score (+ penalties) */
  private result() {
    const [a, b] = this.m.score, pens = this.m.pensWinner >= 0;
    return { won: a > b || this.m.pensWinner === 0, score: pens ? [a, b, ...this.m.pensScore()] : [a, b] };
  }
  private resume() { this.clearPanel(); this.mode = 'play'; bridgeOnly([START]); this.prime(); }
  /** the button that closed a menu must not also kick the ball. Done on the next frame: the
   *  menu runs inside Phaser's key handler, before the action listener has even seen that key. */
  private prime() { this.needPrime = true; }

  /** who controls what. Player 2 joins (or leaves) when a controller is plugged in. */
  private syncControls(force = false) {
    const n = pads().length;
    if (!force && n === this.padCount) return;
    this.padCount = n;
    const cs: Control[] = [{ slot: 0, team: 0, role: 'field' }];
    const p2 = this.kind !== 'solo' && n >= 1;
    if (p2) cs.push(this.kind === 'coop' ? { slot: 1, team: 0, role: 'keeper' } : { slot: 1, team: 1, role: 'field' });
    this.m.setControls(cs);
    this.refreshHint();
  }
  private refreshHint() {
    const style = padStyle();
    let h = touchActive() ? 'A pass · B shoot/tackle · RUN · SWAP player'
      : style === 'playstation' ? '✕ pass · □ shoot · ○ lob · △ thru · R2 run · L1 swap'
      : style === 'xbox' ? 'A pass · X shoot · B lob · Y thru · RT run · LB swap'
      : 'Z pass · X shoot · C lob · V thru · SHIFT run · TAB swap';
    if (this.kind !== 'solo' && this.padCount < 1) h = 'Player 2: connect a controller';
    this.hint.setText(tr(h));
  }

  // ───────────────────────── loop
  update(_t: number, delta: number) {
    if (this.shootout) this.shootout.update();
    if (this.mode === 'play' && !this.cutting) {
      this.syncControls();
      if (this.needPrime) { this.needPrime = false; clearTaps(); this.m.prime(readSlots(this.kind !== 'solo' && this.padCount >= 1)); this.acc = 0; }
      // slow motion for a moment after a signature move
      const rate = this.slow > 0 ? 0.35 : 1;
      this.slow = Math.max(0, this.slow - Math.min(delta, 100) / 1000);
      this.acc += Math.min(delta, 100) / 1000 * rate;
      while (this.acc >= DT) {
        this.acc -= DT;
        this.m.step(readSlots(this.kind !== 'solo' && this.padCount >= 1));
        for (const e of this.m.events) this.onEvent(e);
        if (this.cutting) break;
        if (this.m.phase === 'full' && this.mode === 'play') { this.end(); break; }
      }
    }
    this.render();
    this.drama();
    // the referee jogs after the play, staying on the wall side of the ball
    const dt = Math.min(delta, 100) / 1000, b0 = this.m.ball;
    const rx = Phaser.Math.Clamp(OX + b0.x + 34, OX + 12, OX + CW - 6), ry = OY + Phaser.Math.Clamp(b0.y + 18, 10, CL - 10);
    const vx = (rx - this.ref.x) * (1 - Math.exp(-1.8 * dt)), vy = (ry - this.ref.y) * (1 - Math.exp(-1.8 * dt));
    this.ref.x += vx; this.ref.y += vy; this.ref.setDepth(this.ref.y);
    const rdir = Math.abs(vy) > Math.abs(vx) ? (vy < 0 ? 'up' : 'down') : 'side';
    const rkey = `amr-${Math.hypot(vx, vy) > 0.15 ? 'walk' : 'idle'}-${rdir}`;
    if (this.ref.anims.currentAnim?.key !== rkey) this.ref.play(rkey);
    this.ref.setFlipX(rdir === 'side' && vx > 0);
    for (const bb of this.bubbles) { const t = bb.getData('target') as Phaser.GameObjects.Sprite; if (t?.active) bb.setPosition(t.x, t.y - 28); }
    // the crowd gets louder as the ball gets near a goal
    const near = Math.min(this.m.ball.y, CL - this.m.ball.y);
    if (this.mode === 'play') voices.excite(Phaser.Math.Clamp(1 - near / 130, 0, 1));
    // camera: follow the ball, leaning towards where the attack is going (frame-rate independent)
    const b = this.m.ball, lean = b.owner ? this.m.attackDir(b.owner.team) * 30 : b.vy * 0.12;
    const want = Phaser.Math.Clamp(OY + b.y + lean - H / 2, 0, WORLD_H - H);
    this.camY += (want - this.camY) * (1 - Math.exp(-5 * Math.min(delta, 100) / 1000));
    this.cameras.main.scrollY = Math.round(this.camY);
  }

  private render() {
    const m = this.m;
    for (const p of m.players) {
      const { spr, ring, mark } = this.bodies.get(p)!;
      const x = OX + p.x, y = OY + p.y, moving = Math.hypot(p.vx, p.vy) > 10;
      const dir = Math.abs(p.fy) > Math.abs(p.fx) ? (p.fy < 0 ? 'up' : 'down') : 'side';
      const key = `${p.def.sprite}-${moving ? 'walk' : 'idle'}-${dir}`;
      if (spr.anims.currentAnim?.key !== key) spr.play(key);
      spr.setPosition(Math.round(x), Math.round(y) + 2).setFlipX(dir === 'side' && p.fx > 0).setDepth(y);
      spr.setAngle(p.dive > 0 ? (p.vx < 0 ? -80 : 80) : p.stun > 0.3 ? 10 : 0);
      ring.setPosition(x, y + 1).setDepth(y - 1);
      mark.setVisible(p.slot >= 0).setColor(p.slot === 1 ? '#7fd0f0' : '#f2c94c').setPosition(Math.round(x), Math.round(y) - 23).setDepth(2500);
    }
    const b = m.ball;
    this.ball.setPosition(OX + b.x, OY + b.y - 2 - b.z).setDepth(OY + b.y + 1).setRotation(this.ball.rotation + Math.hypot(b.vx, b.vy) * 0.0015);
    this.shadow.setPosition(OX + b.x, OY + b.y).setDepth(OY + b.y - 1).setAlpha(Math.max(0.1, 0.35 - b.z / 120));
    // afterimages behind a hard-hit ball (and through the slow motion)
    this.ballHist.unshift({ x: this.ball.x, y: this.ball.y }); this.ballHist.length = Math.min(this.ballHist.length, 12);
    const fast = Math.hypot(b.vx, b.vy) > 250 || (this.slow > 0 && !b.owner);
    this.trail.forEach((t, i) => { const h = this.ballHist[(i + 1) * 2]; t.setVisible(fast && !!h).setAlpha(0.45 - i * 0.08).setDepth(this.ball.depth - 1); if (h) t.setPosition(h.x, h.y); });
    // shot power over the player charging it
    const charging = m.players.find(p => p.charge >= 0);
    this.powerBg.setVisible(!!charging); this.power.setVisible(!!charging);
    if (charging) {
      const x = OX + charging.x, y = OY + charging.y - 30;
      this.powerBg.setPosition(x, y); this.power.setPosition(x - 8, y).setSize(16 * charging.charge, 2).setFillStyle(charging.charge > 0.9 ? 0xff5050 : 0xf2c94c);
    }
    // Arabic mirrors the board (home on the right), so the home score goes on the right too
    this.scoreText.setText(isAr() ? `${num(m.score[1])} - ${num(m.score[0])}` : `${m.score[0]} - ${m.score[1]}`);
    const shown = Math.min(300, Math.floor(m.clock / m.halfSeconds * 300)) + (m.half - 1) * 300;
    const mm = String(Math.floor(shown / 60)).padStart(2, '0'), ss = String(shown % 60).padStart(2, '0');
    if (m.pens) { const [pa, pb] = m.pensScore(); this.clockText.setText(`${tr('PENALTIES')} ${num(pa)} - ${num(pb)}`); }
    else this.clockText.setText(isAr() ? `${num(+mm).padStart(2, '٠')}:${num(+ss).padStart(2, '٠')}` : `${mm}:${ss}`);
    const me = m.controlled(0);
    this.who.setText(me ? `▼ ${tr(CAST[me.def.id]?.name ?? me.def.id)}` : '');
    this.whoBg.setSize(this.who.width + 12, 14).setVisible(!!me);
  }
  private scoreLine() {
    const [a, b] = this.m.score;
    return `${tr(this.m.teams[0].short)}  ${num(a)} - ${num(b)}  ${tr(this.m.teams[1].short)}`;
  }

  private onEvent(e: MatchEvent) {
    switch (e.t) {
      case 'kick': case 'pass': if (!sample('kick', 0.45, 0.9 + Math.random() * 0.2)) sfx.kick(); break;
      case 'tackle': if (!sample('tackle', 0.3)) sfx.kick(); break;
      case 'shot':
        if (!sample('shot', 0.75)) { sfx.kick(); sfx.kick(); }
        this.lastShot = this.time.now; this.lastShooter = this.m.players.find(p => p.def.id === e.who) ?? null; break;
      case 'post': if (!sample('post', 0.8)) sfx.bump(); this.ooh(); this.bubbleFor(e.team === 0 ? 'karim' : '', 'NOOO! The post!'); break;
      case 'foul': this.onFoul(e.who!, e.team!, false); break;
      case 'card': this.onFoul(e.who!, e.team!, true); break;
      case 'lost': this.onLost(e.who!, e.team!); break;
      case 'wall': sfx.bump(); break;
      case 'miss': if (this.m.ball.z >= 0 && e.team !== undefined && this.lastShot > this.time.now - 2500) this.ooh(); break;
      case 'whistle': if (this.m.phase === 'restart' && this.m.phaseT > 0) sfx.blip(900); break;
      case 'goal': {
        sfx.whistle();
        const name = tr(CAST[e.who ?? '']?.name ?? '');
        const scorer = this.m.players.find(p => p.def.id === e.who);
        const small = e.team === 0 ? name : fmt('{name} scores for {team}.', { name, team: tr(this.m.teams[1].name) });
        // the crowd is the school: they go wild for us, and groan (politely) for the teachers
        if (e.team === 0) { voices.roar(); this.time.delayedCall(2200, () => voices.ole()); this.jumpCrowd(5); }
        else { this.ooh(); voices.applause(); this.jumpCrowd(1); }
        if (scorer) {
          this.cutting = true;
          goalCutin(this, { hero: this.actor(scorer), big: tr('GOAL!'), small }, () => { this.cutting = false; this.acc = 0; this.prime(); this.afterGoal(e.team as 0 | 1); });
        } else this.flash(tr('GOAL!'), small);
        break;
      }
      case 'save':
        // the High Dam: every big Hussein save gets the chant
        if (e.who === 'hussein') { voices.applause(); voices.hussein(); this.chant(); this.maybeKnee(); }
        else { this.ooh(); voices.applause(); }
        break;
      case 'half': sfx.whistle(); this.flash(tr('HALF TIME'), tr('Change ends!')); this.time.delayedCall(1300, () => this.halfTimeTalk()); this.cutting = true; break;
      case 'pens': sfx.whistle(); this.cutting = true; this.flash(tr('PENALTIES!'), '', 1200); this.time.delayedCall(1500, () => this.startShootout()); break;
      case 'special': this.cutscene(e.who!, e.team!); break;
      case 'full': sfx.whistle(); break;
    }
  }
  // ───────────────────────── anime cutscenes (./match/cutin.ts): freeze, cut-in, then the AI plays it
  private actor(p: Player): Actor { return { sprite: p.def.sprite, color: this.m.teams[p.team].color, name: CAST[p.def.id]?.name ?? p.def.id }; }
  private cutscene(who: string, team: number) {
    const sp = SPECIALS[who]; if (!sp) { this.m.release(); return; }
    this.cutting = true;
    const p = this.m.players.find(q => q.def.id === who && q.team === team)!;
    // duels: a tackle faces the man on the ball, a save faces whoever shot
    const foeP = sp.kind === 'tackle' ? this.m.ball.owner : sp.kind === 'save' ? this.lastShooter : null;
    const foe = foeP && foeP.team !== p.team ? this.actor(foeP) : undefined;
    const quick = sp.kind === 'tackle' || sp.kind === 'save' || (this.m.pending?.kind === 'pass');
    if (sp.kind === 'save') voices.hussein(); else this.ooh();
    specialCutin(this, { hero: this.actor(p), move: sp.name, line: sp.line, foe, quick }, () => {
      this.cutting = false; this.m.release(); this.acc = 0; this.prime();
      this.slow = sp.kind === 'save' || sp.kind === 'tackle' ? 0.35 : 0.7;     // a beat of slow motion as it plays out
      if (who === 'ibrahim' && this.teachersWatching.length) this.time.delayedCall(1600, () => this.bubbleAt(this.teachersWatching[2], tr('Miss Hager: ...was that for us?')));
      if (who === 'saif') this.time.delayedCall(2600, () => this.bubbleFor('mostafa', 'That is my brother. Unfortunately.'));
    });
  }

  // ───────────────────────── the drama around the football
  /** speech bubble over a player (by id), or over the coach / Hefny on the touchline */
  private bubbleFor(id: string, text: string) {
    if (!id) return;
    const spr = id === 'mostafa' ? this.coach : id === 'hefny' ? this.hefny : (() => { const p = this.m.players.find(q => q.def.id === id); return p ? this.bodies.get(p)!.spr : null; })();
    if (spr) this.bubbleAt(spr, tr(text));
  }
  private bubbleAt(target: Phaser.GameObjects.Sprite, text: string) {
    if (this.time.now - this.lastBubble < 900) return;
    this.lastBubble = this.time.now;
    const t = this.add.text(0, 0, text, txt(8, { color: '#1b1420', wordWrap: { width: 150 }, align: 'center' })).setOrigin(0.5, 1);
    const bg = this.add.rectangle(0, 4, t.width + 10, t.height + 9, 0xf4f0e8).setOrigin(0.5, 1).setStrokeStyle(1, 0x1b1420);
    const tail = this.add.triangle(0, 6, -3, 0, 3, 0, 0, 4, 0xf4f0e8).setOrigin(0.5, 0);
    const c = this.add.container(target.x, target.y - 28, [bg, tail, t]).setDepth(2400).setData('target', target);
    this.bubbles.push(c);
    c.setScale(0.2); this.tweens.add({ targets: c, scale: 1, duration: 140, ease: 'Back.out' });
    this.time.delayedCall(1900, () => this.tweens.add({ targets: c, alpha: 0, duration: 200, onComplete: () => { c.destroy(); this.bubbles = this.bubbles.filter(x => x !== c); } }));
  }
  /** someone lost the ball: Saif shouts at his teammates (he does), the coach shouts at ours */
  private onLost(who: string, team: number) {
    if (this.time.now - this.lastBubble < 5000) return;
    const mine = this.m.players.filter(p => p.team === team).map(p => p.def.id);
    if (mine.includes('saif') && who !== 'saif') this.bubbleFor('saif', Phaser.Utils.Array.GetRandom(['PASS IT TO ME!', 'WHAT WAS THAT?!', 'Wake up! WAKE UP!', 'Give me the ball and stand there.']));
    else if (team === 0 && Math.random() < 0.4) this.bubbleFor('mostafa', Phaser.Utils.Array.GetRandom(['Pass more, panic less!', 'Who is marking him?!', 'Shape! SHAPE!']));
    else if (team === 1 && Math.random() < 0.3) this.bubbleFor('hefny', Phaser.Utils.Array.GetRandom(['YES! TAKE IT!', 'HUSSEIN IS WATCHING YOU!', 'Ole!']));
  }
  private afterGoal(team: 0 | 1) {
    const ids = this.m.players.map(p => p.def.id);
    if (team === 1 && ids.includes('saif')) this.bubbleFor('saif', 'Too easy, brother.');
    else if (team === 0 && this.m.ball.last?.def.id === 'karim') this.bubbleFor('hefny', '...Fine. Good goal, Karim. FINE.');
    else if (team === 0) this.bubbleFor('hefny', 'GOOOAL! Did you see that?!');
    else if (ids.includes('nasser')) this.bubbleFor('nasser', 'Alhamdulillah. Again?');
  }
  /** Mr Amr blows his whistle: a free kick, and on the second foul, a yellow card */
  private onFoul(who: string, team: number, card: boolean) {
    sfx.whistle();
    const name = tr(CAST[who]?.name ?? who);
    if (!card) { this.flash(tr('FOUL!'), fmt('Mr Amr: free kick. {name}, careful.', { name }), 1400); this.bubbleAt(this.ref, tr('FOUL!')); return; }
    const p = this.m.players.find(q => q.def.id === who && q.team === team);
    const ref: Actor = { sprite: 'amr', color: 0xf08a2a, name: 'Mr Amr' };
    this.cutting = true;
    talkCutin(this, [
      { who: ref, line: fmt('{name}! Yellow card. One more and you referee with me.', { name }), card: true },
      ...(p ? [{ who: this.actor(p), line: Phaser.Utils.Array.GetRandom(['Me?! I touched the ball!', 'He fell on his own, sir!', 'Sir, I swear on my grades...']) }] : []),
    ], () => { this.cutting = false; this.acc = 0; this.prime(); });
  }
  /** Hussein's knees: once a match, after a big save, they give in. Hefny runs on with ice. */
  private maybeKnee(tries = 0) {
    if (this.kneeDone || this.mode !== 'play' || this.m.half < 2 || Math.random() > 0.6) return;
    if (this.cutting) { if (tries < 6) this.time.delayedCall(800, () => this.maybeKnee(tries + 1)); return; }
    const h = this.m.players.find(p => p.def.id === 'hussein'); if (!h) return;
    this.kneeDone = true;
    this.time.delayedCall(700, () => {
      if (this.cutting || this.mode !== 'play') { this.kneeDone = false; return; }
      this.cutting = true;
      const hs = this.bodies.get(h)!.spr, hx = this.hefny.x, hy = this.hefny.y;
      this.tweens.add({ targets: this.hefny, x: hs.x - 10, y: hs.y, duration: 900 });
      const hus = this.actor(h), hef: Actor = { sprite: 'hefny', color: 0x3e9a4f, name: 'Hefny' };
      talkCutin(this, [
        { who: hus, line: 'Aaah. My knee. MY KNEE.' },
        { who: hef, line: 'ICE! I brought ice from the canteen! The auntie charged me for it!' },
        { who: hus, line: 'My knee can wait.' },
      ], () => {
        this.tweens.add({ targets: this.hefny, x: hx, y: hy, duration: 700 });
        voices.hussein(); this.chant();
        this.cutting = false; this.acc = 0; this.prime();
      });
    });
  }
  /** the coach's half-time talk: pick the plan for the second half */
  private halfTimeTalk() {
    if (this.kind === 'versus') { this.cutting = false; return; }
    const [a, b] = this.m.score;
    const lead = a > b ? "We're winning. Nobody relax. Especially you, Karim." : a < b ? "We're losing. Fine. We have five minutes and Hussein's knees." : 'Level. They are scared of us. I think. Probably.';
    const mostafa: Actor = { sprite: 'mostafa', color: 0x3b6fd1, name: 'Mostafa' }, hef: Actor = { sprite: 'hefny', color: 0x3e9a4f, name: 'Hefny' };
    talkCutin(this, [
      { who: mostafa, line: lead },
      { who: hef, line: a < b ? 'I will chant louder. That is my tactic.' : 'Second half, new chant. Same word. HUSSEIN.' },
    ], () => {
      this.mode = 'talk'; bridgeOnly(null);
      this.showPanel(tr('HALF TIME · COACH MOSTAFA'), tr('The plan for the second half?'), ['ATTACK', 'BALANCED', 'DEFEND']);
      this.menuSel = 1; this.renderMenu();
    });
  }
  private setTactic(o: string) {
    this.m.tactic[0] = o === 'ATTACK' ? 1 : o === 'DEFEND' ? -1 : 0;
    const [a, b] = this.m.score;
    this.m.tactic[1] = b < a ? 1 : 0;                        // the other coach: chase the game if behind
    this.clearPanel(); this.mode = 'play'; bridgeOnly([START]);
    this.flash('', tr(o === 'ATTACK' ? 'Everyone forward! (more pressing, more shots)' : o === 'DEFEND' ? 'Park the tractor. (sit deep, pick your moments)' : 'Same as before. It works.'), 1600);
    this.cutting = false; this.acc = 0; this.prime();
  }
  /** the last minute of a close game: the banner, the heartbeat, the crowd on its feet */
  private drama() {
    const m = this.m;
    if (this.mode !== 'play' || this.lastMinute || m.half !== 2 || m.phase !== 'play') return;
    if (m.clock > m.halfSeconds - 30 && Math.abs(m.score[0] - m.score[1]) <= 1) {
      this.lastMinute = true;
      this.flash(tr('LAST MINUTE!'), m.score[0] === m.score[1] ? tr('Level. Somebody be a hero.') : m.score[0] > m.score[1] ? tr('Hold on. HOLD ON.') : tr('One goal. We need one goal.'), 2000);
      for (let i = 0; i < 8; i++) { tone(60, 0.12, 'sine', 0.25, 40, i * 0.6); tone(55, 0.1, 'sine', 0.18, 38, i * 0.6 + 0.16); }
      this.jumpCrowd(4);
      this.bubbleFor('hefny', 'EVERYBODY STAND UP!');
    }
  }
  /** knockout draw: the shootout on its own front-view screen */
  private startShootout() {
    const two = this.kind !== 'solo' && this.padCount >= 1;
    this.mode = 'play';
    this.shootout = new Shootout(this, {
      teams: this.m.teams,
      shooterSlot: t => t === 0 ? 0 : this.kind === 'versus' && two ? 1 : -1,
      keeperSlot: t => t === 0 ? (this.kind === 'coop' && two ? 1 : 0) : this.kind === 'versus' && two ? 1 : -1,
      read: () => readSlots(two),
    }, kicks => {
      this.shootout = null;
      this.m.finishPens(kicks);
      this.cutting = false;
      this.end();
    });
  }

  /** a near miss: "ooooh" (not twice in a row) */
  private ooh() { if (this.time.now - this.lastOoh < 1500) return; this.lastOoh = this.time.now; voices.ooh(); }
  private chant() {
    this.flash('', tr('Hefny: HUSSEIN, THE HIGH DAM!!'), 1400);
    this.jumpCrowd(3);
    this.tweens.add({ targets: this.hefny, y: this.hefny.y - 6, yoyo: true, repeat: 3, duration: 120 });
  }
  private jumpCrowd(times: number) {
    this.crowd.forEach((s, i) => this.tweens.add({ targets: s, y: s.y - 4, yoyo: true, repeat: times, duration: 140, delay: i * 30 }));
  }
  private flash(big: string, small: string, ms = 1800) {
    this.banner.setText(big).setAlpha(1).setScale(big ? 1.4 : 1);
    this.sub.setText(small).setAlpha(1);
    if (big) this.tweens.add({ targets: this.banner, scale: 1, duration: 250, ease: 'Back.out' });
    this.tweens.killTweensOf([this.sub]);
    this.tweens.add({ targets: [this.banner, this.sub], alpha: 0, delay: ms, duration: 400 });
  }
  private end() {
    this.mode = 'end'; bridgeOnly(null);
    const r = this.result(), [a, b] = this.m.score;
    const title = r.won ? tr('WE WIN!') : a === b && this.m.pensWinner < 0 ? tr('DRAW!') : fmt('{team} win.', { team: tr(this.m.teams[1].name) });
    if (r.won) { sfx.win(); voices.roar(); }
    const line = this.m.pensWinner >= 0 ? `${this.scoreLine()} · ${tr('PENS')} ${num(this.m.pensScore()[0])}-${num(this.m.pensScore()[1])}` : this.scoreLine();
    const items = this.setup.cup ? ['CONTINUE'] : this.setup.friendly ? ['PLAY AGAIN', 'BACK TO CUP'] : ['PLAY AGAIN', 'QUIT TO TITLE'];
    this.time.delayedCall(900, () => this.showPanel(`${tr('FULL TIME')} · ${title}`, line, items));
  }
}

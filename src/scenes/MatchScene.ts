import * as Phaser from 'phaser';
import { W, H, FONT } from '../config';
import { sfx, tone } from '../systems/sfx';
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
import { CW, CL, GOAL_X0, GOAL_X1, GOAL_D, BOX_R } from '../match/court';

// SEASON 2 PROTOTYPE: one football match on the real RLS court (see src/match/court.ts).
// The match itself is src/match/sim.ts; this scene draws it, reads the controllers, and runs the
// menus around it. Grey-box art for now: lines and stone are drawn here until the court is baked.
//
// Modes: 1 PLAYER (you control the outfield, AI Hussein in goal), CO-OP (player 2 IS Hussein),
// VERSUS (player 2 controls the teachers).

const OX = 136, OY = 48;                    // where the court sits in the world
const WORLD_H = OY + CL + 48;
const HALF_SECONDS = 150;                   // real seconds per half; the clock SHOWS 5 minutes
type Mode = 'menu' | 'play' | 'pause' | 'end';
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

  constructor() { super('match'); }

  create(data: Setup = {}) {
    this.setup = data ?? {}; this.cutting = false;
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

  // ───────────────────────── the court (grey-box: drawn, to be baked in M4)
  private drawCourt() {
    const g = this.add.graphics();
    g.fillStyle(0x3f7d3a).fillRect(0, 0, 104, WORLD_H);                 // the garden
    g.fillStyle(0xb8ad9a).fillRect(104, 0, 30, WORLD_H);                // the pathway, where the crowd stands
    g.fillStyle(0x8f8a85).fillRect(134, OY - GOAL_D - 2, CW + 4, CL + 2 * GOAL_D + 4);
    g.fillStyle(0x86817c);                                              // street-stone tiles
    for (let y = 0; y < CL; y += 16) for (let x = (y / 16) % 2 ? 0 : 8; x < CW; x += 16) g.fillRect(OX + x, OY + y, 8, 8);
    g.fillStyle(0xe8dcc0).fillRect(OX + CW, 0, 10, WORLD_H);           // the school wall (right)
    g.fillStyle(0xc9b994).fillRect(OX + CW + 8, 0, 2, WORLD_H);
    g.fillStyle(0x34343e).fillRect(OX + CW + 10, 0, W, WORLD_H);       // outside: the street
    // the school building (top) and the canteen (bottom)
    g.fillStyle(0xd9c9a3).fillRect(0, 0, OX + CW + 10, OY - GOAL_D - 2);
    for (let x = 12; x < OX + CW; x += 34) g.fillStyle(0x6fa8c8).fillRect(x, 10, 14, 12);
    g.fillStyle(0xc28a5a).fillRect(OX, OY + CL + GOAL_D + 2, CW, 48);
    g.fillStyle(0xe8d8b8).fillRect(OX + 10, OY + CL + GOAL_D + 8, CW - 20, 10);
    this.add.text(OX + CW / 2, OY + CL + GOAL_D + 32, tr('CANTEEN'), txt(8, { color: '#3a2418' })).setOrigin(0.5);
    // lines
    g.lineStyle(1, 0xeef2e6, 0.85);
    g.strokeRect(OX, OY, CW, CL);
    g.lineBetween(OX, OY + CL / 2, OX + CW, OY + CL / 2);
    g.strokeCircle(OX + CW / 2, OY + CL / 2, 24);
    g.beginPath(); g.arc(OX + CW / 2, OY, BOX_R, 0, Math.PI); g.strokePath();
    g.beginPath(); g.arc(OX + CW / 2, OY + CL, BOX_R, Math.PI, Math.PI * 2); g.strokePath();
    // goals: net behind the line, posts on it
    for (const [y0, dir] of [[OY, -1], [OY + CL, 1]] as const) {
      const top = dir < 0 ? y0 - GOAL_D : y0;
      g.fillStyle(0xdfe4ea, 0.35).fillRect(OX + GOAL_X0, top, GOAL_X1 - GOAL_X0, GOAL_D);
      g.lineStyle(1, 0xdfe4ea, 0.5);
      for (let x = GOAL_X0; x <= GOAL_X1; x += 4) g.lineBetween(OX + x, top, OX + x, top + GOAL_D);
      g.fillStyle(0xf4f0e8).fillRect(OX + GOAL_X0 - 2, y0 - 1, GOAL_X1 - GOAL_X0 + 4, 2);
      g.fillRect(OX + GOAL_X0 - 2, top, 2, GOAL_D); g.fillRect(OX + GOAL_X1, top, 2, GOAL_D);
    }
    // trees in the garden (baked props)
    [[30, 70, 'tree1'], [70, 150, 'tree2'], [24, 240, 'tree2'], [66, 330, 'tree1'], [30, 410, 'tree1']].forEach(([x, y, k]) =>
      this.add.image(x as number, y as number, k as string).setOrigin(0.5, 1).setDepth(y as number));
    // the crowd on the pathway, Hefny leading the chants, Mostafa coaching at the halfway line
    const fans = ['student1', 'student2', 'student5', 'shazly', 'student4', 'student6', 'amin', 'student7', 'basha', 'student8'];
    fans.forEach((k, i) => {
      const y = OY + 30 + i * 32 + (i % 2) * 6;
      const s = this.add.sprite(110 + (i % 2) * 8, y, k, 6).setOrigin(0.5, 1).setFlipX(true).setDepth(y);
      this.crowd.push(s);
    });
    this.hefny = this.add.sprite(120, OY + CL / 2 - 10, 'hefny', 6).setOrigin(0.5, 1).setFlipX(true).setDepth(OY + CL / 2 - 10);
    this.add.sprite(126, OY + CL / 2 + 14, 'mostafa', 6).setOrigin(0.5, 1).setFlipX(true).setDepth(OY + CL / 2 + 14);
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
    const fixed = <T extends Phaser.GameObjects.GameObject & Phaser.GameObjects.Components.ScrollFactor & Phaser.GameObjects.Components.Depth>(o: T) => { o.setScrollFactor(0).setDepth(2000); this.panel.push(o); return o; };
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
    }
  }
  private kickoff(kind: Kind) {
    this.kind = kind; this.clearPanel(); this.mode = 'play';
    bridgeOnly([START]);
    this.syncControls(true);
    this.prime();
    this.flash(tr('KICK OFF!'), '');
    sfx.whistle();
  }
  private pause() { this.mode = 'pause'; bridgeOnly(null); this.showPanel(tr('PAUSED'), this.scoreLine(), ['RESUME', 'RESTART', this.setup.home ? 'QUIT TO CUP' : 'QUIT TO TITLE']); }
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
    if (this.mode === 'play' && !this.cutting) {
      this.syncControls();
      if (this.needPrime) { this.needPrime = false; clearTaps(); this.m.prime(readSlots(this.kind !== 'solo' && this.padCount >= 1)); this.acc = 0; }
      this.acc += Math.min(delta, 100) / 1000;
      while (this.acc >= DT) {
        this.acc -= DT;
        this.m.step(readSlots(this.kind !== 'solo' && this.padCount >= 1));
        for (const e of this.m.events) this.onEvent(e);
        if (this.cutting) break;
        if (this.m.phase === 'full' && this.mode === 'play') { this.end(); break; }
      }
    }
    this.render();
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
      case 'kick': case 'pass': case 'tackle': sfx.kick(); break;
      case 'shot': sfx.kick(); sfx.kick(); this.lastShot = this.time.now; break;
      case 'post': sfx.bump(); this.ooh(); break;
      case 'wall': sfx.bump(); break;
      case 'miss': if (this.m.ball.z >= 0 && e.team !== undefined && this.lastShot > this.time.now - 2500) this.ooh(); break;
      case 'whistle': if (this.m.phase === 'restart' && this.m.phaseT > 0) sfx.blip(900); break;
      case 'goal': {
        sfx.whistle();
        const name = tr(CAST[e.who ?? '']?.name ?? '');
        this.flash(tr('GOAL!'), e.team === 0 ? name : fmt('{name} scores for {team}.', { name, team: tr(this.m.teams[1].name) }));
        // the crowd is the school: they go wild for us, and groan (politely) for the teachers
        if (e.team === 0) { voices.roar(); this.time.delayedCall(2200, () => voices.ole()); this.jumpCrowd(5); }
        else { this.ooh(); voices.applause(); this.jumpCrowd(1); }
        break;
      }
      case 'save':
        // the High Dam: every big Hussein save gets the chant
        if (e.who === 'hussein') { voices.applause(); voices.hussein(); this.chant(); }
        else { this.ooh(); voices.applause(); }
        break;
      case 'half': sfx.whistle(); this.flash(tr('HALF TIME'), tr('Change ends!')); break;
      case 'pens': sfx.whistle(); this.flash(tr('PENALTIES!'), tr('Five each. Then sudden death.'), 2200); break;
      case 'pen': this.onPen(e.kind!, e.team!, e.who!); break;
      case 'special': this.cutscene(e.who!, e.team!); break;
      case 'full': sfx.whistle(); break;
    }
  }
  /** penalty shootout: who's up, and what happened */
  private onPen(kind: string, team: number, who: string) {
    const name = tr(CAST[who]?.name ?? '');
    if (kind === 'ready') {
      const human = this.m.pens?.taker?.slot ?? -1, keeperHuman = this.m.players.some(p => p.keeper && p.slot >= 0);
      const style = padStyle();
      const hint = human >= 0 ? (touchActive() ? 'Aim with the pad, hold B to shoot' : style ? 'Aim with the stick, hold □ to shoot' : 'Aim with the arrows, hold X to shoot')
        : keeperHuman ? (touchActive() ? 'In goal: hold a direction, tap A to dive' : style ? 'In goal: hold a direction, ✕ to dive' : 'In goal: hold a direction, Z to dive') : '';
      this.flash('', `${name}${hint ? ' · ' + tr(hint) : ''}`, 1600);
      sfx.whistle();
    } else if (kind === 'scored') { this.flash(tr('GOAL!'), name, 1000); if (team === 0) voices.roar(); else voices.applause(); }
    else { this.flash(tr('SAVED!'), name, 1000); this.ooh(); if (team === 1) voices.applause(); }
  }

  // ───────────────────────── anime cutscene (Blue Lock style): freeze, panel, name, then the AI plays it
  private cutscene(who: string, team: number) {
    const sp = SPECIALS[who]; if (!sp) { this.m.release(); return; }
    this.cutting = true;
    const p = this.m.players.find(q => q.def.id === who)!;
    const color = this.m.teams[team].color;
    const c = this.add.container(0, 0).setScrollFactor(0).setDepth(3000);
    const dark = this.add.rectangle(0, 0, W, H, 0x000000, 0).setOrigin(0);
    // a slanted band in the team's colour, with a white edge
    const band = this.add.graphics();
    band.fillStyle(0xffffff).fillPoints([{ x: -20, y: 58 }, { x: W + 20, y: 26 }, { x: W + 20, y: 214 }, { x: -20, y: 246 }].map(o => new Phaser.Math.Vector2(o.x, o.y)), true);
    band.fillStyle(color).fillPoints([{ x: -20, y: 64 }, { x: W + 20, y: 32 }, { x: W + 20, y: 208 }, { x: -20, y: 240 }].map(o => new Phaser.Math.Vector2(o.x, o.y)), true);
    band.fillStyle(0x1b1420, 0.35).fillPoints([{ x: -20, y: 64 }, { x: W + 20, y: 32 }, { x: W + 20, y: 208 }, { x: -20, y: 240 }].map(o => new Phaser.Math.Vector2(o.x, o.y)), true);
    // speed lines rushing at the player
    const lines = this.add.graphics();
    const fx = 130, fy = 140;
    const drawLines = () => {
      lines.clear();
      for (let i = 0; i < 46; i++) {
        const a = Math.random() * Math.PI * 2, r0 = 60 + Math.random() * 60, r1 = r0 + 80 + Math.random() * 220;
        lines.lineStyle(Math.random() < 0.3 ? 2 : 1, 0xffffff, 0.35 + Math.random() * 0.4);
        lines.lineBetween(fx + Math.cos(a) * r0, fy + Math.sin(a) * r0, fx + Math.cos(a) * r1, fy + Math.sin(a) * r1);
      }
    };
    drawLines();
    const ticker = this.time.addEvent({ delay: 50, loop: true, callback: drawLines });
    // the player: big portrait if we have one, else the sprite blown up
    const hasFace = this.textures.exists(`${p.def.sprite}_face`) && who !== 'saif' && who !== 'abdallah';
    const hero = hasFace ? this.add.image(-120, fy, `${p.def.sprite}_face`).setScale(5) : this.add.sprite(-120, fy + 10, p.def.sprite, 6).setScale(7).setFlipX(true);
    const name = this.add.text(isAr() ? W - 30 : W - 30, 118, tr(sp.name), txt(16, { color: '#ffffff' })).setOrigin(1, 0.5).setScale(1.6).setAlpha(0).setStroke('#1b1420', 6);
    const sub = this.add.text(W - 30, 150, tr(CAST[who]?.name ?? who), txt(8, { color: '#f2c94c' })).setOrigin(1, 0.5).setAlpha(0).setStroke('#1b1420', 4);
    const flashRect = this.add.rectangle(0, 0, W, H, 0xffffff, 0).setOrigin(0);
    c.add([dark, band, lines, hero, name, sub, flashRect]);
    band.x = -W; lines.alpha = 0;
    // whoosh in
    tone(180, 0.35, 'sawtooth', 0.05, 1400);
    this.tweens.add({ targets: dark, fillAlpha: 0.6, duration: 160 });
    this.tweens.add({ targets: band, x: 0, duration: 220, ease: 'Cubic.out' });
    this.tweens.add({ targets: lines, alpha: 1, duration: 200, delay: 120 });
    this.tweens.add({ targets: hero, x: fx, duration: 260, delay: 80, ease: 'Back.out' });
    // impact frame + the name slams in
    this.time.delayedCall(380, () => {
      flashRect.setFillStyle(0xffffff, 1); this.tweens.add({ targets: flashRect, fillAlpha: 0, duration: 140 });
      sfx.hit(); this.cameras.main.shake(180, 0.006);
      name.setAlpha(1).setScale(2.4); this.tweens.add({ targets: name, scale: 1.6, duration: 160, ease: 'Back.out' });
      this.tweens.add({ targets: sub, alpha: 1, duration: 200, delay: 120 });
      if (sp.kind === 'save') voices.hussein(); else this.ooh();
    });
    // and out: the AI plays the move
    this.time.delayedCall(1750, () => {
      this.tweens.add({ targets: [band, hero, name, sub, lines], x: `+=${W}`, duration: 220, ease: 'Cubic.in' });
      this.tweens.add({
        targets: dark, fillAlpha: 0, duration: 240, onComplete: () => {
          ticker.remove(); c.destroy(); this.cutting = false; this.m.release(); this.acc = 0;
          this.prime();
        },
      });
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

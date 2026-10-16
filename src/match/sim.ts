// The football match itself, as plain TypeScript: no Phaser, no DOM. MatchScene draws it and feeds
// it controller input; tools/match-sim.mjs runs hundreds of AI-vs-AI matches headlessly to balance it.
//
// Fixed timestep (DT), seeded randomness, all input passed in per step -> a match is replayable.
// Team 0 attacks UP (towards y=0), team 1 attacks DOWN (towards y=CL).
//
// AI is the "Simple Soccer" shape (Buckland, Programming Game AI by Example), cut down to 4-a-side:
// each team is ATTACKING (has the ball) or DEFENDING. Defending: the nearest player presses, the
// next covers the lane to goal, the last holds the formation. Attacking: the carrier decides
// shoot / pass / dribble, one teammate runs to the best "supporting spot", the other holds shape.

import { CW, CL, GOAL_X0, GOAL_X1, BAR, GOAL_D, BOX_R } from './court';
import type { TeamDef, PlayerDef } from './teams';

export const DT = 1 / 60;
const G = 520;                 // gravity on the ball, px/s^2 (arcade: snappier than real)
const BALL_R = 3;
const PICKUP = 7;              // how close a foot must be to take a loose ball
const CONTROL_SPEED = 240;     // field players can't trap a ball moving faster than this
const BASE_SPEED = 92;         // px/s for speed 1.0 (x sprint below)
const SPRINT = 1.4;

export type Side = 0 | 1;
export type Phase = 'restart' | 'play' | 'goal' | 'half' | 'full';
export interface SlotInput { mx: number; my: number; pass: boolean; shoot: boolean; sprint: boolean; swap: boolean }
export const NO_INPUT: SlotInput = { mx: 0, my: 0, pass: false, shoot: false, sprint: false, swap: false };
export interface Control { slot: number; team: Side; role: 'field' | 'keeper' }
export interface MatchConfig { home: TeamDef; away: TeamDef; controls: Control[]; halfSeconds: number; seed?: number }
export type EventType = 'kick' | 'pass' | 'shot' | 'goal' | 'save' | 'catch' | 'post' | 'wall' | 'out' | 'whistle' | 'tackle' | 'miss' | 'half' | 'full' | 'switch';
export interface MatchEvent { t: EventType; team?: Side; who?: string; slot?: number }

export interface Player {
  team: Side; def: PlayerDef; keeper: boolean; idx: number;
  x: number; y: number; vx: number; vy: number; fx: number; fy: number;   // facing (unit)
  tx: number; ty: number; urgency: number;                                // AI move target, 0..1 speed
  stun: number; kickCd: number; tackleCd: number; dive: number; think: number;
  charge: number;              // >=0 while a human holds shoot
  slot: number;                // human slot controlling it, -1 = AI
  receiving: boolean;
}
export interface Ball { x: number; y: number; z: number; vx: number; vy: number; vz: number; owner: Player | null; last: Player | null; shot: Side | -1; held: number }

const clamp = (v: number, a: number, b: number) => v < a ? a : v > b ? b : v;
const dist = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y);
/** distance from point p to segment a-b */
function segDist(px: number, py: number, ax: number, ay: number, bx: number, by: number) {
  const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy || 1;
  const t = clamp(((px - ax) * dx + (py - ay) * dy) / l2, 0, 1);
  return Math.hypot(px - (ax + dx * t), py - (ay + dy * t));
}
function mulberry32(a: number) {
  return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}

export class Match {
  readonly teams: [TeamDef, TeamDef];
  players: Player[] = [];
  ball: Ball = { x: CW / 2, y: CL / 2, z: 0, vx: 0, vy: 0, vz: 0, owner: null, last: null, shot: -1, held: 0 };
  score: [number, number] = [0, 0];
  half = 1; clock = 0; readonly halfSeconds: number;
  phase: Phase = 'restart'; phaseT = 0;
  taker: Player | null = null;           // during a restart: who takes it
  events: MatchEvent[] = [];
  stats = { shots: [0, 0], onTarget: [0, 0], saves: [0, 0], poss: [0, 0], stuck: 0, outs: 0 };
  controls: Control[] = [];
  private rand: () => number;
  private prev = new Map<number, SlotInput>();
  private spot: [{ x: number; y: number }, { x: number; y: number }] = [{ x: CW / 2, y: CL / 2 }, { x: CW / 2, y: CL / 2 }];
  private spotT = [0, 0];
  private idle = 0;
  private tick = 0;

  constructor(cfg: MatchConfig) {
    this.teams = [cfg.home, cfg.away];
    this.halfSeconds = cfg.halfSeconds;
    this.rand = mulberry32(cfg.seed ?? 1);
    ([0, 1] as Side[]).forEach(team => {
      const t = this.teams[team];
      [t.gk, ...t.field].forEach((def, idx) => this.players.push({
        team, def, keeper: idx === 0, idx, x: 0, y: 0, vx: 0, vy: 0, fx: 0, fy: team === 0 ? -1 : 1,
        tx: 0, ty: 0, urgency: 0, stun: 0, kickCd: 0, tackleCd: 0, dive: 0, think: this.rand() * 0.2, charge: -1, slot: -1, receiving: false,
      }));
    });
    this.setControls(cfg.controls);
    this.kickoff(0);
  }

  // ───────────────────────── helpers
  side = (team: Side) => this.players.filter(p => p.team === team);
  gk = (team: Side) => this.players.find(p => p.team === team && p.keeper)!;
  field = (team: Side) => this.players.filter(p => p.team === team && !p.keeper);
  /** y of the goal this team DEFENDS */
  ownGoalY = (team: Side) => team === 0 ? CL : 0;
  /** y of the goal this team ATTACKS */
  oppGoalY = (team: Side) => team === 0 ? 0 : CL;
  private fwd = (team: Side) => team === 0 ? -1 : 1;
  private emit(t: EventType, extra: Omit<MatchEvent, 't'> = {}) { this.events.push({ t, ...extra }); }
  private speedOf(p: Player) { return BASE_SPEED * (0.7 + 0.45 * p.def.speed); }
  /** which player a human slot is driving right now */
  controlled(slot: number) { return this.players.find(p => p.slot === slot) ?? null; }

  /** buttons already held (e.g. the one that picked the menu option) are not new presses */
  prime(inputs: Map<number, SlotInput>) { for (const [slot, inp] of inputs) this.prev.set(slot, { ...inp }); }

  setControls(cs: Control[]) {
    this.controls = cs;
    this.players.forEach(p => { p.slot = -1; p.charge = -1; });
    for (const c of cs) {
      if (c.role === 'keeper') this.gk(c.team).slot = c.slot;
      else {
        const fieldP = this.field(c.team).filter(p => p.slot < 0);
        const pick = fieldP.sort((a, b) => dist(a, this.ball) - dist(b, this.ball))[0];
        if (pick) pick.slot = c.slot;
      }
    }
  }
  /** move a field-control slot to another of its team's outfielders */
  private switchTo(slot: number, to: Player) {
    const cur = this.controlled(slot);
    if (!cur || cur === to || to.keeper || to.slot >= 0) return;
    cur.slot = -1; cur.charge = -1; to.slot = slot;
    this.emit('switch', { slot, team: to.team });
  }
  private fieldSlot(team: Side) { return this.controls.find(c => c.team === team && c.role === 'field')?.slot ?? -1; }

  // ───────────────────────── restarts
  private place(team: Side, kicking: boolean) {
    const f = this.fwd(team), base = this.ownGoalY(team);
    const [g, a, b, c] = this.side(team);
    const at = (p: Player, x: number, depth: number) => { p.x = x; p.y = base + f * depth; p.vx = p.vy = 0; p.fx = 0; p.fy = f; p.stun = p.dive = 0; p.charge = -1; p.receiving = false; };
    at(g, CW / 2, 10);
    at(a, CW / 2, CL * 0.2);
    at(b, CW * 0.28, CL * 0.4);
    if (kicking) at(c, CW / 2, CL / 2 - 6); else at(c, CW * 0.72, CL * 0.4);
  }
  private kickoff(team: Side) {
    this.place(0, team === 0); this.place(1, team === 1);
    const b = this.ball; Object.assign(b, { x: CW / 2, y: CL / 2, z: 0, vx: 0, vy: 0, vz: 0, owner: null, shot: -1, held: 0 });
    this.restart(this.field(team)[2]);
  }
  /** the taker holds the ball still; the other team must back off until it's played */
  private restart(taker: Player) {
    this.phase = 'restart'; this.phaseT = 0; this.taker = taker;
    this.ball.owner = taker; this.ball.last = taker; this.ball.shot = -1;
    taker.vx = taker.vy = 0; taker.stun = 0;
    const slot = this.fieldSlot(taker.team);
    if (slot >= 0 && !taker.keeper) this.switchTo(slot, taker);
    this.emit('whistle');
  }

  // ───────────────────────── the step
  step(inputs: Map<number, SlotInput> = new Map()) {
    this.events.length = 0;
    this.phaseT += DT;
    if (this.phase === 'goal' || this.phase === 'half') {
      this.coast();
      if (this.phaseT > (this.phase === 'goal' ? 2.2 : 2.6)) {
        if (this.phase === 'half') { this.half = 2; this.clock = 0; this.kickoff(1); }   // team 1 kicks off the 2nd half
        else this.kickoff(this.lastConceded);
      }
      return;
    }
    if (this.phase === 'full') { this.coast(); return; }
    if (this.phase === 'play') {
      this.clock += DT;
      if (this.ball.owner) this.stats.poss[this.ball.owner.team] += DT;
      if (this.clock >= this.halfSeconds && !this.ball.owner?.keeper) {
        this.phase = this.half === 1 ? 'half' : 'full'; this.phaseT = 0;
        this.emit(this.half === 1 ? 'half' : 'full'); this.ball.owner = null;
        return;
      }
    }

    for (const p of this.players) {
      p.stun = Math.max(0, p.stun - DT); p.kickCd = Math.max(0, p.kickCd - DT);
      p.tackleCd = Math.max(0, p.tackleCd - DT); p.dive = Math.max(0, p.dive - DT);
    }
    this.updateSpots();
    // alternate who thinks first each tick, so neither team gets a systematic head start
    this.tick++;
    for (const p of this.tick % 2 ? this.players : [...this.players].reverse()) {
      if (p.slot >= 0) this.human(p, inputs.get(p.slot) ?? NO_INPUT, this.prev.get(p.slot) ?? NO_INPUT);
      else this.ai(p);
    }
    for (const [slot, inp] of inputs) this.prev.set(slot, { ...inp });
    this.movePlayers();
    this.moveBall();
    this.contacts();
    if (this.phase === 'restart') {
      // opponents keep their distance; the AI taker plays it after a beat, a human after 6 s at most
      for (const p of this.players) if (p.team !== this.taker!.team) {
        const d = dist(p, this.ball);
        if (d < 30) { p.x += (p.x - this.ball.x) / (d || 1) * (30 - d); p.y += (p.y - this.ball.y) / (d || 1) * (30 - d); }
      }
      if (this.ball.owner !== this.taker) this.phase = 'play';
      else if (this.taker!.slot < 0 ? this.phaseT > 0.9 : this.phaseT > 6) this.aiPass(this.taker!, true);
    }
    // stuck detector: a dead, unowned ball for 6 s gets nudged to the nearest player (and counted)
    const b = this.ball;
    this.idle = !b.owner && Math.hypot(b.vx, b.vy) < 4 ? this.idle + DT : 0;
    if (this.idle > 6) { this.stats.stuck++; this.idle = 0; const n = this.nearest(this.players, b)!; b.vx = (n.x - b.x) * 2; b.vy = (n.y - b.y) * 2; }
  }
  private lastConceded: Side = 0;
  /** after the whistle: players drift to a stop */
  private coast() {
    for (const p of this.players) { p.vx *= 0.9; p.vy *= 0.9; p.x += p.vx * DT; p.y += p.vy * DT; }
    const b = this.ball; b.vx *= 0.95; b.vy *= 0.95; b.x += b.vx * DT; b.y += b.vy * DT;
    b.y = clamp(b.y, -GOAL_D + 2, CL + GOAL_D - 2);
  }

  // ───────────────────────── humans
  private human(p: Player, inp: SlotInput, prev: SlotInput) {
    const b = this.ball, has = b.owner === p;
    const mag = Math.min(1, Math.hypot(inp.mx, inp.my));
    const frozen = this.phase === 'restart' && this.taker === p;
    if (mag > 0.15) { p.fx = inp.mx / (mag || 1); p.fy = inp.my / (mag || 1); }
    const pressed = (k: 'pass' | 'shoot' | 'swap') => inp[k] && !prev[k];
    const spd = this.speedOf(p) * (inp.sprint ? SPRINT : 1) * (has ? 0.9 : 1);
    if (p.keeper) {
      // P2 as Hussein: move inside the area; A dives where you point; holding it: A throws, B kicks long
      if (p.dive <= 0) { p.tx = p.x + inp.mx * 40; p.ty = p.y + inp.my * 40; p.urgency = mag; }
      if (has) {
        if (this.ball.held > 4) this.aiPass(p, true);   // can't hold it forever
        else if (pressed('pass')) this.throwOut(p, mag > 0.3 ? inp.mx : 0, mag > 0.3 ? inp.my : this.fwd(p.team));
        else if (pressed('shoot')) this.kick(p, p.fx * 60, this.fwd(p.team) * 230, 150, 'kick');
      } else if (pressed('pass') && p.dive <= 0 && p.stun <= 0) this.startDive(p, mag > 0.2 ? inp.mx : p.fx, mag > 0.2 ? inp.my : 0);
      return;
    }
    p.tx = frozen ? p.x : p.x + inp.mx * 40; p.ty = frozen ? p.y : p.y + inp.my * 40; p.urgency = frozen ? 0 : mag * spd / this.speedOf(p);
    if (has) {
      if (pressed('pass')) { this.passDir(p, mag > 0.3 ? inp.mx : p.fx, mag > 0.3 ? inp.my : p.fy); return; }
      if (inp.shoot) p.charge = Math.min(1, Math.max(0, p.charge) + DT / 0.85);   // hold to power up
      if (!inp.shoot && prev.shoot && p.charge >= 0) { this.shoot(p, p.charge, mag > 0.3 ? inp.mx : 0); p.charge = -1; }
      return;
    }
    p.charge = -1;
    if (pressed('swap') || (pressed('pass') && b.owner?.team !== p.team)) {
      // switch to whoever is closest to the ball (not me)
      const next = this.nearest(this.field(p.team).filter(q => q !== p), b);
      if (next) this.switchTo(p.slot, next);
      return;
    }
    if (pressed('shoot')) this.tackle(p);
  }

  // ───────────────────────── AI
  private ai(p: Player) {
    if (p.stun > 0) { p.urgency = 0; return; }
    if (p.keeper) return this.keeperAI(p);
    const b = this.ball, t = this.teams[p.team];
    p.think -= DT;
    const decide = p.think <= 0;
    if (decide) p.think = t.ai.reaction * (0.8 + this.rand() * 0.4);
    const mine = b.owner?.team === p.team;
    if (b.owner === p) {
      if (this.phase === 'restart') { p.urgency = 0; return; }
      if (decide) this.carrierDecide(p);
      return;
    }
    if (this.phase === 'restart' && b.owner?.team !== p.team) { this.goHome(p, false); return; }
    if (p.receiving && !b.owner && b.last?.team === p.team) {
      // run onto the pass: aim where the ball will be
      const tt = Math.min(0.6, dist(p, b) / 160);
      p.tx = b.x + b.vx * tt; p.ty = b.y + b.vy * tt; p.urgency = 1;
      return;
    }
    p.receiving = false;
    if (mine) {
      // supporting: the best-placed teammate takes the supporting spot, the other holds shape
      const sup = this.nearest(this.field(p.team).filter(q => q !== b.owner && q.slot < 0), this.spot[p.team]);
      if (sup === p) { p.tx = this.spot[p.team].x; p.ty = this.spot[p.team].y; p.urgency = 0.85; }
      else this.goHome(p, true);
      return;
    }
    // defending or loose ball: the closest presses, the next covers, the last holds
    const mates = this.field(p.team);
    const order = [...mates].sort((a, c) => this.reach(a) - this.reach(c));
    const rank = order.indexOf(p);           // (a human teammate counts too: if they're nearest, we cover)
    if (rank === 0) {
      const tt = b.owner ? 0.15 : Math.min(0.5, dist(p, b) / 200);
      p.tx = b.x + b.vx * tt; p.ty = b.y + b.vy * tt; p.urgency = 1;
      if (b.owner && b.owner.team !== p.team && dist(p, b.owner) < 13 && p.tackleCd <= 0 && decide && this.rand() < 0.35 + 0.5 * t.ai.aggression) this.tackle(p);
    } else if (rank === 1) {
      // cover: stand between the ball and our goal
      const gy = this.ownGoalY(p.team);
      p.tx = b.x * 0.6 + CW / 2 * 0.4; p.ty = b.y + (gy - b.y) * 0.4; p.urgency = 0.9;
    } else this.goHome(p, false);
  }
  /** rough time for p to reach the ball */
  private reach(p: Player) { const b = this.ball; return dist(p, { x: b.x + b.vx * 0.2, y: b.y + b.vy * 0.2 }) / this.speedOf(p) + p.stun; }
  private goHome(p: Player, attacking: boolean) {
    const f = this.fwd(p.team), base = this.ownGoalY(p.team), b = this.ball;
    // formation: one back, two up; slides with the ball and pushes up when we have it
    const slots = [[0.5, 0.22], [0.27, 0.5], [0.73, 0.5]];
    const [fx, depth] = slots[p.idx - 1];
    const ballDepth = (b.y - base) * f / CL;    // 0 = at our goal, 1 = at theirs
    const d = clamp(depth + (ballDepth - 0.5) * 0.45 + (attacking ? 0.15 : -0.05), 0.08, 0.9);
    p.tx = fx * CW * 0.7 + b.x * 0.3; p.ty = base + f * d * CL; p.urgency = 0.7;
  }
  private updateSpots() {
    for (const team of [0, 1] as Side[]) {
      this.spotT[team] -= DT;
      const c = this.ball.owner;
      if (this.spotT[team] > 0 || !c || c.team !== team) continue;
      this.spotT[team] = 0.5;
      const f = this.fwd(team), goal = { x: CW / 2, y: this.oppGoalY(team) };
      let best = this.spot[team], bestS = -1e9;
      for (let x = 24; x <= CW - 24; x += 32) for (let k = 1; k <= 5; k++) {
        const s = { x, y: clamp(c.y + f * k * 36, 20, CL - 20) };
        const dc = dist(s, c);
        let score = (1 - dist(s, goal) / CL) * 2 + (1 - Math.abs(dc - 72) / 72);
        if (this.laneClear(c, s, 12)) score += 2;
        score += Math.min(1, this.nearestDist(this.side(team === 0 ? 1 : 0), s) / 50);
        if (score > bestS) { bestS = score; best = s; }
      }
      this.spot[team] = best;
    }
  }
  private carrierDecide(p: Player) {
    const t = this.teams[p.team], goal = { x: CW / 2, y: this.oppGoalY(p.team) };
    const dg = dist(p, goal), opp = this.side(p.team === 0 ? 1 : 0);
    const press = this.nearestDist(opp, p);
    // shoot?
    const range = 80 + p.def.shot * 60;
    if (dg < range && this.rand() < 0.35 + 0.65 * (1 - dg / range)) {   // closer = keener
      const k = this.gk(p.team === 0 ? 1 : 0);
      const aimX = k.x < CW / 2 ? GOAL_X1 - 6 : GOAL_X0 + 6;   // the corner the keeper isn't covering
      const clear = opp.every(o => o.keeper || segDist(o.x, o.y, p.x, p.y, aimX, goal.y) > 9);
      if ((clear && this.rand() < 0.4 + t.ai.aggression * 0.4) || (dg < 50 && this.rand() < 0.5)) {
        this.shoot(p, clamp(0.45 + this.rand() * 0.5, 0, 1), (aimX - CW / 2) / ((GOAL_X1 - GOAL_X0) / 2));
        return;
      }
    }
    // pass?
    const target = this.bestPass(p);
    const fwdGain = target ? (target.y - p.y) * this.fwd(p.team) : 0;
    if (target && ((press < 18 && this.rand() > p.def.dribble * 0.55) || (fwdGain > 40 && this.rand() < 0.3 + p.def.pass * 0.3))) {
      this.passTo(p, target); return;
    }
    // dribble at goal, sliding away from the nearest defender
    const n = this.nearest(opp.filter(o => !o.keeper), p);
    let dx = goal.x - p.x, dy = goal.y - p.y; const l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l;
    if (n && dist(n, p) < 40) {
      const ax = p.x - n.x, ay = p.y - n.y, al = Math.hypot(ax, ay) || 1, w = (40 - dist(n, p)) / 40 * (0.6 + p.def.dribble);
      dx += ax / al * w; dy += ay / al * w * 0.5;
    }
    p.tx = p.x + dx * 30; p.ty = p.y + dy * 30; p.urgency = 0.85;
  }
  /** the most useful open teammate, or null */
  private bestPass(p: Player): Player | null {
    let best: Player | null = null, bestS = -1e9;
    const f = this.fwd(p.team), opp = this.side(p.team === 0 ? 1 : 0);
    for (const m of this.field(p.team)) {
      if (m === p) continue;
      if (!this.laneClear(p, m, 10)) continue;
      const open = Math.min(1, this.nearestDist(opp, m) / 40);
      const s = open * 2 + (m.y - p.y) * f / 80 - Math.abs(dist(p, m) - 80) / 120;
      if (s > bestS) { bestS = s; best = m; }
    }
    return best;
  }
  private aiPass(p: Player, forced = false) {
    const t = this.bestPass(p) ?? (forced ? this.nearest(this.field(p.team).filter(q => q !== p), p) : null);
    if (t) this.passTo(p, t); else this.kick(p, 0, this.fwd(p.team) * 200, 60, 'kick');
  }
  private keeperAI(k: Player) {
    const b = this.ball, gy = this.ownGoalY(k.team), f = this.fwd(k.team);
    if (b.owner === k) {
      k.urgency = 0;
      if (b.held > 0.7 + this.rand() * 0.2) { const t = this.bestPass(k); if (t) this.passTo(k, t, true); else this.kick(k, (this.rand() - 0.5) * 80, f * 230, 150, 'kick'); }
      return;
    }
    if (k.dive > 0) return;
    k.think -= DT;
    // a shot coming? read where it crosses the line and go there (reaction depends on reflexes)
    const toward = (gy - b.y) * b.vy > 0;
    if (!b.owner && toward && Math.abs(b.vy) > 110) {
      const t = (gy - b.y) / b.vy, xc = b.x + b.vx * t;
      if (t < 1 && xc > GOAL_X0 - 10 && xc < GOAL_X1 + 10) {
        if (k.think <= 0) {
          k.think = 0.22 - 0.16 * (k.def.keeper ?? 0.5);
          const ix = clamp(xc, GOAL_X0 - 2, GOAL_X1 + 2), iy = gy - f * 6;
          k.tx = ix; k.ty = iy; k.urgency = 1;
          if (Math.abs(ix - k.x) > 9 && t < 0.45) this.startDive(k, ix - k.x, 0, Math.abs(ix - k.x) - 4);
        }
        return;
      }
    }
    // loose ball in my area and I'm closest -> come and get it
    const inBox = Math.hypot(b.x - CW / 2, b.y - gy) < BOX_R;
    if (!b.owner && inBox && this.reach(k) <= Math.min(...this.side(k.team === 0 ? 1 : 0).map(o => this.reach(o)))) { k.tx = b.x; k.ty = b.y; k.urgency = 1; return; }
    // otherwise: on the line between ball and goal centre, stepping out a little as the ball comes near
    const d = clamp(Math.hypot(b.x - CW / 2, b.y - gy) * 0.14, 6, 20);
    const ang = Math.atan2(b.y - gy, b.x - CW / 2);
    k.tx = clamp(CW / 2 + Math.cos(ang) * d, GOAL_X0 - 4, GOAL_X1 + 4); k.ty = gy + Math.sin(ang) * d; k.urgency = 0.8;
  }

  // ───────────────────────── actions
  private kick(p: Player, vx: number, vy: number, vz: number, t: EventType, shot = false) {
    const b = this.ball;
    b.owner = null; b.last = p; b.vx = vx; b.vy = vy; b.vz = vz; b.z = Math.max(b.z, 1); b.held = 0;
    b.shot = shot ? p.team : -1;
    p.kickCd = 0.28; p.charge = -1;
    this.players.forEach(q => q.receiving = false);
    this.emit(t, { team: p.team, who: p.def.id });
  }
  private passTo(p: Player, m: Player, throwIt = false) {
    const d = dist(p, m), sp = clamp(80 + d * 1.5, 120, 270) * (0.85 + 0.25 * p.def.pass);
    const tt = d / sp, tx = m.x + m.vx * tt * 0.8, ty = m.y + m.vy * tt * 0.8;
    const err = (this.rand() - 0.5) * (1 - p.def.pass) * 0.22;
    const a = Math.atan2(ty - p.y, tx - p.x) + err;
    this.kick(p, Math.cos(a) * sp, Math.sin(a) * sp, throwIt ? 30 : 0, 'pass');
    m.receiving = true;
    const slot = this.fieldSlot(p.team);
    if (slot >= 0 && !m.keeper && this.controlled(slot) !== m) this.switchTo(slot, m);   // control follows the pass
  }
  /** human pass: to the teammate best lined up with the stick, else into space */
  private passDir(p: Player, dx: number, dy: number) {
    const l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l;
    let best: Player | null = null, bestS = -1e9;
    for (const m of this.field(p.team)) {
      if (m === p) continue;
      const mx = m.x - p.x, my = m.y - p.y, ml = Math.hypot(mx, my) || 1;
      const cos = (mx * dx + my * dy) / ml;
      if (cos < 0.45) continue;
      const s = cos * 2 - ml / 300;
      if (s > bestS) { bestS = s; best = m; }
    }
    if (best) this.passTo(p, best);
    else this.kick(p, dx * 190, dy * 190, 0, 'pass');
  }
  private throwOut(k: Player, dx: number, dy: number) {
    const l = Math.hypot(dx, dy); if (l < 0.1) return this.aiPass(k, true);
    let best: Player | null = null, bestS = -1e9;
    for (const m of this.field(k.team)) { const mx = m.x - k.x, my = m.y - k.y, c = (mx * dx + my * dy) / (Math.hypot(mx, my) * l || 1); if (c > bestS) { bestS = c; best = m; } }
    if (best) this.passTo(k, best, true);
  }
  /** charge 0..1; aim -1 (left post) .. 1 (right post) from the stick, 0 = pick a corner */
  private shoot(p: Player, charge: number, aim: number) {
    const gy = this.oppGoalY(p.team), k = this.gk(p.team === 0 ? 1 : 0);
    if (Math.abs(aim) < 0.2) aim = (k.x > CW / 2 ? -0.7 : 0.7);
    const ax = CW / 2 + clamp(aim, -1, 1) * (GOAL_X1 - GOAL_X0) / 2 * 0.9;
    const sp = (170 + 210 * charge) * (0.78 + 0.32 * p.def.shot);
    const err = (this.rand() - 0.5) * (1.1 - p.def.shot * 0.8) * 0.16 * (0.6 + charge);
    const a = Math.atan2(gy - p.y, ax - p.x) + err;
    // lift: a clean strike stays under the bar, a full-power slash can sail over it
    const vz = 30 + 70 * charge * charge + (this.rand() * (1 - p.def.shot) * 90) * charge;
    this.stats.shots[p.team]++;
    this.kick(p, Math.cos(a) * sp, Math.sin(a) * sp, vz, 'shot', true);
  }
  private tackle(p: Player) {
    if (p.tackleCd > 0 || p.stun > 0) return;
    p.tackleCd = 0.6;
    const o = this.ball.owner;
    if (!o || o.team === p.team || o.keeper || dist(p, o) > 15) { p.stun = 0.15; return; }   // whiffed
    const chance = 0.35 + 0.5 * p.def.tackle - 0.35 * o.def.dribble;
    if (this.rand() < chance) {
      const a = Math.atan2(o.y - p.y, o.x - p.x) + (this.rand() - 0.5);
      this.kick(o, Math.cos(a) * 70, Math.sin(a) * 70, 0, 'tackle');
      this.ball.last = p; o.stun = 0.45;
      this.events[this.events.length - 1].team = p.team;
    } else { p.stun = 0.45; this.emit('miss', { team: p.team }); }
  }
  /** a dive: a burst towards (dx,dy). AI keepers pass `need` (px) so they stop at the ball, not past it */
  private startDive(k: Player, dx: number, dy: number, need?: number) {
    const l = Math.hypot(dx, dy) || 1, max = this.speedOf(k) * 2.6;
    const sp = need === undefined ? max * 0.85 : clamp(need / 0.3, 60, max);
    k.vx = dx / l * sp; k.vy = dy / l * sp; k.dive = 0.32; k.stun = 0.5;
  }

  // ───────────────────────── physics
  private movePlayers() {
    for (const p of this.players) {
      if (p.dive > 0) { p.x += p.vx * DT; p.y += p.vy * DT; }
      else {
        const max = this.speedOf(p) * (p.urgency > 1 ? p.urgency : 1) * Math.min(1, p.urgency);
        let dx = p.tx - p.x, dy = p.ty - p.y; const l = Math.hypot(dx, dy);
        const want = p.stun > 0 ? 0 : Math.min(max, l * 6);          // arrive: slow down near the target
        dx = l > 0.5 ? dx / l * want : 0; dy = l > 0.5 ? dy / l * want : 0;
        const acc = 900 * DT;
        const ex = dx - p.vx, ey = dy - p.vy, el = Math.hypot(ex, ey);
        if (el > acc) { p.vx += ex / el * acc; p.vy += ey / el * acc; } else { p.vx = dx; p.vy = dy; }
        p.x += p.vx * DT; p.y += p.vy * DT;
        if (p.slot < 0 && Math.hypot(p.vx, p.vy) > 8) { const v = Math.hypot(p.vx, p.vy); p.fx = p.vx / v; p.fy = p.vy / v; }
      }
      // keepers stay in their area; everyone stays on the court (the wall is solid, the garden side is a line)
      if (p.keeper) {
        const gy = this.ownGoalY(p.team), dx = p.x - CW / 2, dy = p.y - gy, d = Math.hypot(dx, dy);
        if (d > BOX_R) { p.x = CW / 2 + dx / d * BOX_R; p.y = gy + dy / d * BOX_R; }
      }
      p.x = clamp(p.x, 4, CW - 5); p.y = clamp(p.y, 3, CL - 3);
    }
    // nobody stands inside anybody
    for (let i = 0; i < this.players.length; i++) for (let j = i + 1; j < this.players.length; j++) {
      const a = this.players[i], c = this.players[j], d = dist(a, c);
      if (d < 9 && d > 0.01) { const push = (9 - d) / 2, nx = (a.x - c.x) / d, ny = (a.y - c.y) / d; a.x += nx * push; a.y += ny * push; c.x -= nx * push; c.y -= ny * push; }
    }
  }
  private moveBall() {
    const b = this.ball;
    if (b.owner) {
      const p = b.owner; b.held += DT;
      b.x = clamp(p.x + p.fx * 6, 1, CW - BALL_R); b.y = clamp(p.y + p.fy * 5 + 1, 1, CL - 1); b.z = 0; b.vx = p.vx; b.vy = p.vy; b.vz = 0;
      if (p.keeper) { b.x = p.x; b.y = p.y - 2; b.z = 8; }
      return;
    }
    // height: gravity + a dying bounce
    if (b.z > 0 || b.vz !== 0) {
      b.vz -= G * DT; b.z += b.vz * DT;
      if (b.z <= 0) { b.z = 0; b.vz = b.vz < -60 ? -b.vz * 0.45 : 0; }
    }
    // rolling friction on stone; a little air drag
    const k = b.z > 0.5 ? 0.12 : 1.0;
    b.vx *= Math.exp(-k * DT); b.vy *= Math.exp(-k * DT);
    const sp = Math.hypot(b.vx, b.vy);
    if (b.z <= 0.5 && sp > 0) { const s = Math.max(0, sp - 22 * DT) / sp; b.vx *= s; b.vy *= s; }
    const ox = b.x, oy = b.y;
    b.x += b.vx * DT; b.y += b.vy * DT;

    // the school wall (right): bounces back
    if (b.x > CW - BALL_R) { b.x = CW - BALL_R; b.vx = -Math.abs(b.vx) * 0.7; if (Math.abs(b.vx) > 30) this.emit('wall'); }
    // the garden side (left): out -> kick-in to the other team
    if (b.x < -BALL_R) {
      this.stats.outs++; this.emit('out');
      const team: Side = b.last?.team === 0 ? 1 : 0;
      const taker = this.nearest(this.field(team), b)!;
      taker.x = 4; taker.y = clamp(b.y, 12, CL - 12); taker.fx = 1; taker.fy = 0;
      b.x = 8; b.y = taker.y; b.vx = b.vy = b.vz = b.z = 0;
      this.restart(taker);
      return;
    }
    // the goal lines
    for (const [line, team] of [[0, 0], [CL, 1]] as [number, Side][]) {
      const crossed = line === 0 ? b.y < line && oy >= line : b.y > line && oy <= line;
      const inMouth = b.x > GOAL_X0 + BALL_R && b.x < GOAL_X1 - BALL_R;
      // posts
      for (const px of [GOAL_X0, GOAL_X1]) {
        const d = Math.hypot(b.x - px, b.y - line);
        if (d < BALL_R + 2 && b.z < BAR) {
          const nx = (b.x - px) / (d || 1), ny = (b.y - line) / (d || 1), dot = b.vx * nx + b.vy * ny;
          if (dot < 0) { b.vx -= 1.6 * dot * nx; b.vy -= 1.6 * dot * ny; this.emit('post'); b.x = px + nx * (BALL_R + 2.1); b.y = line + ny * (BALL_R + 2.1); }
        }
      }
      if (!crossed) continue;
      if (inMouth && b.z < BAR) {
        // GOAL for the team attacking this line
        const scorer: Side = team;   // line 0 is attacked by team 0, line CL by team 1
        this.score[scorer]++; this.lastConceded = scorer === 0 ? 1 : 0;
        this.phase = 'goal'; this.phaseT = 0; this.emit('goal', { team: scorer, who: b.last?.def.id });
        b.vx *= 0.3; b.vy *= 0.3;
        return;
      }
      if (inMouth && b.z < BAR + 4) { b.vz = -Math.abs(b.vz) * 0.5; this.emit('post'); }   // crossbar
      if (b.shot >= 0) this.emit('miss', { team: b.shot as Side });
      b.shot = -1;
      // the building / canteen wall behind the line: back into play
      b.y = line === 0 ? 1 : CL - 1; b.vy = -b.vy * 0.55;
      if (Math.abs(b.vy) > 30) this.emit('wall');
    }
    b.x = Math.max(b.x, -BALL_R - 1);
    void ox;
  }
  private contacts() {
    const b = this.ball;
    if (b.owner || this.phase !== 'play' && this.phase !== 'restart') return;
    const sp = Math.hypot(b.vx, b.vy);
    // keepers first: they can use their hands in the area
    for (const k of this.players.filter(p => p.keeper)) {
      if (k.kickCd > 0) continue;
      const gy = this.ownGoalY(k.team);
      if (Math.hypot(k.x - CW / 2, k.y - gy) > BOX_R + 2) continue;
      const reach = k.dive > 0 ? 15 : 10, height = k.dive > 0 ? 34 : 28;
      if (dist(k, b) > reach || b.z > height) continue;
      const wasShot = b.shot >= 0 && b.shot !== k.team;
      if (wasShot) {
        // is it beaten? better keepers, slower shots and shots straight at him get saved more
        const skill = k.def.keeper ?? 0.5, placed = Math.min(1, Math.abs(b.x - CW / 2) / ((GOAL_X1 - GOAL_X0) / 2));
        const pSave = clamp(0.56 + 0.45 * skill - (sp - 220) / 700 - placed * 0.25 - (k.dive > 0 ? 0.1 : 0), 0.08, 0.95);
        if (this.rand() > pSave) { k.kickCd = 0.4; continue; }   // beaten: it goes past him
      }
      const handling = 200 + (k.def.keeper ?? 0.5) * 160;
      if (sp < handling) { b.owner = k; b.last = k; b.held = 0; b.shot = -1; k.kickCd = 0.2; this.emit(wasShot ? 'save' : 'catch', { team: k.team, who: k.def.id }); }
      else {
        // too hot to hold: parry it wide
        const side = b.x < CW / 2 ? -1 : 1;
        b.vx = side * (60 + this.rand() * 80); b.vy = this.fwd(k.team) * sp * 0.35; b.vz = 60;
        b.last = k; b.shot = -1; k.kickCd = 0.3;
        this.emit('save', { team: k.team, who: k.def.id });
      }
      if (wasShot) this.stats.saves[k.team]++;
      return;
    }
    // outfield: trap it if it's slow and low enough, otherwise it bounces off whoever is in the way
    let best: Player | null = null, bd = 1e9;
    for (const p of this.players) {
      if (p.keeper || p.kickCd > 0 || p.stun > 0) continue;
      const d = dist(p, b);
      if (d < bd) { bd = d; best = p; }
    }
    if (!best || bd > PICKUP || b.z > 10) return;
    if (sp < CONTROL_SPEED + best.def.dribble * 40) {
      b.owner = best; b.last = best; b.held = 0; b.shot = -1; best.receiving = false;
      const slot = this.fieldSlot(best.team);
      if (slot >= 0 && best.slot < 0) this.switchTo(slot, best);   // you always control your team's ball carrier
    } else {
      const nx = (b.x - best.x) / (bd || 1), ny = (b.y - best.y) / (bd || 1), dot = b.vx * nx + b.vy * ny;
      if (dot < 0) { b.vx = (b.vx - 2 * dot * nx) * 0.35; b.vy = (b.vy - 2 * dot * ny) * 0.35; b.last = best; b.shot = -1; best.kickCd = 0.2; this.emit('kick'); }
    }
  }

  // ───────────────────────── queries
  private nearest(ps: Player[], to: { x: number; y: number }) { let b: Player | null = null, bd = 1e9; for (const p of ps) { const d = dist(p, to); if (d < bd) { bd = d; b = p; } } return b; }
  private nearestDist(ps: Player[], to: { x: number; y: number }) { let bd = 1e9; for (const p of ps) bd = Math.min(bd, dist(p, to)); return bd; }
  private laneClear(a: { x: number; y: number; team?: Side }, to: { x: number; y: number }, w: number) {
    const team = (a as Player).team;
    return this.players.every(o => o.team === team || segDist(o.x, o.y, a.x, a.y, to.x, to.y) > w);
  }
}

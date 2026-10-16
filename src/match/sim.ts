// The football match itself, as plain TypeScript: no Phaser, no DOM. MatchScene draws it and feeds
// it controller input; tools/match-sim.mjs runs hundreds of AI-vs-AI matches headlessly to balance it.
//
// Fixed timestep (DT), seeded randomness, all input passed in per step -> a match is replayable.
// Team 0 attacks UP (towards y=0) in the first half, team 1 DOWN; they switch ends at half time
// (the court isn't symmetric: the wall is on one side, the garden on the other).
//
// AI is the "Simple Soccer" shape (Buckland, Programming Game AI by Example), cut down to 4-a-side,
// with small-sided roles: one ANCHOR who stays behind the ball, two WINGS (left / right).
//   attacking: the carrier decides shoot / pass / dribble. One wing runs to the best supporting
//              spot, the other stretches the play high and wide, the anchor offers the safe pass
//              back. Whoever just passed makes a run (give-and-go).
//   defending: the nearest player PRESSES (gets goal-side, then tackles), the next MARKS the most
//              dangerous opponent goal-side, the last COVERS the other one or the space in front of goal.
//   keeper's ball: opponents leave the area, the team spreads to outlets, the keeper rolls it to
//              whoever is free (never a blind punt).
// Passing is assisted: the stick picks the teammate, the pass is weighted to arrive, and the
// receiver runs to meet it and gets a bigger "magnet" to trap it.

import { CW, CL, GOAL_X0, GOAL_X1, BAR, GOAL_D, BOX_R } from './court';
import type { TeamDef, PlayerDef } from './teams';

export const DT = 1 / 60;
const G = 520;                 // gravity on the ball, px/s^2 (arcade: snappier than real)
const BALL_R = 3;
const PICKUP = 7;              // how close a foot must be to take a loose ball
const MAGNET = 10;             // ...and for the teammate a pass was meant for
const CONTROL_SPEED = 240;     // field players can't trap a ball moving faster than this
const BASE_SPEED = 92;         // px/s for speed 1.0 (x sprint below)
const SPRINT = 1.4;
const SPACING = 34;            // teammates try to stay this far apart

export type Side = 0 | 1;
export type Phase = 'restart' | 'play' | 'goal' | 'half' | 'pensIntro' | 'pens' | 'full';
export interface SlotInput { mx: number; my: number; pass: boolean; shoot: boolean; lob: boolean; through: boolean; sprint: boolean; swap: boolean }
export const NO_INPUT: SlotInput = { mx: 0, my: 0, pass: false, shoot: false, lob: false, through: false, sprint: false, swap: false };
export interface Control { slot: number; team: Side; role: 'field' | 'keeper' }
export interface MatchConfig { home: TeamDef; away: TeamDef; controls: Control[]; halfSeconds: number; seed?: number; knockout?: boolean }
export type EventType = 'kick' | 'pass' | 'shot' | 'goal' | 'save' | 'catch' | 'post' | 'wall' | 'out' | 'whistle' | 'tackle' | 'miss' | 'half' | 'full' | 'switch' | 'beaten' | 'special' | 'pens' | 'pen';
export interface MatchEvent { t: EventType; team?: Side; who?: string; slot?: number; kind?: string }

/** signature moves: when one fires, the match freezes for an anime cutscene, then the AI plays it out */
export type SpecialKind = 'shot' | 'dribble' | 'save';
export const SPECIALS: Record<string, { kind: SpecialKind; name: string }> = {
  karim: { kind: 'shot', name: 'THUNDER SHOT' },
  abdallah: { kind: 'shot', name: 'LEFT-FOOT ROCKET' },
  nasser: { kind: 'shot', name: 'GALABEYA CANNON' },
  saif: { kind: 'dribble', name: 'MESSI MODE' },
  hussein: { kind: 'save', name: 'THE HIGH DAM' },
};
const PEN_Y = 96;              // the penalty spot: 6 m out
type PassKind = 'ground' | 'lob' | 'through';

export interface Player {
  team: Side; def: PlayerDef; keeper: boolean; idx: number;
  x: number; y: number; vx: number; vy: number; fx: number; fy: number;   // facing (unit)
  tx: number; ty: number; urgency: number;                                // AI move target, 0..1 speed
  stun: number; kickCd: number; tackleCd: number; dive: number; think: number;
  charge: number;              // >=0 while a human holds shoot
  slot: number;                // human slot controlling it, -1 = AI
  receiving: boolean; rx: number; ry: number; recvT: number;               // a pass is coming: meet it at (rx, ry)
  runT: number; runX: number; runY: number;                                // give-and-go run after a pass
  boostT: number;              // a signature dribble is on: faster, untackleable
}
export interface Ball { x: number; y: number; z: number; vx: number; vy: number; vz: number; owner: Player | null; last: Player | null; shot: Side | -1; held: number; special: boolean }

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
  ball: Ball = { x: CW / 2, y: CL / 2, z: 0, vx: 0, vy: 0, vz: 0, owner: null, last: null, shot: -1, held: 0, special: false };
  score: [number, number] = [0, 0];
  half = 1; clock = 0; halfSeconds: number;
  phase: Phase = 'restart'; phaseT = 0;
  taker: Player | null = null;           // during a restart: who takes it
  events: MatchEvent[] = [];
  stats = { shots: [0, 0], saves: [0, 0], poss: [0, 0], passes: [0, 0], completed: [0, 0], stuck: 0, outs: 0, longKicks: 0 };
  controls: Control[] = [];
  private rand: () => number;
  private prev = new Map<number, SlotInput>();
  private spot: [{ x: number; y: number }, { x: number; y: number }] = [{ x: CW / 2, y: CL / 2 }, { x: CW / 2, y: CL / 2 }];
  private spotT = [0, 0];
  private idle = 0;
  private tick = 0;
  private order: Player[] = [];
  private lastConceded: Side = 0;
  private passFrom: Player | null = null;  // for pass-completion stats
  readonly knockout: boolean;
  /** a signature move waiting for its cutscene: step() does nothing until release() */
  pending: { who: Player; kind: SpecialKind; aim: number } | null = null;
  private used = new Map<Player, number>();
  private lastSpecial = -1e9;
  private time = 0;                        // seconds of actual play
  private releasing = false;
  /** penalty shootout (knockout draws) */
  pens: { kicks: { team: Side; scored: boolean }[]; state: 'aim' | 'flight' | 'after'; t: number; taker: Player | null } | null = null;
  pensWinner: Side | -1 = -1;

  constructor(cfg: MatchConfig) {
    this.teams = [cfg.home, cfg.away];
    this.halfSeconds = cfg.halfSeconds;
    this.knockout = !!cfg.knockout;
    // scramble the seed first: mulberry32's opening numbers are correlated for nearby seeds (1, 2, 3...)
    this.rand = mulberry32(Math.imul((cfg.seed ?? 1) ^ 0x9E3779B9, 0x85EBCA6B) ^ 0xC2B2AE35);
    ([0, 1] as Side[]).forEach(team => {
      const t = this.teams[team];
      [t.gk, ...t.field].forEach((def, idx) => this.players.push({
        team, def, keeper: idx === 0, idx, x: 0, y: 0, vx: 0, vy: 0, fx: 0, fy: team === 0 ? -1 : 1,
        tx: 0, ty: 0, urgency: 0, stun: 0, kickCd: 0, tackleCd: 0, dive: 0, think: 0.05 + idx * 0.04, charge: -1, slot: -1,
        receiving: false, rx: 0, ry: 0, recvT: 0, runT: 0, runX: 0, runY: 0, boostT: 0,
      }));
    });
    this.setControls(cfg.controls);
    this.kickoff(0);
  }

  // ───────────────────────── helpers
  side = (team: Side) => this.players.filter(p => p.team === team);
  gk = (team: Side) => this.players.find(p => p.team === team && p.keeper)!;
  field = (team: Side) => this.players.filter(p => p.team === team && !p.keeper);
  /** the team attacking the top goal (y=0) this half */
  topTeam: Side = 0;
  /** y of the goal this team DEFENDS */
  ownGoalY = (team: Side) => team === this.topTeam ? CL : 0;
  /** y of the goal this team ATTACKS */
  oppGoalY = (team: Side) => team === this.topTeam ? 0 : CL;
  /** -1 = this team attacks up the screen, 1 = down */
  attackDir = (team: Side) => team === this.topTeam ? -1 : 1;
  private fwd = this.attackDir;
  private other = (team: Side): Side => team === 0 ? 1 : 0;
  private emit(t: EventType, extra: Omit<MatchEvent, 't'> = {}) { this.events.push({ t, ...extra }); }
  private speedOf(p: Player) { return BASE_SPEED * (0.7 + 0.45 * p.def.speed); }
  /** which player a human slot is driving right now */
  controlled(slot: number) { return this.players.find(p => p.slot === slot) ?? null; }
  /** the keeper of `team` has the ball in his hands */
  private keeperHas(team: Side) { return this.ball.owner?.keeper === true && this.ball.owner.team === team; }

  /** buttons already held (e.g. the one that picked the menu option) are not new presses */
  prime(inputs: Map<number, SlotInput>) { for (const [slot, inp] of inputs) this.prev.set(slot, { ...inp }); }

  setControls(cs: Control[]) {
    this.controls = cs;
    this.players.forEach(p => { p.slot = -1; p.charge = -1; });
    for (const c of cs) {
      if (c.role === 'keeper') this.gk(c.team).slot = c.slot;
      else {
        const pick = this.field(c.team).filter(p => p.slot < 0).sort((a, b) => dist(a, this.ball) - dist(b, this.ball))[0];
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
    const at = (p: Player, x: number, depth: number) => {
      p.x = x; p.y = base + f * depth; p.vx = p.vy = 0; p.fx = 0; p.fy = f; p.stun = p.dive = 0; p.charge = -1;
      p.receiving = false; p.runT = 0; p.boostT = 0;
    };
    at(g, CW / 2, 10);
    at(a, CW / 2, CL * 0.2);
    at(b, CW * 0.28, CL * 0.4);
    if (kicking) at(c, CW / 2, CL / 2 - 6); else at(c, CW * 0.72, CL * 0.4);
  }
  private kickoff(team: Side) {
    this.place(0, team === 0); this.place(1, team === 1);
    Object.assign(this.ball, { x: CW / 2, y: CL / 2, z: 0, vx: 0, vy: 0, vz: 0, owner: null, shot: -1, held: 0, special: false });
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
    if (this.pending) return;                 // frozen for a cutscene
    this.phaseT += DT;
    if (this.phase === 'goal' || this.phase === 'half' || this.phase === 'pensIntro') {
      this.coast();
      if (this.phaseT > (this.phase === 'goal' ? 2.2 : 2.6)) {
        if (this.phase === 'half') { this.half = 2; this.clock = 0; this.topTeam = 1; this.kickoff(1); }   // change ends; team 1 kicks off
        else if (this.phase === 'pensIntro') this.startPens();
        else this.kickoff(this.lastConceded);
      }
      return;
    }
    if (this.phase === 'full') { this.coast(); return; }
    if (this.phase === 'play') {
      this.clock += DT; this.time += DT;
      if (this.ball.owner) this.stats.poss[this.ball.owner.team] += DT;
      if (this.clock >= this.halfSeconds && !this.ball.owner?.keeper) {
        this.ball.owner = null; this.phaseT = 0;
        if (this.half === 1) { this.phase = 'half'; this.emit('half'); }
        else if (this.knockout && this.score[0] === this.score[1]) { this.phase = 'pensIntro'; this.emit('pens'); }
        else { this.phase = 'full'; this.emit('full'); }
        return;
      }
    }

    for (const p of this.players) {
      p.stun = Math.max(0, p.stun - DT); p.kickCd = Math.max(0, p.kickCd - DT);
      p.tackleCd = Math.max(0, p.tackleCd - DT); p.dive = Math.max(0, p.dive - DT);
      p.runT = Math.max(0, p.runT - DT); p.boostT = Math.max(0, p.boostT - DT);
      if (p.receiving && (p.recvT -= DT) <= 0) p.receiving = false;
    }
    this.updateSpots();
    // alternate who goes first each tick (thinking, collisions, who reaches a loose ball), so
    // neither team gets a systematic head start from being first in the list
    this.tick++;
    this.order = this.tick % 2 ? this.players : [...this.players].reverse();
    for (const p of this.order) {
      if (p.slot >= 0) this.human(p, inputs.get(p.slot) ?? NO_INPUT, this.prev.get(p.slot) ?? NO_INPUT);
      else this.ai(p);
    }
    for (const [slot, inp] of inputs) this.prev.set(slot, { ...inp });
    this.movePlayers();
    this.moveBall();
    this.contacts();
    // a restart, or a keeper holding the ball: the other team keeps its distance
    if (this.phase === 'pens') { this.pensUpdate(); return; }
    const k = this.ball.owner;
    if (this.phase === 'restart' || k?.keeper) {
      const team = this.phase === 'restart' ? this.taker!.team : k!.team;
      for (const p of this.players) if (p.team !== team) {
        if (this.phase === 'restart') this.repel(p, this.ball, 30);
        else this.repel(p, { x: CW / 2, y: this.ownGoalY(team) }, BOX_R + 8);
      }
    }
    if (this.phase === 'restart') {
      if (this.ball.owner !== this.taker) this.phase = 'play';
      else if (this.taker!.slot < 0 ? this.phaseT > 0.9 : this.phaseT > 6) this.aiPass(this.taker!, true);
    }
    // stuck detector: a dead, unowned ball for 6 s gets nudged to the nearest player (and counted)
    const b = this.ball;
    this.idle = !b.owner && Math.hypot(b.vx, b.vy) < 4 ? this.idle + DT : 0;
    if (this.idle > 6) { this.stats.stuck++; this.idle = 0; const n = this.nearest(this.players, b)!; b.vx = (n.x - b.x) * 2; b.vy = (n.y - b.y) * 2; }
  }
  private repel(p: Player, from: { x: number; y: number }, r: number) {
    const d = dist(p, from);
    if (d < r) { p.x += (p.x - from.x) / (d || 1) * (r - d); p.y += (p.y - from.y) / (d || 1) * (r - d); }
  }
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
    const frozen = (this.phase === 'restart' && this.taker === p) || (this.phase === 'pens' && this.pens?.taker === p);
    if (mag > 0.15) { p.fx = inp.mx / (mag || 1); p.fy = inp.my / (mag || 1); }
    const pressed = (k: 'pass' | 'shoot' | 'swap' | 'lob' | 'through') => inp[k] && !prev[k];
    const spd = this.speedOf(p) * (inp.sprint ? SPRINT : 1) * (has ? 0.9 : 1);
    const aimX = mag > 0.3 ? inp.mx : 0, aimY = mag > 0.3 ? inp.my : 0;
    if (p.keeper) {
      // P2 as Hussein: move inside the area; X dives where you point; holding it: X rolls it out, Square kicks long
      if (p.dive <= 0) { p.tx = p.x + inp.mx * 40; p.ty = p.y + inp.my * 40; p.urgency = mag; }
      if (has && this.phase === 'pens') return;
      if (has) {
        if (b.held > 5) this.keeperDistribute(p, true);   // can't hold it forever
        else if (pressed('pass') || pressed('lob') || pressed('through')) this.humanPass(p, aimX, aimY, pressed('lob') ? 'lob' : 'ground');
        else if (pressed('shoot')) { this.stats.longKicks++; this.kick(p, p.fx * 60, this.fwd(p.team) * 230, 150, 'kick'); }
      } else if (pressed('pass') && p.dive <= 0 && p.stun <= 0) this.startDive(p, mag > 0.2 ? inp.mx : p.fx, mag > 0.2 ? inp.my : 0);
      return;
    }
    p.tx = frozen ? p.x : p.x + inp.mx * 40; p.ty = frozen ? p.y : p.y + inp.my * 40; p.urgency = frozen ? 0 : mag * spd / this.speedOf(p);
    if (has) {
      if (pressed('pass')) return this.humanPass(p, aimX, aimY, 'ground');
      if (pressed('lob')) return this.humanPass(p, aimX, aimY, 'lob');
      if (pressed('through')) return this.humanPass(p, aimX, aimY, 'through');
      if (inp.shoot) p.charge = Math.min(1, Math.max(0, p.charge) + DT / 0.85);   // hold to power up
      if (!inp.shoot && prev.shoot && p.charge >= 0) { this.shoot(p, p.charge, aimX); p.charge = -1; }
      return;
    }
    p.charge = -1;
    if (pressed('swap') || (pressed('pass') && b.owner?.team !== p.team)) {
      // switch to whoever is closest to the ball (not me)
      const next = this.nearest(this.field(p.team).filter(q => q !== p), b);
      if (next) this.switchTo(p.slot, next);
      return;
    }
    if (pressed('shoot') || pressed('lob')) this.tackle(p);
  }

  /** assisted pass: the teammate best lined up with the stick (open and reachable ones preferred).
   *  No stick = the best option overall. Stick pointing at nobody = into space that way. */
  private humanPass(p: Player, dx: number, dy: number, kind: PassKind) {
    const aimed = Math.hypot(dx, dy) > 0.1;
    const opp = this.side(this.other(p.team));
    let best: Player | null = null, bestS = -1e9;
    for (const m of this.field(p.team)) {
      if (m === p) continue;
      const mx = m.x - p.x, my = m.y - p.y, ml = Math.hypot(mx, my) || 1;
      const cos = aimed ? (mx * dx + my * dy) / (ml * Math.hypot(dx, dy)) : 0.7;
      if (cos < 0.34) continue;                                  // outside a ~70° cone either side
      const open = Math.min(1, this.nearestDist(opp, m) / 40);
      const safe = kind === 'lob' || this.laneClear(p, m, 9) ? 1 : 0;
      const s = cos * 3 + open + safe * 1.2 - ml / 260;
      if (s > bestS) { bestS = s; best = m; }
    }
    if (!best && p.keeper) best = this.nearest(this.field(p.team), p);
    if (best) return this.passTo(p, best, kind);
    // nobody that way: play it into space where the stick points
    const l = Math.hypot(dx, dy) || 1, ux = aimed ? dx / l : p.fx, uy = aimed ? dy / l : p.fy;
    this.stats.passes[p.team]++;
    if (kind === 'lob') this.kick(p, ux * 150, uy * 150, 150, 'pass');
    else this.kick(p, ux * 190, uy * 190, 0, 'pass');
  }

  // ───────────────────────── AI
  private ai(p: Player) {
    if (this.phase === 'pens') {
      // only the keeper facing the kick does anything; the taker is driven by pensUpdate()
      if (p.keeper && p.team !== this.pens?.taker?.team && p.stun <= 0) this.keeperAI(p);
      else p.urgency = 0;
      return;
    }
    if (p.stun > 0) { p.urgency = 0; return; }
    if (p.keeper) return this.keeperAI(p);
    const b = this.ball, t = this.teams[p.team], f = this.fwd(p.team);
    p.think -= DT;
    const decide = p.think <= 0;
    if (decide) p.think = t.ai.reaction * (0.8 + this.rand() * 0.4);
    if (b.owner === p) {
      if (this.phase === 'restart') { p.urgency = 0; return; }
      if (p.boostT > 0) return this.boostDribble(p);
      if (decide) this.carrierDecide(p);
      return;
    }
    if (this.phase === 'restart' && b.owner?.team !== p.team) { this.shape(p, false); return; }
    // a pass is coming to me: go and meet it (head for the meeting point, then attack the ball)
    if (p.receiving && !b.owner) {
      const d = dist(p, b);
      if (d < 40 || dist(p, { x: p.rx, y: p.ry }) < 6) { const tt = Math.min(0.4, d / 200); p.tx = b.x + b.vx * tt; p.ty = b.y + b.vy * tt; }
      else { p.tx = p.rx; p.ty = p.ry; }
      p.urgency = 1.15;
      return;
    }
    const mine = b.owner?.team === p.team;
    if (mine) {
      if (this.keeperHas(p.team)) return this.outlet(p);
      if (p.runT > 0) { p.tx = p.runX; p.ty = p.runY; p.urgency = 1.1; return; }   // give-and-go
      const wings = this.field(p.team).filter(q => q !== b.owner && q.idx !== 1);
      const sup = this.nearest(wings.filter(q => q.slot < 0), this.spot[p.team]);
      if (p.idx === 1 && b.owner?.idx !== 1) {
        // anchor: the safe pass behind the ball
        p.tx = CW / 2 + (b.x - CW / 2) * 0.4; p.ty = clamp(b.y - f * 70, 20, CL - 20); p.urgency = 0.8;
        const depth = (p.ty - this.ownGoalY(p.team)) * f / CL;
        if (depth > 0.6) p.ty = this.ownGoalY(p.team) + f * 0.6 * CL;
      } else if (sup === p) { p.tx = this.spot[p.team].x; p.ty = this.spot[p.team].y; p.urgency = 0.9; }
      else {
        // stretch the play: high and wide on my side
        const side = p.idx === 2 ? 0.2 : p.idx === 3 ? 0.8 : (p.x < CW / 2 ? 0.2 : 0.8);
        p.tx = side * CW; p.ty = clamp(b.y + f * 90, 30, CL - 30); p.urgency = 0.85;
      }
      // don't crowd the keeper's area: wait for the ball at its edge
      const gy = this.oppGoalY(p.team);
      if (Math.abs(p.ty - gy) < 40) p.ty = gy - f * 40;
      this.spread(p);
      return;
    }
    // defending, or nobody has it
    const order = [...this.field(p.team)].sort((a, c) => this.reach(a) - this.reach(c));
    const rank = order.indexOf(p);                // (a human teammate counts too: if they're nearest, we mark)
    const carrier = b.owner && b.owner.team !== p.team ? b.owner : null;
    if (this.keeperHas(this.other(p.team))) { this.shape(p, false); return; }
    if (rank === 0) {
      if (carrier) {
        // press: get goal-side of the carrier, then tackle when close and the moment is right
        const gy = this.ownGoalY(p.team), gx = CW / 2;
        const ux = gx - carrier.x, uy = gy - carrier.y, ul = Math.hypot(ux, uy) || 1;
        const d = dist(p, carrier);
        const off = d > 22 ? 12 : 4;
        p.tx = carrier.x + ux / ul * off; p.ty = carrier.y + uy / ul * off; p.urgency = d > 40 ? 1.2 : 0.95;
        if (d < 12 && p.tackleCd <= 0 && decide && this.rand() < (0.15 + 0.25 * t.ai.aggression) * t.ai.reaction * 5) this.tackle(p);
      } else {
        const tt = Math.min(0.5, dist(p, b) / 200);
        p.tx = b.x + b.vx * tt; p.ty = b.y + b.vy * tt; p.urgency = 1.2;
      }
      return;
    }
    if (!carrier) { this.shape(p, !!b.last && b.last.team === p.team); this.spread(p); return; }
    // mark: the opponents without the ball, most dangerous (nearest our goal) first, standing goal-side
    const gy = this.ownGoalY(p.team);
    const threats = this.field(this.other(p.team)).filter(o => o !== carrier).sort((a, c) => Math.abs(a.y - gy) - Math.abs(c.y - gy));
    const target = threats[rank - 1];
    if (target && Math.abs(target.y - gy) < CL * 0.7) {
      // goal-side and a step towards the ball, so passes to him can be cut out
      const ux = CW / 2 - target.x, uy = gy - target.y, ul = Math.hypot(ux, uy) || 1;
      const bx = b.x - target.x, by = b.y - target.y, bl = Math.hypot(bx, by) || 1;
      p.tx = target.x + ux / ul * 16 + bx / bl * 6; p.ty = target.y + uy / ul * 16 + by / bl * 6; p.urgency = 1.2;
    } else {
      // cover: hold the space in front of our goal, on the ball's side
      p.tx = CW / 2 + (b.x - CW / 2) * 0.4; p.ty = gy + (b.y - gy) * 0.3; p.urgency = 1;
    }
    // never let the man I'm watching get between me and my goal (marking, so no spreading out here)
    if ((p.ty - gy) * this.fwd(p.team) > (b.y - gy) * this.fwd(p.team)) p.ty = b.y - this.fwd(p.team) * 10;
  }
  /** rough time for p to reach the ball */
  private reach(p: Player) { const b = this.ball; return dist(p, { x: b.x + b.vx * 0.2, y: b.y + b.vy * 0.2 }) / this.speedOf(p) + p.stun; }
  /** formation spot: anchor back, wings left and right; slides with the ball, pushes up when we have it */
  private shape(p: Player, attacking: boolean) {
    const f = this.fwd(p.team), base = this.ownGoalY(p.team), b = this.ball;
    const slots = [[0.5, 0.2], [0.24, 0.48], [0.76, 0.48]];
    const [sx, depth] = slots[p.idx - 1];
    const ballDepth = (b.y - base) * f / CL;    // 0 = at our goal, 1 = at theirs
    const d = clamp(depth + (ballDepth - 0.5) * 0.5 + (attacking ? 0.12 : -0.06), 0.1, 0.85);
    p.tx = sx * CW * 0.75 + b.x * 0.25; p.ty = base + f * d * CL; p.urgency = 0.75;
  }
  /** our keeper has it: spread out wide so he has someone to roll it to */
  private outlet(p: Player) {
    const f = this.fwd(p.team), base = this.ownGoalY(p.team);
    const spots = [[0.5, 0.42], [0.18, 0.26], [0.82, 0.26]];
    const [sx, depth] = spots[p.idx - 1];
    p.tx = sx * CW; p.ty = base + f * depth * CL; p.urgency = 0.95;
  }
  /** keep away from teammates so we don't all bunch up on top of each other */
  private spread(p: Player) {
    for (const m of this.field(p.team)) {
      if (m === p) continue;
      const mx = m.slot >= 0 || m === this.ball.owner ? m.x : m.tx, my = m.slot >= 0 || m === this.ball.owner ? m.y : m.ty;
      const d = Math.hypot(p.tx - mx, p.ty - my);
      if (d < SPACING) {
        const nx = d > 0.5 ? (p.tx - mx) / d : (p.idx === 2 ? -1 : 1), ny = d > 0.5 ? (p.ty - my) / d : 0;
        p.tx += nx * (SPACING - d); p.ty += ny * (SPACING - d) * 0.6;
      }
    }
    p.tx = clamp(p.tx, 10, CW - 10); p.ty = clamp(p.ty, 10, CL - 10);
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
        score += Math.min(1, this.nearestDist(this.side(this.other(team)), s) / 50);
        if (score > bestS) { bestS = score; best = s; }
      }
      this.spot[team] = best;
    }
  }
  private carrierDecide(p: Player) {
    const t = this.teams[p.team], goal = { x: CW / 2, y: this.oppGoalY(p.team) };
    const dg = dist(p, goal), opp = this.side(this.other(p.team));
    const press = this.nearestDist(opp.filter(o => !o.keeper), p);
    // a signature dribble: in midfield, with defenders in front of him
    if (SPECIALS[p.def.id]?.kind === 'dribble' && dg > 110 && this.canSpecial(p)) {
      const ahead = opp.filter(o => !o.keeper && Math.abs(o.y - goal.y) < Math.abs(p.y - goal.y)).length;
      if (ahead >= 2 && press < 40 && this.rand() < 0.5) return this.special(p, 'dribble', 0);
    }
    // shoot?
    const range = 70 + p.def.shot * 50;
    if (dg < range && this.rand() < 0.4 + 0.6 * (1 - dg / range)) {   // closer = keener
      const k = this.gk(this.other(p.team));
      const aimX = k.x < CW / 2 ? GOAL_X1 - 6 : GOAL_X0 + 6;   // the corner the keeper isn't covering
      const clear = opp.every(o => o.keeper || segDist(o.x, o.y, p.x, p.y, aimX, goal.y) > 9);
      // chance per decision, scaled by how often this team decides, so it means "per second"
      const perSec = clear ? 0.5 + t.ai.aggression * 0.5 : dg < 45 ? 0.3 : 0;
      if (this.rand() < perSec * t.ai.reaction * 2) {
        this.shoot(p, clamp(0.45 + this.rand() * 0.5, 0, 1), (aimX - CW / 2) / ((GOAL_X1 - GOAL_X0) / 2));
        return;
      }
    }
    // pass? under pressure, or when a teammate is clearly better placed
    const target = this.bestPass(p);
    const gain = target ? (target.y - p.y) * this.fwd(p.team) : 0;
    if (target && ((press < 18 && this.rand() > p.def.dribble * 0.5) || (gain > 40 && this.rand() < 0.3 + p.def.pass * 0.3) || p.idx === 1 && gain > 10 && this.rand() < 0.4)) {
      const through = gain > 30 && this.rand() < p.def.pass * 0.3;
      this.passTo(p, target, through ? 'through' : 'ground'); return;
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
    const f = this.fwd(p.team), opp = this.side(this.other(p.team));
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
    if (t) this.passTo(p, t, 'ground'); else this.kick(p, 0, this.fwd(p.team) * 200, 60, 'kick');
  }
  /** keeper with the ball: wait for a free teammate (the team spreads out), then roll it to him */
  private keeperDistribute(k: Player, force = false) {
    const opp = this.side(this.other(k.team));
    let best: Player | null = null, bestS = -1e9;
    for (const m of this.field(k.team)) {
      const open = this.nearestDist(opp, m);
      if (!force && (open < 26 || !this.laneClear(k, m, 10))) continue;
      const s = open - dist(k, m) * 0.2;
      if (s > bestS) { bestS = s; best = m; }
    }
    if (best) this.passTo(k, best, 'ground');
    return !!best;
  }
  private keeperAI(k: Player) {
    const b = this.ball, gy = this.ownGoalY(k.team), f = this.fwd(k.team);
    if (b.owner === k) {
      k.urgency = 0;
      if (this.phase !== 'pens' && b.held > 1.0 && this.rand() < 0.2) this.keeperDistribute(k, b.held > 3.2);
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
    if (!b.owner && inBox && this.reach(k) <= Math.min(...this.side(this.other(k.team)).map(o => this.reach(o)))) { k.tx = b.x; k.ty = b.y; k.urgency = 1; return; }
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
    this.passFrom = t === 'pass' ? p : null;
    this.emit(t, { team: p.team, who: p.def.id });
  }
  /** a pass to m, weighted to arrive: ground (along the floor), lob (over heads), through (into space ahead of him) */
  private passTo(p: Player, m: Player, kind: PassKind) {
    const f = this.fwd(p.team);
    // where m will meet it: a bit in front of him (or well ahead, for a through ball)
    let tx = m.x + m.vx * 0.25, ty = m.y + m.vy * 0.25;
    if (kind === 'through') { tx = m.x + m.vx * 0.3 + (CW / 2 - m.x) * 0.15; ty = m.y + f * 50; }
    tx = clamp(tx, 10, CW - 10); ty = clamp(ty, 10, CL - 10);
    const d = Math.hypot(tx - p.x, ty - p.y);
    const err = (this.rand() - 0.5) * (1 - p.def.pass) * (p.slot >= 0 ? 0.08 : 0.16);
    const a = Math.atan2(ty - p.y, tx - p.x) + err;
    this.stats.passes[p.team]++;
    if (kind === 'lob') {
      // flight time from the horizontal speed; launch just hard enough to come down at his feet
      const vh = clamp(70 + d * 0.8, 110, 210), T = d / vh;
      this.kick(p, Math.cos(a) * vh * 1.06, Math.sin(a) * vh * 1.06, G * T / 2, 'pass');
    } else {
      // rolling friction ~1/s + 22 px/s^2: this lands it with ~80 px/s left
      const v0 = clamp(85 + d * 1.1, 120, 300) * (p.keeper ? 0.9 : 1);
      this.kick(p, Math.cos(a) * v0, Math.sin(a) * v0, p.keeper ? 20 : 0, 'pass');
    }
    m.receiving = true; m.rx = tx; m.ry = ty; m.recvT = 2.5;
    // give-and-go: the passer runs forward into space
    if (!p.keeper && p.slot < 0) { p.runT = 1.1; p.runX = clamp(p.x + (CW / 2 - p.x) * 0.3, 20, CW - 20); p.runY = clamp(p.y + f * 70, 24, CL - 24); }
  }
  /** charge 0..1; aim -1 (left post) .. 1 (right post) from the stick, 0 = pick a corner */
  private shoot(p: Player, charge: number, aim: number) {
    // a signature shot: freeze for the cutscene, the AI hits it on release()
    if (!this.releasing && SPECIALS[p.def.id]?.kind === 'shot' && charge >= 0.8 && this.canSpecial(p)
        && Math.abs(p.y - this.oppGoalY(p.team)) < 200) return this.special(p, 'shot', aim);
    const special = this.releasing;
    const gy = this.oppGoalY(p.team), k = this.gk(this.other(p.team));
    if (Math.abs(aim) < 0.2) aim = (k.x > CW / 2 ? -0.7 : 0.7);
    const ax = CW / 2 + clamp(aim, -1, 1) * (GOAL_X1 - GOAL_X0) / 2 * 0.9;
    const sp = (170 + 210 * charge) * (0.78 + 0.32 * p.def.shot) * (p.def.power ?? 1) * (special ? 1.2 : 1);
    const err = (this.rand() - 0.5) * (1.1 - p.def.shot * 0.8) * 0.16 * (0.6 + charge) * (special ? 0.3 : 1);
    const a = Math.atan2(gy - p.y, ax - p.x) + err;
    // lift: a clean strike stays under the bar, a full-power slash can sail over it
    const vz = special ? 45 : 30 + 70 * charge * charge + (this.rand() * (1 - p.def.shot) * 90) * charge;
    this.stats.shots[p.team]++;
    this.kick(p, Math.cos(a) * sp, Math.sin(a) * sp, vz, 'shot', true);
    this.ball.special = special;
  }

  // ───────────────────────── signature moves + cutscenes
  private canSpecial(p: Player) {
    return !!SPECIALS[p.def.id] && this.phase === 'play' && (this.used.get(p) ?? 0) < 2 && this.time - this.lastSpecial > 25;
  }
  private special(p: Player, kind: SpecialKind, aim: number) {
    this.used.set(p, (this.used.get(p) ?? 0) + 1); this.lastSpecial = this.time;
    this.pending = { who: p, kind, aim }; p.charge = -1;
    this.emit('special', { team: p.team, who: p.def.id, kind });
  }
  /** the cutscene is over: play the move (the AI does it, whoever was in control) */
  release() {
    const s = this.pending; if (!s) return;
    this.pending = null;
    const p = s.who;
    if (s.kind === 'shot' && this.ball.owner === p) {
      const k = this.gk(this.other(p.team));
      this.releasing = true; this.shoot(p, 1, k.x > CW / 2 ? -0.85 : 0.85); this.releasing = false;
    } else if (s.kind === 'dribble') p.boostT = 2.4;
  }
  /** Messi mode: straight at goal, nobody can take it, defenders' ankles go; then lay it on for a teammate */
  private boostDribble(p: Player) {
    const goal = { x: CW / 2, y: this.oppGoalY(p.team) };
    for (const o of this.field(this.other(p.team))) if (dist(o, p) < 14 && o.stun <= 0) { o.stun = 0.5; this.emit('beaten', { team: o.team }); }
    if (dist(p, goal) < 85 || p.boostT < 0.1) {
      p.boostT = 0;
      const t = this.bestPass(p);
      if (t) this.passTo(p, t, 'ground'); else this.shoot(p, 0.8, 0);
      return;
    }
    const n = this.nearest(this.field(this.other(p.team)), p);
    let dx = goal.x - p.x, dy = goal.y - p.y; const l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l;
    if (n && dist(n, p) < 30) { const ax = p.x - n.x, al = Math.abs(ax) || 1; dx += ax / al * 0.8; }
    p.tx = p.x + dx * 30; p.ty = p.y + dy * 30; p.urgency = 1.4;
  }

  // ───────────────────────── penalty shootout
  private startPens() {
    this.phase = 'pens'; this.phaseT = 0;
    this.pens = { kicks: [], state: 'after', t: 0, taker: null };
    this.nextKick();
  }
  pensScore(): [number, number] {
    const k = this.pens?.kicks ?? [];
    return [k.filter(x => x.team === 0 && x.scored).length, k.filter(x => x.team === 1 && x.scored).length];
  }
  private pensDecided() {
    const k = this.pens!.kicks, [a, b] = this.pensScore();
    const na = k.filter(x => x.team === 0).length, nb = k.filter(x => x.team === 1).length;
    if (na <= 5 && nb <= 5) {
      if (a + (5 - na) < b || b + (5 - nb) < a) return true;
      return na === 5 && nb === 5 && a !== b;
    }
    return na === nb && a !== b;                 // sudden death: after each pair
  }
  private nextKick() {
    const ps = this.pens!;
    if (this.pensDecided()) {
      const [a, b] = this.pensScore();
      this.pensWinner = a > b ? 0 : 1; this.phase = 'full'; this.phaseT = 0; this.emit('full');
      return;
    }
    const team: Side = ps.kicks.length % 2 === 0 ? 0 : 1, other = this.other(team);
    this.topTeam = team;                          // the shooter attacks the top goal
    // everybody else waits at the halfway line
    this.field(0).concat(this.field(1)).forEach((p, i) => {
      p.x = 24 + i * 32; p.y = CL * 0.58 + (i % 2) * 12; p.vx = p.vy = 0; p.tx = p.x; p.ty = p.y; p.urgency = 0;
      p.receiving = false; p.stun = 0; p.boostT = 0; p.charge = -1;
    });
    const n = ps.kicks.filter(x => x.team === team).length;
    const taker = this.field(team)[2 - (n % 3)];
    taker.x = CW / 2; taker.y = PEN_Y + 8; taker.fx = 0; taker.fy = -1;
    const k = this.gk(other); k.x = CW / 2; k.y = 5; k.vx = k.vy = 0; k.dive = 0; k.stun = 0; k.think = 0;
    const mine = this.gk(team); mine.x = CW / 2; mine.y = CL - 8; mine.vx = mine.vy = 0;
    Object.assign(this.ball, { z: 0, vx: 0, vy: 0, vz: 0, owner: taker, last: taker, shot: -1, special: false, held: 0 });
    // who controls what: the shooting side's human takes the kick, the other side's human is the keeper
    this.players.forEach(p => { p.slot = -1; });
    for (const c of this.controls) {
      if (c.team === team) { if (c.role === 'field') taker.slot = c.slot; }
      else if (c.role === 'keeper' || !this.controls.some(d => d.team === c.team && d.role === 'keeper')) k.slot = c.slot;
    }
    ps.state = 'aim'; ps.t = 0; ps.taker = taker;
    this.emit('pen', { team, kind: 'ready', who: taker.def.id });
  }
  private penResult(scored: boolean) {
    const ps = this.pens!;
    if (ps.state !== 'flight') return;
    ps.kicks.push({ team: ps.taker!.team, scored }); ps.state = 'after'; ps.t = 0;
    this.emit('pen', { team: ps.taker!.team, kind: scored ? 'scored' : 'missed', who: ps.taker!.def.id });
  }
  private pensUpdate() {
    const ps = this.pens!, b = this.ball, taker = ps.taker!;
    ps.t += DT;
    if (ps.state === 'aim') {
      if (taker.slot < 0 && ps.t > 1.1) this.shoot(taker, 0.55 + this.rand() * 0.4, this.rand() < 0.15 ? 0.01 : this.rand() < 0.5 ? -0.8 : 0.8);
      else if (taker.slot >= 0 && ps.t > 8) this.shoot(taker, 0.7, 0);
      if (b.owner !== taker) { ps.state = 'flight'; ps.t = 0; }
    } else if (ps.state === 'flight') {
      if (b.owner?.keeper || ps.t > 2.2 || (ps.t > 0.6 && Math.hypot(b.vx, b.vy) < 12)) this.penResult(false);
    } else if (ps.t > 1.6) this.nextKick();
  }
  private tackle(p: Player) {
    if (p.tackleCd > 0 || p.stun > 0) return;
    p.tackleCd = 0.6;
    const o = this.ball.owner;
    if (!o || o.team === p.team || o.keeper || dist(p, o) > 15) { p.stun = 0.15; return; }   // whiffed
    if (o.boostT > 0) { p.stun = 0.5; this.emit('beaten', { team: p.team }); return; }      // Messi mode: no chance
    // from in front (goal-side) is easier than chasing from behind
    const gy = this.ownGoalY(p.team), front = Math.abs(p.y - gy) < Math.abs(o.y - gy) ? 0.12 : -0.08;
    const chance = 0.3 + 0.45 * p.def.tackle - 0.35 * o.def.dribble + front;
    if (this.rand() < chance) {
      const a = Math.atan2(o.y - p.y, o.x - p.x) + (this.rand() - 0.5);
      this.kick(o, Math.cos(a) * 70, Math.sin(a) * 70, 0, 'tackle');
      this.ball.last = p; o.stun = 0.45;
      this.events[this.events.length - 1].team = p.team;
    } else { p.stun = 0.35; p.tackleCd = 0.9; this.emit('beaten', { team: p.team }); }   // beaten: that's how you dribble past
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
    // nobody stands inside anybody. A defender holds his ground against the ball carrier: you go
    // round him or pass, you don't walk through him.
    const own = this.ball.owner, ps = this.order.length ? this.order : this.players;
    for (let i = 0; i < ps.length; i++) for (let j = i + 1; j < ps.length; j++) {
      const a = ps[i], c = ps[j], d = dist(a, c);
      if (d >= 10 || d < 0.01) continue;
      const over = 10 - d, nx = (a.x - c.x) / d, ny = (a.y - c.y) / d;
      // only a defender who is goal-side (between the carrier and the goal he defends) holds firm
      const goalSide = (def: Player, car: Player) => Math.abs(def.y - this.ownGoalY(def.team)) < Math.abs(car.y - this.ownGoalY(def.team));
      const wa = a === own && c.team !== a.team && goalSide(c, a) ? 0.85 : c === own && a.team !== c.team && goalSide(a, c) ? 0.15 : 0.5;
      a.x += nx * over * wa; a.y += ny * over * wa; c.x -= nx * over * (1 - wa); c.y -= ny * over * (1 - wa);
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
    const oy = b.y;
    b.x += b.vx * DT; b.y += b.vy * DT;

    // the school wall (right): bounces back
    if (b.x > CW - BALL_R) { b.x = CW - BALL_R; b.vx = -Math.abs(b.vx) * 0.7; if (Math.abs(b.vx) > 30) this.emit('wall'); }
    // the garden side (left): out -> kick-in to the other team
    if (b.x < -BALL_R && this.phase === 'pens') { this.penResult(false); b.x = -BALL_R; b.vx = b.vy = 0; return; }
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
    for (const [line, team] of [[0, this.topTeam], [CL, this.other(this.topTeam)]] as [number, Side][]) {
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
      if (inMouth && b.z < BAR && this.phase === 'pens') { this.penResult(true); b.vx *= 0.3; b.vy *= 0.3; b.y = line === 0 ? -4 : CL + 4; return; }
      if (inMouth && b.z < BAR && this.phase !== 'play' && this.phase !== 'restart') { b.vx = b.vy = 0; return; }
      if (inMouth && b.z < BAR) {
        // GOAL for the team attacking this line
        const scorer: Side = team;   // the team attacking this line
        this.score[scorer]++; this.lastConceded = scorer === 0 ? 1 : 0;
        this.phase = 'goal'; this.phaseT = 0; this.emit('goal', { team: scorer, who: b.last?.def.id });
        b.vx *= 0.3; b.vy *= 0.3;
        return;
      }
      if (inMouth && b.z < BAR + 4) { b.vz = -Math.abs(b.vz) * 0.5; this.emit('post'); }   // crossbar
      if (b.shot >= 0) this.emit('miss', { team: b.shot as Side });
      if (this.phase === 'pens') this.penResult(false);
      b.shot = -1; b.special = false;
      // the building / canteen wall behind the line: back into play
      b.y = line === 0 ? 1 : CL - 1; b.vy = -b.vy * 0.55;
      if (Math.abs(b.vy) > 30) this.emit('wall');
    }
    b.x = Math.max(b.x, -BALL_R - 1);
  }
  private contacts() {
    const b = this.ball;
    if (b.owner || this.phase !== 'play' && this.phase !== 'restart' && this.phase !== 'pens') return;
    const sp = Math.hypot(b.vx, b.vy);
    // keepers first: they can use their hands in the area
    for (const k of this.order.filter(p => p.keeper)) {
      if (k.kickCd > 0) continue;
      const gy = this.ownGoalY(k.team);
      if (Math.hypot(k.x - CW / 2, k.y - gy) > BOX_R + 2) continue;
      const reach = k.dive > 0 ? 15 : 10, height = k.dive > 0 ? 34 : 28;
      if (dist(k, b) > reach || b.z > height) continue;
      const wasShot = b.shot >= 0 && b.shot !== k.team;
      if (wasShot) {
        // is it beaten? better keepers, slower shots and shots straight at him get saved more
        const skill = k.def.keeper ?? 0.5, placed = Math.min(1, Math.abs(b.x - CW / 2) / ((GOAL_X1 - GOAL_X0) / 2));
        const pSave = clamp(0.64 + 0.45 * skill - (sp - 220) / 700 - placed * 0.25 - (k.dive > 0 ? 0.1 : 0) - (b.special ? 0.12 : 0), 0.08, 0.95);
        if (this.rand() > pSave) { k.kickCd = 0.4; continue; }   // beaten: it goes past him
      }
      const handling = 200 + (k.def.keeper ?? 0.5) * 160;
      if (sp < handling) { b.owner = k; b.last = k; b.held = 0; b.shot = -1; k.kickCd = 0.2; this.players.forEach(q => q.receiving = false); this.emit(wasShot ? 'save' : 'catch', { team: k.team, who: k.def.id }); }
      else {
        // too hot to hold: parry it wide
        const side = b.x < CW / 2 ? -1 : 1;
        b.vx = side * (60 + this.rand() * 80); b.vy = this.fwd(k.team) * sp * 0.35; b.vz = 60;
        b.last = k; b.shot = -1; k.kickCd = 0.3;
        this.emit('save', { team: k.team, who: k.def.id });
      }
      if (wasShot) this.stats.saves[k.team]++;
      if (this.phase === 'pens') this.penResult(false);
      // the High Dam: a big save gets its own cutscene
      else if (wasShot && SPECIALS[k.def.id]?.kind === 'save' && (b.special || sp > 300) && this.canSpecial(k)) this.special(k, 'save', 0);
      b.special = false;
      return;
    }
    // outfield: trap it if it's slow and low enough, otherwise it bounces off whoever is in the way.
    // The teammate a pass is meant for has a bigger reach and a softer first touch.
    let best: Player | null = null, bd = 1e9;
    for (const p of this.order) {
      if (p.keeper || p.kickCd > 0 || p.stun > 0) continue;
      const d = dist(p, b) - (p.receiving ? MAGNET - PICKUP : 0);
      if (d < bd) { bd = d; best = p; }
    }
    if (!best || bd > PICKUP || b.z > (best.receiving ? 14 : 10)) return;
    if (sp < CONTROL_SPEED + best.def.dribble * 40 + (best.receiving ? 90 : 0)) {
      if (this.passFrom && this.passFrom.team === best.team && best !== this.passFrom) this.stats.completed[best.team]++;
      this.passFrom = null;
      b.owner = best; b.last = best; b.held = 0; b.shot = -1; b.special = false;
      this.players.forEach(q => q.receiving = false);   // whoever it was meant for, it's settled now
      const slot = this.fieldSlot(best.team);
      if (slot >= 0 && best.slot < 0) this.switchTo(slot, best);   // you always control your team's ball carrier
    } else {
      const d = dist(best, b), nx = (b.x - best.x) / (d || 1), ny = (b.y - best.y) / (d || 1), dot = b.vx * nx + b.vy * ny;
      if (dot < 0) { b.vx = (b.vx - 2 * dot * nx) * 0.35; b.vy = (b.vy - 2 * dot * ny) * 0.35; b.last = best; b.shot = -1; best.kickCd = 0.2; this.emit('kick'); }
    }
  }

  // ───────────────────────── queries
  private nearest(ps: Player[], to: { x: number; y: number }) { let b: Player | null = null, bd = 1e9; for (const p of ps) { const d = dist(p, to); if (d < bd) { bd = d; b = p; } } return b; }
  private nearestDist(ps: Player[], to: { x: number; y: number }) { let bd = 1e9; for (const p of ps) bd = Math.min(bd, dist(p, to)); return bd; }
  private laneClear(a: Player, to: { x: number; y: number }, w: number) {
    return this.players.every(o => o.team === a.team || segDist(o.x, o.y, a.x, a.y, to.x, to.y) > w);
  }
}

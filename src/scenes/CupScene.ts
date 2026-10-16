import * as Phaser from 'phaser';
import { W, H } from '../config';
import { sfx } from '../systems/sfx';
import { music } from '../systems/music';
import { crowd as voices } from '../systems/crowd';
import { tr, txt, isAr, num } from '../systems/i18n';
import { TEAMS } from '../match/teams';
import {
  loadCup, saveCup, newCup, ourMatch, simulateOthers, roundKeys, teamsOf, winner, ROUND_NAMES,
  BEFORE, AFTER_WIN, AFTER_LOSS_STORY, AFTER_LOSS_CUP, AFTER_WARMUP_LOSS,
} from '../match/cup';
import type { CupState, Diff, Kind, Score, Step } from '../match/cup';

// SEASON 2: THE CUP. The football hub: start / continue the school cup, or play a friendly.
// Flow per round: bracket -> pre-match talk -> MatchScene -> back here with the result ->
// other matches simulated -> post-match talk -> next round. The cup is saved in its own slot.

interface Result { won: boolean; score: Score }
interface Data { result?: Result; friendly?: boolean }
type Mode = 'menu' | 'talk' | 'bracket' | 'trophy';   // 'talk' = a staged scene (StageScene) is playing on top

export class CupScene extends Phaser.Scene {
  private st: CupState | null = null;
  private mode: Mode = 'menu';
  private items: string[] = [];
  private sel = 0;
  private texts: Phaser.GameObjects.Text[] = [];
  private layer: Phaser.GameObjects.GameObject[] = [];
  private onPick: ((o: string) => void) | null = null;
  private afterTalk: (() => void) | null = null;
  private pending: string | null = null;    // friendly: chosen opponent

  constructor() { super('cup'); }

  create(data: Data = {}) {
    this.cameras.main.setBackgroundColor('#16201a').fadeIn(300);
    music.play('stadium');
    this.drawBackdrop();
    this.st = loadCup();
    this.input.keyboard!.on('keydown', (e: KeyboardEvent) => this.onKey(e.key.toLowerCase()));
    this.input.on('pointerdown', () => this.onKey('z'));
    if (data.friendly) return this.hub();
    if (data.result && this.st) return this.afterMatch(data.result);
    this.hub();
  }

  private drawBackdrop() {
    // the court at dusk, seen from the pathway (grey-box until the court art is baked)
    const g = this.add.graphics();
    g.fillStyle(0x8f8a85).fillRect(0, 0, W, H);
    g.fillStyle(0x86817c);
    for (let y = 0; y < H; y += 16) for (let x = (y / 16) % 2 ? 0 : 8; x < W; x += 16) g.fillRect(x, y, 8, 8);
    g.lineStyle(2, 0xeef2e6, 0.5).strokeCircle(W / 2, H / 2, 60).lineBetween(W / 2, 0, W / 2, H);
    this.add.rectangle(0, 0, W, H, 0x1b1420, 0.72).setOrigin(0);
  }
  private clear() { this.layer.forEach(o => o.destroy()); this.layer = []; this.texts = []; this.items = []; this.onPick = null; }
  private keep<T extends Phaser.GameObjects.GameObject>(o: T) { this.layer.push(o); return o; }

  // ───────────────────────── menus
  private menu(title: string, sub: string, items: string[], pick: (o: string) => void) {
    this.clear(); this.mode = 'menu';
    this.keep(this.add.text(W / 2, 40, tr(title), txt(16, { color: '#f2c94c' })).setOrigin(0.5).setShadow(2, 2, '#c23b3b', 0, false, true));
    if (sub) this.keep(this.add.text(W / 2, 66, sub, txt(8, { color: '#cfc6b8', align: 'center', wordWrap: { width: 420 } })).setOrigin(0.5));
    this.items = items; this.sel = 0; this.onPick = pick;
    this.texts = items.map((_, i) => this.keep(this.add.text(W / 2, 110 + i * 18, '', txt(8, { color: '#f4f0e8' })).setOrigin(0.5)));
    this.renderMenu();
  }
  private renderMenu() {
    this.texts.forEach((t, i) => {
      const o = tr(this.items[i]), on = i === this.sel;
      t.setText(on ? (isAr() ? `◀ ${o} ▶` : `▶ ${o} ◀`) : o).setColor(on ? '#f2c94c' : '#f4f0e8');
    });
  }
  private hub() {
    const cont = this.st && this.st.round < 4;
    this.menu('THE CUP', tr('Seven grades. One team of teachers. One trophy.'),
      [...(cont ? ['CONTINUE THE CUP'] : []), 'NEW CUP', 'FRIENDLY MATCH', 'BACK TO TITLE'], (o) => {
        if (o === 'CONTINUE THE CUP') return this.roundStart();
        if (o === 'NEW CUP') return this.chooseDiff();
        if (o === 'FRIENDLY MATCH') return this.chooseOpponent();
        this.scene.start('title');
      });
  }
  private chooseDiff() {
    this.menu('DIFFICULTY', '', ['STORY: LOSE = REPLAY THE MATCH', 'CUP: LOSE = START AGAIN', 'BACK'], (o) => {
      if (o === 'BACK') return this.hub();
      const diff: Diff = o === 'STORY: LOSE = REPLAY THE MATCH' ? 'story' : 'cup';
      this.menu('PLAYERS', '', ['1 PLAYER', 'CO-OP: P2 IS HUSSEIN', 'BACK'], (p) => {
        if (p === 'BACK') return this.chooseDiff();
        this.st = newCup(diff, p === '1 PLAYER' ? 'solo' : 'coop' as Kind); saveCup(this.st);
        this.roundStart();
      });
    });
  }
  private chooseOpponent() {
    const ids = Object.keys(TEAMS).filter(k => k !== 'rls');
    this.menu('FRIENDLY MATCH', tr('2nd Secondary against...'), [...ids.map(k => TEAMS[k].name), 'BACK'], (o) => {
      if (o === 'BACK') return this.hub();
      this.pending = ids.find(k => TEAMS[k].name === o)!;
      this.menu('PLAYERS', '', ['1 PLAYER', 'CO-OP: P2 IS HUSSEIN', 'VERSUS: P2 IS THE OTHER TEAM', 'BACK'], (p) => {
        if (p === 'BACK') return this.chooseOpponent();
        const kind = p === '1 PLAYER' ? 'solo' : p === 'CO-OP: P2 IS HUSSEIN' ? 'coop' : 'versus';
        this.play('rls', this.pending!, kind, false, true);
      });
    });
  }

  // ───────────────────────── the cup
  private roundStart() {
    const st = this.st!;
    if (st.round >= 4) return this.trophy();
    if (st.round === 0) return this.talk(BEFORE[0], () => this.kickoff());
    this.bracket(() => this.talk(BEFORE[st.round], () => this.kickoff()));
  }
  private kickoff() {
    const [us, them] = ourMatch(this.st!)!;
    this.play(us, them, this.st!.kind, this.st!.round > 0, false);
  }
  private play(home: string, away: string, kind: string, knockout: boolean, friendly: boolean) {
    this.cameras.main.fadeOut(300, 27, 20, 32);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('match', { home, away, kind, knockout, friendly, cup: !friendly }));
  }
  private afterMatch(r: Result) {
    const st = this.st!;
    if (st.round === 0) {   // the friendly doesn't count
      st.round = 1; saveCup(st);
      return this.talk(r.won ? AFTER_WIN[0] : AFTER_WARMUP_LOSS, () => this.roundStart());
    }
    if (!r.won) {
      if (st.diff === 'cup') { const fresh = { ...st, round: 0, results: {} }; this.st = fresh; saveCup(fresh); return this.talk(AFTER_LOSS_CUP, () => this.roundStart()); }
      return this.talk(AFTER_LOSS_STORY, () => this.roundStart());
    }
    st.results[roundKeys(st.round)[0]] = r.score;
    simulateOthers(st);
    const lines = AFTER_WIN[st.round];
    st.round++; saveCup(st);
    if (st.round >= 4) return this.talk(lines, () => this.trophy());
    this.bracket(() => this.talk(lines, () => this.roundStart()), true);
  }

  // ───────────────────────── the bracket board
  private bracket(next: () => void, justPlayed = false) {
    this.clear(); this.mode = 'bracket';
    const st = this.st!, r = st.results;
    this.keep(this.add.text(W / 2, 14, `${tr('THE CUP')} · ${tr(ROUND_NAMES[Math.min(st.round, 3)])}`, txt(8, { color: '#f2c94c' })).setOrigin(0.5));
    const g = this.keep(this.add.graphics());
    const box = (x: number, y: number, key: string, w = 120) => {
      const t = teamsOf(key, r), s = r[key], win = winner(key, r);
      g.fillStyle(0x1b1420, 0.9).fillRect(x, y, w, 30).lineStyle(1, key === roundKeys(st.round)[0] ? 0xf2c94c : 0x6d5b64).strokeRect(x, y, w, 30);
      [0, 1].forEach(i => {
        const id = t?.[i], us = id === 'rls';
        const name = id ? tr(TEAMS[id].short) : '...';
        const col = !id ? '#6d5b64' : win && win !== id ? '#6d5b64' : us ? '#f2c94c' : '#f4f0e8';
        this.keep(this.add.text(x + 6, y + 8 + i * 13, name, txt(8, { color: col, rtl: false })).setOrigin(0, 0.5));
        if (s) {
          const pens = s.length === 4 ? ` (${num(s[2 + i] as number)})` : '';
          this.keep(this.add.text(x + w - 6, y + 8 + i * 13, `${num(s[i])}${pens}`, txt(8, { color: col, rtl: false })).setOrigin(1, 0.5));
        }
      });
      return { x, y, w };
    };
    const qf = [0, 1, 2, 3].map(i => box(12, 32 + i * 52, `qf${i}`));
    const sf = [0, 1].map(i => box(180, 58 + i * 104, `sf${i}`));
    const fin = box(348, 110, 'final');
    g.lineStyle(1, 0x6d5b64);
    const join = (a: { x: number; y: number; w: number }, b: { x: number; y: number }) => {
      const x1 = a.x + a.w, y1 = a.y + 15, x2 = b.x, y2 = b.y + 15, mx = (x1 + x2) / 2;
      g.lineBetween(x1, y1, mx, y1).lineBetween(mx, y1, mx, y2).lineBetween(mx, y2, x2, y2);
    };
    join(qf[0], sf[0]); join(qf[1], sf[0]); join(qf[2], sf[1]); join(qf[3], sf[1]); join(sf[0], fin); join(sf[1], fin);
    const champ = winner('final', r);
    this.keep(this.add.text(408, 160, champ ? `${tr('WINNER')}: ${tr(TEAMS[champ].short)}` : tr('THE CUP'), txt(8, { color: '#f2c94c', rtl: false })).setOrigin(0.5));
    const us = ourMatch(st);
    const prompt = justPlayed ? tr('Z: continue') : us ? `${tr('Z: play')} · ${tr(TEAMS[us[0]].short)} - ${tr(TEAMS[us[1]].short)}` : '';
    this.keep(this.add.text(W / 2, H - 12, prompt, txt(8, { color: '#cfc6b8' })).setOrigin(0.5));
    this.afterTalk = next;
    if (justPlayed) sfx.item();
  }

  // ───────────────────────── talk: a staged scene with the characters (StageScene), on top of this one
  private talk(script: Step[], then: () => void) {
    this.clear(); this.mode = 'talk';
    this.scene.launch('stage', { script });
    const stage = this.scene.get('stage');
    stage.events.once('done', () => {
      this.scene.stop('stage');
      this.cameras.main.fadeIn(200);
      music.play('stadium');
      then();
    });
  }

  // ───────────────────────── champions
  private trophy() {
    this.clear(); this.mode = 'trophy';
    voices.start(); voices.roar(); this.time.delayedCall(1800, () => voices.hussein());
    sfx.win();
    const g = this.keep(this.add.graphics());   // a simple cup shape (it's an object, not a character)
    g.fillStyle(0xf2c94c).fillRect(W / 2 - 18, 50, 36, 26).fillRect(W / 2 - 4, 76, 8, 12).fillRect(W / 2 - 14, 88, 28, 6);
    g.lineStyle(3, 0xf2c94c).strokeCircle(W / 2 - 20, 60, 7).strokeCircle(W / 2 + 20, 60, 7);
    this.keep(this.add.particles(W / 2, 64, 'sparkle', { x: { min: -30, max: 30 }, y: { min: -20, max: 20 }, scale: { start: 2, end: 0 }, lifespan: 900, frequency: 120 }));
    this.keep(this.add.text(W / 2, 118, tr('CHAMPIONS'), txt(16, { color: '#f2c94c' })).setOrigin(0.5).setShadow(2, 2, '#c23b3b', 0, false, true));
    this.keep(this.add.text(W / 2, 140, tr('2nd Secondary · Rosetta Language School Cup'), txt(8, { color: '#f4f0e8' })).setOrigin(0.5));
    const team = ['fb_hussein', 'fb_warshan', 'elrediny', 'fb_karim', 'fb_shazly', 'mostafa', 'hefny'];
    team.forEach((k, i) => {
      const s = this.keep(this.add.sprite(W / 2 - 96 + i * 32, 200, k, 0).setScale(2));
      this.tweens.add({ targets: s, y: 190, yoyo: true, repeat: -1, duration: 300 + (i % 3) * 60, delay: i * 70 });
    });
    this.keep(this.add.text(W / 2, H - 12, tr('Z: back'), txt(8, { color: '#cfc6b8' })).setOrigin(0.5));
  }

  // ───────────────────────── input (event-driven)
  private onKey(k: string) {
    const ok = k === 'z' || k === 'enter' || k === ' ', back = k === 'x' || k === 'escape';
    if (this.mode === 'menu') {
      if (k === 'arrowup' || k === 'w') { this.sel = (this.sel + this.items.length - 1) % this.items.length; sfx.move(); this.renderMenu(); }
      else if (k === 'arrowdown' || k === 's') { this.sel = (this.sel + 1) % this.items.length; sfx.move(); this.renderMenu(); }
      else if (ok && this.onPick) { sfx.select(); this.onPick(this.items[this.sel]); }
      else if (back && this.items.includes('BACK')) { sfx.back(); this.onPick?.('BACK'); }
      return;
    }
    if (this.mode === 'talk') return;   // the stage scene has the keys
    if (this.mode === 'bracket' && ok) { sfx.select(); const f = this.afterTalk; this.afterTalk = null; f?.(); return; }
    if (this.mode === 'bracket' && back) { sfx.back(); this.hub(); return; }
    if (this.mode === 'trophy' && (ok || back)) { voices.stop(); this.hub(); }
  }
}

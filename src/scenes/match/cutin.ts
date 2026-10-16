import * as Phaser from 'phaser';
import { W, H } from '../../config';
import { sfx, tone, sample } from '../../systems/sfx';
import { tr, txt, isAr } from '../../systems/i18n';

// Anime cut-ins for the football season (Blue Lock / Inazuma Eleven grammar):
//   1. letterbox bars + the world dims (input is frozen: the match is paused while one plays)
//   2. EYES: a thin panel, the face blown up to just the eyes, the inner monologue typed under it
//   3. the MOVE: a slanted band in the team colour, speed lines rushing in, the player huge, the
//      move's name slammed in on an IMPACT FRAME (one inverted black/white flash + shake + bass hit)
//   4. a fast wipe out, then the AI plays the move (MatchScene adds a short slow-motion after it)
// A DUEL variant splits the screen diagonally: attacker vs defender, "VS" in the middle.
// Every piece is scroll-fixed, depth 3000+, and destroyed at the end.

export interface Actor { sprite: string; color: number; name: string }
const D = 3000;
const v2 = (pts: number[][]) => pts.map(([x, y]) => new Phaser.Math.Vector2(x, y));

function hit(heavy = true) {
  if (!sample('impact', heavy ? 0.7 : 0.45)) sfx.hit();
  if (heavy && !sample('boom', 0.55)) tone(70, 0.4, 'sine', 0.3, 35);
}
function whoosh() { if (!sample('whoosh', 0.5)) tone(180, 0.35, 'sawtooth', 0.05, 1400); }

/** a face image if the character has one (16x16 portrait), else the sprite's front frame */
function bigHead(s: Phaser.Scene, sprite: string, x: number, y: number, scale: number) {
  return s.textures.exists(`${sprite}_face`)
    ? s.add.image(x, y, `${sprite}_face`).setScale(scale)
    : s.add.sprite(x, y, sprite, 0).setScale(scale).setCrop(0, 0, 16, 16);
}

function speedLines(s: Phaser.Scene, cx: number, cy: number, color = 0xffffff) {
  const g = s.add.graphics();
  const draw = () => {
    g.clear();
    for (let i = 0; i < 50; i++) {
      const a = Math.random() * Math.PI * 2, r0 = 50 + Math.random() * 70, r1 = r0 + 90 + Math.random() * 240;
      g.lineStyle(Math.random() < 0.3 ? 3 : 1, color, 0.3 + Math.random() * 0.45);
      g.lineBetween(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0, cx + Math.cos(a) * r1, cy + Math.sin(a) * r1);
    }
  };
  draw();
  const ev = s.time.addEvent({ delay: 45, loop: true, callback: draw });
  return { g, stop: () => ev.remove() };
}

/** a typewriter line (a few characters per frame), resolves when done */
function typeLine(s: Phaser.Scene, t: Phaser.GameObjects.Text, line: string, cps = 60) {
  let i = 0;
  const ev = s.time.addEvent({ delay: 1000 / cps, loop: true, callback: () => { i++; t.setText(line.slice(0, i)); if (i >= line.length) ev.remove(); } });
}

function letterbox(s: Phaser.Scene, c: Phaser.GameObjects.Container) {
  const top = s.add.rectangle(0, -24, W, 24, 0x000000).setOrigin(0), bot = s.add.rectangle(0, H, W, 24, 0x000000).setOrigin(0);
  c.add([top, bot]);
  s.tweens.add({ targets: top, y: 0, duration: 160 }); s.tweens.add({ targets: bot, y: H - 24, duration: 160 });
  return [top, bot];
}

/** the impact frame: a white flash, then a black flash, then gone (two frames each), with a shake */
function impactFrame(s: Phaser.Scene, c: Phaser.GameObjects.Container, heavy = true) {
  const f = s.add.rectangle(0, 0, W, H, 0xffffff, 1).setOrigin(0).setBlendMode(Phaser.BlendModes.DIFFERENCE);
  c.add(f);
  s.time.delayedCall(40, () => f.setFillStyle(0x000000, 0.0));
  s.time.delayedCall(70, () => f.setFillStyle(0xffffff, 0.6).setBlendMode(Phaser.BlendModes.NORMAL));
  s.tweens.add({ targets: f, alpha: 0, delay: 90, duration: 110 });
  s.cameras.main.shake(heavy ? 220 : 120, heavy ? 0.008 : 0.004);
  hit(heavy);
}

/**
 * A signature move. `foe` makes it a duel (tackles, saves): attacker and defender face off.
 * `quick` = a shorter version (no eyes panel) so the many small moves don't drag.
 */
export function specialCutin(s: Phaser.Scene, o: { hero: Actor; move: string; line: string; foe?: Actor; quick?: boolean }, done: () => void) {
  const c = s.add.container(0, 0).setScrollFactor(0).setDepth(D);
  const dark = s.add.rectangle(0, 0, W, H, 0x000000, 0).setOrigin(0);
  c.add(dark);
  s.tweens.add({ targets: dark, fillAlpha: 0.7, duration: 140 });
  letterbox(s, c);
  whoosh();
  let t = 0;
  // ── beat 1: the eyes and the inner voice
  if (!o.quick) {
    const strip = s.add.rectangle(0, H / 2 - 30, W, 60, o.hero.color).setOrigin(0, 0.5);
    const shade = s.add.rectangle(0, H / 2 - 30, W, 60, 0x000000, 0.45).setOrigin(0, 0.5);
    const eyes = bigHead(s, o.hero.sprite, W / 2, H / 2 - 30, 14).setOrigin(0.5, 7 / 16);
    if (eyes instanceof Phaser.GameObjects.Image) eyes.setCrop(0, 5, 16, 4);
    const glow = s.add.rectangle(0, H / 2 - 30, W, 60, 0xffffff, 0).setOrigin(0, 0.5);
    const mono = s.add.text(W / 2, H / 2 + 22, '', txt(8, { color: '#ffffff', align: 'center', wordWrap: { width: W - 60 } })).setOrigin(0.5, 0).setStroke('#000000', 4);
    c.add([strip, shade, eyes, glow, mono]);
    strip.scaleY = 0; shade.scaleY = 0; eyes.setAlpha(0);
    s.tweens.add({ targets: [strip, shade], scaleY: 1, duration: 140, ease: 'Cubic.out' });
    s.tweens.add({ targets: eyes, alpha: 1, x: { from: W / 2 + 30, to: W / 2 }, duration: 260 });
    s.time.delayedCall(260, () => { glow.setFillStyle(0xffffff, 0.8); s.tweens.add({ targets: glow, fillAlpha: 0, duration: 200 }); tone(1800, 0.12, 'sine', 0.05, 2600); });
    typeLine(s, mono, `"${tr(o.line)}"`);
    t = 1250;
    s.time.delayedCall(t, () => { strip.destroy(); shade.destroy(); eyes.destroy(); glow.destroy(); mono.destroy(); whoosh(); });
  }
  // ── beat 2: the move
  s.time.delayedCall(t, () => {
    const band = s.add.graphics();
    const lines = speedLines(s, o.foe ? W / 2 : 130, 140);
    let heroImg: Phaser.GameObjects.Image | Phaser.GameObjects.Sprite, foeImg: Phaser.GameObjects.GameObject | null = null;
    if (o.foe) {
      // duel: diagonal split, attacker (foe) top-left in his colour, our hero bottom-right
      band.fillStyle(o.foe.color).fillPoints(v2([[0, 24], [W, 24], [0, H - 24]]), true);
      band.fillStyle(o.hero.color).fillPoints(v2([[W, 24], [W, H - 24], [0, H - 24]]), true);
      band.fillStyle(0x000000, 0.35).fillRect(0, 24, W, H - 48);
      band.lineStyle(4, 0xffffff).lineBetween(W + 10, 14, -10, H - 14);
      foeImg = bigHead(s, o.foe.sprite, -100, 92, 5);
      heroImg = bigHead(s, o.hero.sprite, W + 100, 178, 5).setFlipX(true);
      c.add([band, lines.g, foeImg, heroImg]);
      s.tweens.add({ targets: foeImg, x: 110, duration: 220, ease: 'Back.out' });
      s.tweens.add({ targets: heroImg, x: W - 110, duration: 220, ease: 'Back.out' });
      const vs = s.add.text(W / 2, H / 2, 'VS', txt(16, { color: '#f2c94c', rtl: false })).setOrigin(0.5).setStroke('#1b1420', 6).setScale(3).setAlpha(0);
      c.add(vs);
      s.time.delayedCall(200, () => { vs.setAlpha(1); s.tweens.add({ targets: vs, scale: 1.6, duration: 160, ease: 'Back.out' }); if (!sample('slam', 0.5)) sfx.bump(); });
    } else {
      band.fillStyle(0xffffff).fillPoints(v2([[-20, 58], [W + 20, 26], [W + 20, 214], [-20, 246]]), true);
      band.fillStyle(o.hero.color).fillPoints(v2([[-20, 64], [W + 20, 32], [W + 20, 208], [-20, 240]]), true);
      band.fillStyle(0x1b1420, 0.35).fillPoints(v2([[-20, 64], [W + 20, 32], [W + 20, 208], [-20, 240]]), true);
      // halftone dots in the band, manga style
      band.fillStyle(0xffffff, 0.12);
      for (let y = 40; y < 240; y += 8) for (let x = (y / 8) % 2 ? 4 : 0; x < W; x += 8) band.fillCircle(x, y, 1.2);
      heroImg = bigHead(s, o.hero.sprite, -120, 140, 6);
      c.add([band, lines.g, heroImg]);
      band.x = -W;
      s.tweens.add({ targets: band, x: 0, duration: 200, ease: 'Cubic.out' });
      s.tweens.add({ targets: heroImg, x: 130, duration: 260, delay: 60, ease: 'Back.out' });
      // afterimages trailing the hero in
      for (let i = 1; i <= 3; i++) {
        const ghost = bigHead(s, o.hero.sprite, -120, 140, 6).setAlpha(0.25 / i);
        c.addAt(ghost, c.getIndex(heroImg));
        s.tweens.add({ targets: ghost, x: 130 - i * 26, duration: 260, delay: 60, ease: 'Back.out' });
      }
    }
    const nameX = o.foe ? W / 2 : isAr() ? W - 24 : W - 24;
    const name = s.add.text(nameX, o.foe ? H / 2 + 46 : 112, tr(o.move), txt(16, { color: '#ffffff', align: 'center' }))
      .setOrigin(o.foe ? 0.5 : 1, 0.5).setAlpha(0).setStroke('#1b1420', 6);
    const who = s.add.text(nameX, o.foe ? H / 2 + 70 : 146, tr(o.hero.name), txt(8, { color: '#f2c94c' })).setOrigin(o.foe ? 0.5 : 1, 0.5).setAlpha(0).setStroke('#1b1420', 4);
    c.add([name, who]);
    if (name.width > W - 200 && !o.foe) name.setScale((W - 200) / name.width);
    const base = name.scale;
    s.time.delayedCall(o.foe ? 420 : 320, () => {
      impactFrame(s, c);
      name.setAlpha(1).setScale(base * 1.8);
      s.tweens.add({ targets: name, scale: base, duration: 150, ease: 'Back.out' });
      s.tweens.add({ targets: who, alpha: 1, duration: 200, delay: 100 });
    });
    // ── beat 3: out
    s.time.delayedCall(o.quick ? 1150 : 1500, () => {
      whoosh();
      s.tweens.add({ targets: c.list.filter(x => x !== dark), x: `+=${W}`, duration: 200, ease: 'Cubic.in' });
      s.tweens.add({ targets: dark, fillAlpha: 0, duration: 240, onComplete: () => { lines.stop(); c.destroy(); done(); } });
    });
  });
}

/** GOAL: the scorer fills the screen, "GOAL!" on an impact frame. ~1.4 s */
export function goalCutin(s: Phaser.Scene, o: { hero: Actor; big: string; small: string }, done: () => void) {
  const c = s.add.container(0, 0).setScrollFactor(0).setDepth(D);
  const bg = s.add.rectangle(0, 0, W, H, o.hero.color, 0.0).setOrigin(0);
  const lines = speedLines(s, W / 2, H / 2);
  lines.g.setAlpha(0);
  const head = bigHead(s, o.hero.sprite, W / 2, H / 2 - 10, 9).setAlpha(0);
  const big = s.add.text(W / 2, H / 2 + 62, o.big, txt(16, { color: '#f2c94c' })).setOrigin(0.5).setStroke('#1b1420', 8).setAlpha(0);
  const small = s.add.text(W / 2, H / 2 + 92, o.small, txt(8, { color: '#ffffff' })).setOrigin(0.5).setStroke('#1b1420', 4).setAlpha(0);
  c.add([bg, lines.g, head, big, small]);
  letterbox(s, c);
  s.tweens.add({ targets: bg, fillAlpha: 0.85, duration: 120 });
  s.tweens.add({ targets: lines.g, alpha: 1, duration: 120 });
  s.tweens.add({ targets: head, alpha: 1, scale: { from: 14, to: 9 }, duration: 220, ease: 'Cubic.out' });
  s.time.delayedCall(200, () => {
    impactFrame(s, c);
    big.setAlpha(1).setScale(3); s.tweens.add({ targets: big, scale: 2, duration: 160, ease: 'Back.out' });
    s.tweens.add({ targets: small, alpha: 1, duration: 200, delay: 120 });
  });
  s.time.delayedCall(1450, () => {
    s.tweens.add({ targets: c, alpha: 0, duration: 220, onComplete: () => { lines.stop(); c.destroy(); done(); } });
  });
}

/**
 * A story moment in the middle of a match: a character's face slides in on a panel and says
 * something (the referee's card, Hussein's knee, Hefny with the ice). `card` shows a yellow card.
 */
export function talkCutin(s: Phaser.Scene, lines: { who: Actor; line: string; card?: boolean }[], done: () => void) {
  const c = s.add.container(0, 0).setScrollFactor(0).setDepth(D);
  const dark = s.add.rectangle(0, 0, W, H, 0x000000, 0).setOrigin(0);
  c.add(dark);
  s.tweens.add({ targets: dark, fillAlpha: 0.55, duration: 140 });
  letterbox(s, c);
  let i = 0;
  const next = () => {
    if (i >= lines.length) {
      s.tweens.add({ targets: c, alpha: 0, duration: 200, onComplete: () => { c.destroy(); done(); } });
      return;
    }
    const L = lines[i++], left = i % 2 === 1;
    const panel = s.add.container(left ? -W : W, 0);
    const g = s.add.graphics();
    const y0 = 70, y1 = 200;
    g.fillStyle(0xffffff).fillPoints(v2(left ? [[0, y0 - 4], [W - 40, y0 - 14], [W - 20, y1 + 4], [0, y1 + 14]] : [[40, y0 - 14], [W, y0 - 4], [W, y1 + 14], [20, y1 + 4]]), true);
    g.fillStyle(L.who.color).fillPoints(v2(left ? [[0, y0], [W - 44, y0 - 10], [W - 26, y1], [0, y1 + 10]] : [[44, y0 - 10], [W, y0], [W, y1 + 10], [26, y1]]), true);
    g.fillStyle(0x1b1420, 0.45).fillRect(0, y0, W, y1 - y0);
    const hx = left ? 90 : W - 90;
    const head = bigHead(s, L.who.sprite, hx, 135, 6).setFlipX(!left);
    const nm = s.add.text(left ? 170 : W - 170, 98, tr(L.who.name), txt(8, { color: '#f2c94c' })).setOrigin(left ? 0 : 1, 0.5).setStroke('#1b1420', 4);
    const say = s.add.text(left ? 170 : W - 170, 116, '', txt(8, { color: '#ffffff', wordWrap: { width: 250 }, align: left ? 'left' : 'right' })).setOrigin(left ? 0 : 1, 0).setStroke('#1b1420', 3);
    if (isAr()) { nm.setOrigin(left ? 0 : 1, 0.5); }
    panel.add([g, head, nm, say]);
    if (L.card) {
      const card = s.add.rectangle(hx + (left ? 52 : -52), 120, 22, 30, 0xf2c94c).setStrokeStyle(2, 0x1b1420).setAngle(left ? 12 : -12);
      panel.add(card);
      s.tweens.add({ targets: card, y: 112, angle: left ? 4 : -4, duration: 300, delay: 200, ease: 'Back.out' });
    }
    c.add(panel);
    whoosh();
    s.tweens.add({ targets: panel, x: 0, duration: 200, ease: 'Cubic.out' });
    s.time.delayedCall(180, () => { typeLine(s, say, tr(L.line), 50); sfx.blip(); });
    const ms = 900 + tr(L.line).length * 28;
    s.time.delayedCall(ms, () => s.tweens.add({ targets: panel, x: left ? W : -W, duration: 180, ease: 'Cubic.in', onComplete: () => { panel.destroy(); next(); } }));
  };
  s.time.delayedCall(150, next);
}

/** before kick-off: the two teams, VS, the two stars eye to eye */
export function vsIntro(s: Phaser.Scene, home: { name: string; color: number; sprites: string[]; star: string }, away: { name: string; color: number; sprites: string[]; star: string }, done: () => void) {
  const c = s.add.container(0, 0).setScrollFactor(0).setDepth(D);
  const g = s.add.graphics();
  g.fillStyle(home.color).fillPoints(v2([[0, 0], [W / 2 + 30, 0], [W / 2 - 30, H], [0, H]]), true);
  g.fillStyle(away.color).fillPoints(v2([[W / 2 + 30, 0], [W, 0], [W, H], [W / 2 - 30, H]]), true);
  g.fillStyle(0x000000, 0.4).fillRect(0, 0, W, H);
  g.lineStyle(5, 0xffffff).lineBetween(W / 2 + 30, 0, W / 2 - 30, H);
  c.add(g);
  const lines = speedLines(s, W / 2, H / 2);
  c.add(lines.g);
  // the stars: eye strips, left and right
  const eyesA = bigHead(s, home.star, -80, 70, 9), eyesB = bigHead(s, away.star, W + 80, 70, 9).setFlipX(true);
  for (const e of [eyesA, eyesB]) if (e instanceof Phaser.GameObjects.Image) e.setOrigin(0.5, 7 / 16).setCrop(0, 5, 16, 4);
  c.add([eyesA, eyesB]);
  s.tweens.add({ targets: eyesA, x: W / 4, duration: 260, ease: 'Cubic.out' });
  s.tweens.add({ targets: eyesB, x: W * 3 / 4, duration: 260, ease: 'Cubic.out' });
  // the line-ups
  const row = (arr: string[], left: boolean) => arr.forEach((k, i) => {
    const x = left ? 40 + i * 42 : W - 40 - i * 42;
    const spr = s.add.sprite(left ? -40 : W + 40, 200, k, 0).setScale(3).setOrigin(0.5, 1);
    c.add(spr);
    s.tweens.add({ targets: spr, x, duration: 260, delay: 200 + i * 70, ease: 'Back.out' });
  });
  row(home.sprites, true); row(away.sprites, false);
  const nA = s.add.text(W / 4 - 20, 126, tr(home.name), txt(8, { color: '#ffffff' })).setOrigin(0.5).setStroke('#1b1420', 4);
  const nB = s.add.text(W * 3 / 4 + 20, 126, tr(away.name), txt(8, { color: '#ffffff' })).setOrigin(0.5).setStroke('#1b1420', 4);
  const vs = s.add.text(W / 2, H / 2 - 6, 'VS', txt(16, { color: '#f2c94c', rtl: false })).setOrigin(0.5).setStroke('#1b1420', 8).setAlpha(0);
  c.add([nA, nB, vs]);
  letterbox(s, c);
  whoosh();
  s.time.delayedCall(650, () => { vs.setAlpha(1).setScale(4); s.tweens.add({ targets: vs, scale: 2.2, duration: 160, ease: 'Back.out' }); impactFrame(s, c); });
  s.time.delayedCall(2300, () => {
    whoosh();
    s.tweens.add({ targets: c, alpha: 0, duration: 260, onComplete: () => { lines.stop(); c.destroy(); done(); } });
  });
}

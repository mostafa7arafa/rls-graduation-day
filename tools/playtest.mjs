// Automated playtest: drives the game with keypresses and saves screenshots + console errors.
// Usage: node tools/playtest.mjs <scenario> [url]   (dev server must be running: npm run dev)
//        LANG=ar node tools/playtest.mjs full       -> same run in Egyptian Arabic (missing translations show as warnings)
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';

const scenario = process.argv[2] ?? 'smoke';
const url = process.argv[3] ?? 'http://localhost:5173';
const lang = process.env.LANG === 'ar' ? 'ar' : 'en';
const out = `tools/preview/playtest/${scenario}${lang === 'ar' ? '-ar' : ''}`;
mkdirSync(out, { recursive: true });

const browser = await chromium.launch({ executablePath: process.env.CHROME ?? '/usr/bin/chromium', args: ['--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
const errors = [];
page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errors.push(`[${m.type()}] ${m.text()}`); });
page.on('pageerror', e => errors.push(`[pageerror] ${e.message}`));

let n = 0;
const shot = async (name) => page.screenshot({ path: `${out}/${String(++n).padStart(2, '0')}-${name}.png` });
const wait = (ms) => page.waitForTimeout(ms);
const tap = async (key, times = 1, gap = 120) => { for (let i = 0; i < times; i++) { await page.keyboard.press(key); await wait(gap); } };
const hold = async (key, ms) => { await page.keyboard.down(key); await wait(ms); await page.keyboard.up(key); };
// advance dialogue: press Z until no dialogue is open (max n presses)
// (cutscenes pause between lines, so only stop once the dialogue box has stayed closed for a moment)
const advance = async (max = 30) => {
  let idle = 0;
  for (let i = 0; i < max * 3 && idle < 3; i++) {
    const busy = await page.evaluate(() => window.game?.scene.getScene('ui')?.busy ?? false);
    if (!busy) { idle++; await wait(400); continue; }
    idle = 0;
    await tap('z', 1, 60); await wait(450); await tap('z', 1, 60);
  }
};
const teleport = (tx, ty, dir = 'up') => page.evaluate(([x, y, d]) => {
  const w = window.game.scene.getScene('world'); const L = w.party[w.order[0]];
  L.setPosition(x * 16 + 8, y * 16 + 16 - 8 - 4); L.setData('dir', d); w.trail.push({ x: L.x, y: L.y });
}, [tx, ty, dir]);
const state = () => page.evaluate(() => JSON.parse(localStorage.getItem('rls-save') || '{}'));

// a fake controller for the 'pad' scenario: window.__pad.buttons[i] / axes are set from the test
if (scenario === 'pad') await page.addInitScript(() => {
  window.__pad = { id: 'Xbox Wireless Controller (STANDARD GAMEPAD)', index: 0, connected: true, mapping: 'standard', axes: [0, 0, 0, 0],
    buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })) };
  navigator.getGamepads = () => [window.__pad];
});
await page.goto(url);
await page.evaluate((l) => { localStorage.clear(); localStorage.setItem('rls-lang', l); }, lang);
await page.reload();
await wait(1500);
await shot('title');

const startBattle = () => page.evaluate(() => {
  const w = window.game.scene.getScene('world'); w.scene.pause();
  w.scene.launch('battle', { enemy: 'hassan', onEnd: (won) => { window.__battle = won; w.scene.resume(); } });
});
const battle = (fn) => page.evaluate(fn);
const phase = () => page.evaluate(() => window.game.scene.getScene('battle').phase);
const pressUntilPhase = async (want, max = 30) => { for (let i = 0; i < max && (await phase()) !== want; i++) { await tap('z', 1, 60); await wait(350); } };

// start from a save: flags/items/position, then CONTINUE from the title screen
const fromSave = async (st) => {
  await page.evaluate(([s, l]) => { localStorage.clear(); localStorage.setItem('rls-lang', l); localStorage.setItem('rls-save', JSON.stringify(s)); }, [st, lang]);
  await page.reload(); await wait(1500); await tap('Enter'); await wait(1500);
};
const save = (flags, items, map, x, y, dir = 'down', leader = 'mostafa') =>
  ({ version: 2, flags: { intro_done: true, ...flags }, items, leader, map, x: x * 16 + 8, y: y * 16 + 12, dir });
const CH1_DONE = { gate_seen: true, talked_abdel: true, met_abdel: true, hint_perfume: true, hassan_beaten: true, got_sandwich: true };
const sceneActive = (k) => page.evaluate((k) => window.game.scene.isActive(k), k);

const CH2_DONE = { ...CH1_DONE, met_nasser: true, sig_nasser: true, stairs_open: true };
const CH3_DONE = { ...CH2_DONE, chapter: 4, met_yasser: true, sig_yasser: true };
const CH4_DONE = { ...CH3_DONE, chapter: 5, sig_lab: true };
const CH5_DONE = { ...CH4_DONE, chapter: 6, met_abdelkareem: true, sig_abdelkareem: true };
const CH6_DONE = { ...CH5_DONE, chapter: 7, met_amr: true, sig_amr: true, finale_started: true };
// play an encounter until its scene closes: `step` runs each tick (in Node), z advances text otherwise
const playEncounter = async (key, step, max = 900) => {
  for (let i = 0; i < max && await sceneActive(key); i++) { if (!(await step())) { await tap('z', 1, 40); await wait(220); } }
};
const talkUntilBattle = async (key) => { for (let i = 0; i < 40 && !(await sceneActive(key)); i++) { await tap('z', 1, 60); await wait(350); } await wait(900); };

const pad = async (i, ms = 120) => { // tap a controller button
  await page.evaluate((i) => { window.__pad.buttons[i].pressed = true; }, i); await wait(ms);
  await page.evaluate((i) => { window.__pad.buttons[i].pressed = false; }, i); await wait(120);
};
const stick = async (x, y, ms) => { await page.evaluate(([x, y]) => { window.__pad.axes[0] = x; window.__pad.axes[1] = y; }, [x, y]); await wait(ms); await page.evaluate(() => { window.__pad.axes[0] = 0; window.__pad.axes[1] = 0; }); await wait(150); };

const scenarios = {
  async pad() {
    await pad(0); await wait(1500);                        // A starts a new game from the title
    for (let i = 0; i < 40 && await page.evaluate(() => window.game.scene.getScene('ui')?.busy); i++) await pad(0, 80);  // A advances the intro
    await wait(600); await shot('pad-world');
    const before = await page.evaluate(() => { const w = window.game.scene.getScene('world'); return w.party[w.order[0]].y; });
    await stick(0, 1, 900);                                // left stick down walks
    const after = await page.evaluate(() => { const w = window.game.scene.getScene('world'); return w.party[w.order[0]].y; });
    await pad(5);                                          // RB swaps leader
    const leader = await page.evaluate(() => window.game.scene.getScene('world').order[0]);
    await shot('pad-swap');
    const hint = await page.evaluate(() => window.game.scene.getScene('ui').hint.text);
    console.log('pad: walked', Math.round(after - before), 'px · leader after RB:', leader, '· hint:', hint);
  },

  async ch3() {
    await fromSave(save({ ...CH2_DONE, chapter: 2 }, ['key', 'form'], 'ground', 4, 12, 'left'));
    await hold('ArrowLeft', 700); await wait(2500); await shot('ch3-card');
    await advance(20); await shot('first-floor-ibrahim');
    await teleport(5, 4, 'up'); await wait(300); await tap('z'); await wait(1200); await shot('yasser-talk');
    await talkUntilBattle('spelling'); await shot('spelling-intro');
    let shotTaken = false;
    await playEncounter('spelling', async () => {
      const r = await page.evaluate(() => { const s = window.game.scene.getScene('spelling'); if (!s.playing) return false;
        const d = s.drops.find(d => d.ok && d.t.y > 90); if (d) s.keeper.x = d.t.x; return true; });
      if (r && !shotTaken) { await wait(1500); await shot('spelling-rain'); shotTaken = true; }
      if (r) { await wait(80); return true; } return false;
    });
    await wait(800); await shot('after-spelling'); await advance(40); await wait(500);
    const st = await state(); console.log('ch3:', st.flags.sig_yasser, 'chapter', st.flags.chapter);
    await shot('ch4-start');
  },
  async ch4() {
    await fromSave(save(CH3_DONE, ['key', 'form'], 'first', 20, 4, 'up'));
    await teleport(18, 3, 'up'); await wait(300); await tap('z'); await wait(1200); await shot('lab-talk');
    await talkUntilBattle('lab'); await shot('lab-intro');
    const rounds = await page.evaluate(() => window.game.scene.getScene('lab').constructor.ROUNDS.map(r => r.want));
    let lastRi = -1;
    await playEncounter('lab', async () => {
      const st = await page.evaluate(() => { const s = window.game.scene.getScene('lab'); return { brewing: s.pick.visible, ri: s.ri, sel: s.sel }; });
      if (!st.brewing || st.ri === lastRi) return false;
      lastRi = st.ri;
      for (const letter of rounds[st.ri].split('')) {
        const target = ['R', 'B', 'Y', 'W'].indexOf(letter);
        const cur = await page.evaluate(() => window.game.scene.getScene('lab').sel);
        await tap('ArrowRight', (target - cur + 6) % 6, 90); await tap('z', 1, 120);
      }
      if (st.ri === 0) await shot('lab-brewing');
      const cur = await page.evaluate(() => window.game.scene.getScene('lab').sel);
      await tap('ArrowRight', (4 - cur + 6) % 6, 90); await tap('z'); await wait(600);
      return true;
    });
    await wait(800); await shot('after-lab'); await advance(40); await wait(600);
    const st = await state(); console.log('ch4:', st.flags.sig_lab, 'chapter', st.flags.chapter, 'solo', st.flags.solo);
    await shot('ch5-start');
  },
  async ch5() {
    await fromSave(save({ ...CH4_DONE, met_abdelkareem: true, sandwiches: 6 }, ['key', 'form'], 'first', 31, 4, 'up'));
    await tap('z'); await wait(800); await talkUntilBattle('haggle'); await shot('haggle-intro');
    for (let i = 0; i < 4; i++) { await tap('z', 1, 60); await wait(400); }
    const pickOption = async (idx) => { // wait for the menu, then pick
      for (let i = 0; i < 30; i++) { if (await page.evaluate(() => window.game.scene.getScene('haggle').cursor?.visible)) break; await tap('z', 1, 40); await wait(300); }
      if (idx >= 2) await tap('ArrowDown'); if (idx % 2) await tap('ArrowRight'); await tap('z'); await wait(400);
    };
    await pickOption(0); await pickOption(0); await shot('haggle-math');
    await pickOption(2); await pickOption(2); await shot('haggle-rage');
    await pickOption(3);
    for (let i = 0; i < 30; i++) { if (await page.evaluate(() => window.game.scene.getScene('haggle').cursor?.visible)) break; await wait(200); }
    const price = await page.evaluate(() => window.game.scene.getScene('haggle').price);
    await tap('ArrowRight', price - 1, 90); await shot('haggle-offer'); await tap('z');
    await playEncounter('haggle', async () => false, 60);
    await wait(800); await advance(40); await wait(600);
    const st = await state(); console.log('ch5: price', price, 'signed', st.flags.sig_abdelkareem, 'sandwiches left', st.flags.sandwiches, 'chapter', st.flags.chapter);
    await shot('ch6-start');
  },
  async ch6() {
    await fromSave(save(CH5_DONE, ['key', 'form'], 'ground', 28, 24, 'down'));
    await tap('z'); await wait(1000); await shot('amr-talk'); await talkUntilBattle('rhythm'); await shot('rhythm-intro');
    // an in-page bot presses each arrow when it reaches the line
    await page.evaluate(() => { window.__bot = setInterval(() => {
      const s = window.game.scene.getScene('rhythm'); if (!s || !s.scene.isActive()) return;
      const now = s.time.now;
      for (const n of s.notes) if (!n.done && Math.abs(n.at - now) < 45 && !n.sent) {
        n.sent = true; const key = ['ArrowLeft', 'ArrowDown', 'ArrowUp', 'ArrowRight'][n.lane];
        window.dispatchEvent(new KeyboardEvent('keydown', { key })); window.dispatchEvent(new KeyboardEvent('keyup', { key }));
      }
    }, 15); });
    let shotTaken = false;
    await playEncounter('rhythm', async () => {
      const playing = await page.evaluate(() => window.game.scene.getScene('rhythm').notes.length > 0);
      if (playing && !shotTaken) { await shot('rhythm-play'); shotTaken = true; }
      if (playing) { await wait(300); return true; } return false;
    });
    await page.evaluate(() => clearInterval(window.__bot));
    await wait(800); await advance(40); await wait(600);
    const st = await state(); console.log('ch6: signed', st.flags.sig_amr, 'chapter', st.flags.chapter);
    await shot('ch7-start');
  },
  async ch7() {
    await fromSave(save(CH6_DONE, ['key', 'form'], 'ground', 31, 29, 'right'));
    await tap('z'); await wait(1000); await shot('karim-talk'); await talkUntilBattle('penalty'); await shot('penalty-intro');
    // in-page bot: dive toward the glint, and lock aim/power at good moments
    await page.evaluate(() => { window.__bot = setInterval(() => {
      const s = window.game.scene.getScene('penalty'); if (!s || !s.scene.isActive()) return;
      const press = (key) => { window.dispatchEvent(new KeyboardEvent('keydown', { key })); window.dispatchEvent(new KeyboardEvent('keyup', { key })); };
      if (s.glint.visible && !s.__dived) { s.__dived = true; const dx = s.glint.x - 240; press(dx < -5 ? 'ArrowLeft' : dx > 5 ? 'ArrowRight' : 'ArrowUp'); }
      if (!s.glint.visible && s.__dived && s.kicker.texture.key !== 'karim') s.__dived = false;
      if (s.reticle.visible && !s.power.visible && !s.__aimed) { const x = s.reticle.x; if (x < 175 || x > 305) { s.__aimed = true; press('z'); } }
      if (s.power.visible && s.__aimed && s.power.scaleY > 0.5 && s.power.scaleY < 0.7) { s.__aimed = false; press('z'); }
    }, 15); });
    let n = 0;
    await playEncounter('penalty', async () => {
      const st = await page.evaluate(() => { const s = window.game.scene.getScene('penalty'); return { glint: s.glint.visible, ret: s.reticle.visible }; });
      if (st.glint || st.ret) { if (n++ < 2) await shot('penalty-' + n); await wait(120); return true; }
      return false;
    }, 1500);
    await page.evaluate(() => clearInterval(window.__bot));
    await wait(800); await advance(60); await wait(600);
    const st = await state(); console.log('ch7: stamp', st.flags.sig_stamp);
    // the finale at the gate
    await teleport(27, 44, 'down'); await wait(400); await tap('z'); await wait(1500); await shot('finale-gate');
    for (let i = 0; i < 160 && !(await sceneActive('credits')); i++) {
      await tap('z', 1, 40); await wait(380);
      if (i === 30) await shot('finale-car'); if (i === 50) await shot('finale-tractor'); if (i === 70) await shot('finale-ride');
    }
    await wait(3000); await shot('credits'); await wait(8000); await shot('credits-2');
  },

  async ch2() {
    await fromSave(save({ ...CH1_DONE, chapter: 2 }, ['key'], 'ground', 21, 36, 'down'));
    await shot('ch2-start');
    await tap('z'); await wait(1200); await shot('nasser-talk'); await advance(20);
    await wait(1200); await shot('quiz-intro');
    const qs = await page.evaluate(() => window.game.scene.getScene('quiz').constructor.QUESTIONS.map(q => q.his));
    const answered = new Set(); let lifelines = 0;
    for (let i = 0; i < 400 && await sceneActive('quiz'); i++) {
      const st = await page.evaluate(() => { const q = window.game.scene.getScene('quiz'); return { idx: q.qIndex, pick: q.pick?.visible }; });
      if (st.pick && !answered.has(st.idx)) {
        if (st.idx === 0 && lifelines < 3) { // try each lifeline once on question 1
          await shot('question-1');
          await tap('ArrowDown'); await tap('ArrowDown'); await tap('ArrowRight', lifelines);
          await shot('lifeline-' + lifelines); await tap('z'); lifelines++; await wait(400);
          await advance(0); for (let k = 0; k < 6; k++) { await tap('z'); await wait(250); }
          await tap('ArrowUp'); await tap('ArrowUp'); continue;
        }
        answered.add(st.idx);
        const h = qs[st.idx];
        // cursor home is option 0: reset with up/left, then go to his answer
        await tap('ArrowUp'); await tap('ArrowLeft'); await tap('ArrowUp');
        if (await page.evaluate(() => window.game.scene.getScene('quiz').optTexts[0].style.color !== '#f2c94c')) await tap('ArrowRight');
        if (h >= 2) await tap('ArrowDown');
        if (h % 2) await tap('ArrowRight');
        if (st.idx === 3) await shot('answer-moon');
        await tap('z'); await wait(500);
      } else { await tap('z', 1, 60); await wait(300); }
    }
    await wait(1200); await shot('after-quiz'); await advance(20); await wait(600);
    const s = await state(); console.log('ch2 flags:', s.flags.sig_nasser, s.flags.stairs_open, 'items:', s.items);
    await shot('stairs-open');
    // take the stairs up and back down
    await teleport(4, 12, 'side'); await page.evaluate(() => { const w = window.game.scene.getScene('world'); w.party[w.order[0]].setFlipX(false); });
    await hold('ArrowLeft', 900); await wait(1200); await shot('first-floor');
    console.log('map after stairs:', (await state()).map);
  },

  async battle() {
    await tap('Enter'); await wait(1200); await advance();
    await page.evaluate(() => { const s = JSON.parse(localStorage.getItem('rls-save')); }); 
    await startBattle(); await wait(1000);
    await tap('z', 3, 500); await wait(300);
    await tap('ArrowRight'); await tap('z'); await wait(300); await shot('act-menu');
    await tap('ArrowDown'); await shot('act-menu-down');
    await tap('z'); await pressUntilPhase('dodge');
    await wait(1600); await shot('dodge-early');
    await battle(() => { const b = window.game.scene.getScene('battle'); b.dignity = 1; b.hurt(2); }); // force the detention path
    await wait(1800); await shot('dodge-mid');
    await wait(4000); await shot('lose');
    await wait(2000); console.log('battle result:', await page.evaluate(() => window.__battle));
  },
  async smoke() {
    await tap('Enter'); await wait(1200);
    await shot('intro');
    await tap('z'); await wait(1500); await shot('intro-line2');
    await advance(); await wait(300);
    await shot('world-start');
    await hold('ArrowDown', 900); await shot('walk-down');
    // TAB must cycle through all three friends
    const leaders = [];
    for (let i = 0; i < 3; i++) { await tap('Tab'); await wait(300); leaders.push(await page.evaluate(() => window.game.scene.getScene('world').order[0])); await shot('swap-' + leaders[i]); }
    console.log('TAB order:', leaders.join(' -> '), new Set(leaders).size === 3 ? 'OK' : 'BROKEN');
    await hold('ArrowLeft', 1200); await shot('walk-left');
  },
  async full() {
    await tap('Enter'); await wait(1200); await advance();
    // gate
    await teleport(27, 44, 'down'); await wait(400); await shot('at-gate');
    await tap('z'); await wait(1200); await shot('gate-note'); await advance();
    // Mr Abdelfattah (corridor) — stand below him, face up
    await teleport(20, 12, 'up'); await wait(400); await tap('z'); await wait(1500); await shot('abdel');
    await tap('z'); await wait(600); await shot('abdel-choice'); await tap('ArrowDown'); await tap('z'); await advance();
    // canteen sandwich
    await teleport(47, 5, 'up'); await wait(300); await tap('z'); await wait(1200); await shot('auntie'); await advance();
    // Habeba as Hussein
    await tap('2'); await teleport(7, 31, 'up'); await wait(300); await tap('z'); await wait(1600); await shot('habeba-hussein'); await advance();
    // Hassan
    await tap('1'); await teleport(7, 4, 'up'); await wait(400); await shot('classroom');
    await tap('z'); await wait(1500); await shot('hassan-talk'); await advance(15);
    await wait(800); await shot('battle-start');
    await pressUntilPhase('menu'); await wait(400); await shot('battle-menu');
    // ACT -> compliment perfume (index 3)
    const act = async (idx) => {
      await pressUntilPhase('menu');
      await page.evaluate(() => { const b = window.game.scene.getScene('battle'); b.sel = 1; });
      await tap('z'); await wait(300); await tap('ArrowDown', idx, 150); await shot('act-menu-' + idx);
      await tap('z'); for (let i = 0; i < 8; i++) { await wait(700); await tap('z'); }
    };
    await act(3); await shot('after-perfume');
    await wait(1500); await shot('dodge'); await wait(4500);
    for (let i = 0; i < 4; i++) { await tap('z'); await wait(500); }
    await act(2); await wait(6500); for (let i = 0; i < 4; i++) { await tap('z'); await wait(500); }
    await act(1); await wait(6500); for (let i = 0; i < 4; i++) { await tap('z'); await wait(500); }
    await act(0); await shot('calm-check'); await wait(6500); for (let i = 0; i < 4; i++) { await tap('z'); await wait(500); }
    await page.evaluate(() => { const b = window.game.scene.getScene('battle'); if (b.scene.isActive()) { b.calm = 100; b.refreshBars(); b.toMenu(); b.sel = 3; b.renderButtons(); } });
    await wait(400); await shot('mercy-ready'); await tap('z'); for (let i = 0; i < 6; i++) { await wait(700); await tap('z'); }
    await wait(1200); await shot('after-battle'); await advance();
    console.log('items:', (await state()).items);
    // unlock + leave
    await teleport(27, 44, 'down'); await wait(300); await tap('z'); await wait(800); await advance(); await shot('gate-open');
    await hold('ArrowDown', 1200); await wait(800); await shot('ending'); await advance(); await wait(2500); await shot('credits');
  },
};

try { await scenarios[scenario](); } catch (e) { errors.push(`[playtest] ${e.message}`); await shot('crash'); }
console.log(errors.length ? errors.join('\n') : 'no console errors');
console.log('screens in', out);
await browser.close();

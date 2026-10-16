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
const advance = async (max = 30) => {
  for (let i = 0; i < max; i++) {
    const busy = await page.evaluate(() => window.game?.scene.getScene('ui')?.busy ?? false);
    if (!busy) return;
    await tap('z', 1, 60); await wait(450); await tap('z', 1, 60);
  }
};
const teleport = (tx, ty, dir = 'up') => page.evaluate(([x, y, d]) => {
  const w = window.game.scene.getScene('world'); const L = w.party[w.order[0]];
  L.setPosition(x * 16 + 8, y * 16 + 16 - 8 - 4); L.setData('dir', d); w.trail.push({ x: L.x, y: L.y });
}, [tx, ty, dir]);
const state = () => page.evaluate(() => JSON.parse(localStorage.getItem('rls-save') || '{}'));

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

const scenarios = {
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
    await battle(() => { window.game.scene.getScene('battle').dignity = 1; }); // next hit = detention
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

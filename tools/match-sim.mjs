// Headless football: AI vs AI, many matches, no browser. Finds deadlocks and shows how a fixture balances.
// Usage: node tools/match-sim.mjs [home] [away] [matches=200] [halfSeconds=150]
//        node tools/match-sim.mjs rls teachers 300
import { build } from 'esbuild';

const [home = 'rls', away = 'teachers', n = '200', half = '150'] = process.argv.slice(2);
const out = await build({ stdin: { contents: "export * from './src/match/sim.ts'; export * from './src/match/teams.ts';", resolveDir: '.', loader: 'ts' },
  bundle: true, format: 'esm', platform: 'node', write: false });
const { Match, TEAMS } = await import('data:text/javascript;base64,' + Buffer.from(out.outputFiles[0].text).toString('base64'));

const tally = { w: 0, d: 0, l: 0, gf: 0, ga: 0, shots: [0, 0], saves: [0, 0], poss: [0, 0], stuck: 0, outs: 0, zero: 0 };
const t0 = Date.now();
for (let i = 0; i < +n; i++) {
  const m = new Match({ home: TEAMS[home], away: TEAMS[away], controls: [], halfSeconds: +half, seed: i + 1 });
  let steps = 0;
  while (m.phase !== 'full' && steps < 60 * (+half * 2 + 120)) { m.step(); steps++; }
  const [a, b] = m.score;
  tally.gf += a; tally.ga += b; a > b ? tally.w++ : a < b ? tally.l++ : tally.d++;
  if (a + b === 0) tally.zero++;
  for (const k of [0, 1]) { tally.shots[k] += m.stats.shots[k]; tally.saves[k] += m.stats.saves[k]; tally.poss[k] += m.stats.poss[k]; }
  tally.stuck += m.stats.stuck; tally.outs += m.stats.outs;
  if (m.phase !== 'full') console.log(`match ${i + 1}: never finished (phase ${m.phase})`);
}
const per = (v) => (v / +n).toFixed(1);
const possPct = (100 * tally.poss[0] / (tally.poss[0] + tally.poss[1] || 1)).toFixed(0);
console.log(`${home} vs ${away}: ${n} matches, ${half}s halves  (${((Date.now() - t0) / 1000).toFixed(1)}s)`);
console.log(`  W/D/L ${tally.w}/${tally.d}/${tally.l}   goals/match ${per(tally.gf)} - ${per(tally.ga)}   0-0 draws ${tally.zero}`);
console.log(`  shots/match ${per(tally.shots[0])} - ${per(tally.shots[1])}   keeper saves ${per(tally.saves[0])} - ${per(tally.saves[1])}   possession ${possPct}%`);
console.log(`  kick-ins/match ${per(tally.outs)}   stuck-ball nudges ${tally.stuck}`);

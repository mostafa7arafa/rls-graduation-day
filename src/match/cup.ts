// The school cup (Season 2): 8 teams (seven grades + the teachers), knockout. What really happened:
// 2nd Secondary won it and beat the teachers in the final; the semi against Saif was the hardest.
// The other teams' matches are simulated with the real match engine, but the story winners are kept.

import { Match } from './sim';
import { TEAMS } from './teams';

export type Diff = 'story' | 'cup';      // story: lose = replay the match · cup: lose = start the cup again
export type Kind = 'solo' | 'coop';
export type Score = [number, number] | [number, number, number, number];   // goals (+ penalties)
export interface CupState { v: 1; diff: Diff; kind: Kind; round: number; results: Record<string, Score> }

/** rounds: 0 warm-up friendly, 1 quarter-final, 2 semi-final, 3 final, 4 champions */
export const ROUND_NAMES = ['WARM-UP', 'QUARTER-FINAL', 'SEMI-FINAL', 'FINAL', 'CHAMPIONS'];
export const WARMUP = ['rls', 'prep2'] as const;
export const QF: [string, string][] = [['rls', 'sec1'], ['prep1', 'prep3'], ['teachers', 'prim5'], ['prim6', 'prep2']];
/** the results that must happen (whatever the dice say) */
const STORY: Record<string, string> = { qf1: 'prep1', qf2: 'teachers', sf1: 'teachers' };

/** who plays in match `key` (qf0..qf3, sf0, sf1, final) given the results so far */
export function teamsOf(key: string, r: Record<string, Score>): [string, string] | null {
  if (key.startsWith('qf')) return QF[+key[2]];
  const w = (k: string) => winner(k, r);
  if (key === 'sf0') { const a = w('qf0'), b = w('qf1'); return a && b ? [a, b] : null; }
  if (key === 'sf1') { const a = w('qf2'), b = w('qf3'); return a && b ? [a, b] : null; }
  if (key === 'final') { const a = w('sf0'), b = w('sf1'); return a && b ? [a, b] : null; }
  return null;
}
export function winner(key: string, r: Record<string, Score>): string | null {
  const s = r[key], t = teamsOf(key, r); if (!s || !t) return null;
  const [a, b, pa = 0, pb = 0] = s;
  return a > b || (a === b && pa > pb) ? t[0] : t[1];
}
/** the matches of a round (ours is always first) */
export const roundKeys = (round: number) => round === 1 ? ['qf0', 'qf1', 'qf2', 'qf3'] : round === 2 ? ['sf0', 'sf1'] : round === 3 ? ['final'] : [];
/** our match this round: [us, them] */
export function ourMatch(st: CupState): [string, string] | null {
  if (st.round === 0) return [...WARMUP];
  const k = roundKeys(st.round)[0];
  return k ? teamsOf(k, st.results) : null;
}

/** play the other matches of a round, AI vs AI, keeping the story's winners */
export function simulateOthers(st: CupState) {
  for (const key of roundKeys(st.round).slice(1)) {
    if (st.results[key]) continue;
    const [h, a] = teamsOf(key, st.results)!;
    const m = new Match({ home: TEAMS[h], away: TEAMS[a], controls: [], halfSeconds: 150, seed: (Math.random() * 1e9) | 0, knockout: true });
    for (let i = 0; i < 60 * 600 && m.phase !== 'full'; i++) { m.step(); if (m.pending) m.release(); }
    let s: Score = m.pensWinner >= 0 ? [m.score[0], m.score[1], ...m.pensScore()] : [m.score[0], m.score[1]];
    st.results[key] = s;
    if (STORY[key] && winner(key, st.results) !== STORY[key]) {   // the story wins: flip it
      s = s.length === 4 ? [s[1], s[0], s[3], s[2]] : [s[1], s[0]];
      st.results[key] = s;
    }
  }
}

// ───────────────────────── save (separate from Season 1's save)
const KEY = 'rls-cup';
export function loadCup(): CupState | null {
  try { const s = JSON.parse(localStorage.getItem(KEY) || 'null'); return s?.v === 1 ? s : null; } catch { return null; }
}
export function saveCup(st: CupState | null) {
  try { if (st) localStorage.setItem(KEY, JSON.stringify(st)); else localStorage.removeItem(KEY); } catch { /* private mode */ }
}
export const newCup = (diff: Diff, kind: Kind): CupState => ({ v: 1, diff, kind, round: 0, results: {} });

// ───────────────────────── what people say (speaker id from cast.ts, or 'narrator')
export type Line = [string, string];
export const BEFORE: Line[][] = [
  [
    ['narrator', 'October. The school announces the Cup: seven grades and one team of teachers.'],
    ['mostafa', "I'm the coach. Hefny is the crowd. Hussein is the wall. Simple."],
    ['hefny', 'I made a chant. It has one word in it. HUSSEIN.'],
    ['narrator', 'First, a friendly against 2nd Prep. Their twins, Ziad and Zeyad, swap shirts at half time.'],
    ['hussein', 'Nobody can tell them apart. Not even their mother.'],
  ],
  [
    ['narrator', "Quarter-final. 1st Secondary, one year below us. And Abdallah's left foot."],
    ['karim', 'They say his shots are so fast you only see them in the replay.'],
    ['hussein', "If he shoots, I save it. That's the deal."],
    ['hefny', 'Hussein. Your knee.'],
    ['hussein', 'My knee can wait.'],
  ],
  [
    ['narrator', "Semi-final. 1st Prep knocked out 3rd Prep. Their captain: Saif. Mostafa's little brother."],
    ['mostafa', "He's four years younger than me. He's also the Messi of the school."],
    ['saif', "Sorry, brother. I don't lose. Not even to you."],
    ['hefny', 'Is it bad if I cheer for both?'],
    ['mostafa', 'Yes.'],
  ],
  [
    ['narrator', 'The final. The teachers. Sheikh Nasser in his galabeya. Mr Ibrahim, already showing off.'],
    ['narrator', 'Mr Ahmed Rezk in goal. Normally.'],
    ['abdelfattah', 'Gentlemen, play fair. Teachers... also play fair.'],
    ['hussein', "Twelve years of homework. Let's go."],
  ],
];
export const AFTER_WIN: Line[][] = [
  [['mostafa', 'Good. Now we know where the goal is.'], ['narrator', 'The draw is made in the yard.']],
  [['hefny', 'HUSSEIN THE HIGH DAM!!'], ['hefny', '...Hussein, sit down. I brought ice from the canteen for your knee.']],
  [['saif', '...Good game, brother. Don\'t tell anyone I cried.'], ['mostafa', "I'm telling everyone."]],
  [['narrator', '2nd Secondary win the Cup. They even beat the teachers.'], ['abdelfattah', 'This never happened. ...Well done, boys.'], ['hussein', 'Twelve years. Worth it.']],
];
export const AFTER_LOSS_STORY: Line[] = [['mostafa', 'Again. Team talk: pass more, panic less.'], ['hefny', "I'll chant louder. That's my tactic."]];
export const AFTER_LOSS_CUP: Line[] = [['narrator', 'Knocked out. In Cup mode, the tournament starts again from the beginning.']];
export const AFTER_WARMUP_LOSS: Line[] = [['mostafa', "It's only a friendly. ...We never talk about this."], ['narrator', 'The draw is made in the yard.']];

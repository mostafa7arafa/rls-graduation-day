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

// ───────────────────────── the team talks between matches (staged by StageScene)
// A script is a list of steps: a place, people walking in, lines (speaker id from cast.ts, or
// 'narrator'), reactions, and anime cut-ins for the big rivalries. Court coordinates are the court
// world (src/scenes/match/courtArt.ts: the court is x 136-344, halfway line y 224, the pathway with
// the crowd x 104-134, the garden left of it); classroom coordinates are the Season 1 ground floor.
type Dir = 'down' | 'up' | 'side';
export type Step =
  | ['at', 'court' | 'classroom']
  | ['cam', number, number]
  | ['on', string, number, number, Dir?]
  | ['off', string]
  | ['walk', string, number, number]
  | ['face', string, Dir, 'right'?]
  | ['say', string, string]
  | ['emote', string, string]
  | ['jump', ...string[]]
  | ['thud']
  | ['wait', number]
  | ['cut', string, string, string]                  // who, move name, inner line
  | ['duel', string, string, string, string];        // attacker, defender, title, line
const on = (id: string, x: number, y: number, d: Dir = 'down'): Step => ['on', id, x, y, d];
const say = (who: string, line: string): Step => ['say', who, line];
const BENCH: Step[] = [on('mostafa', 122, 238, 'side'), ['face', 'mostafa', 'side', 'right'], on('hefny', 112, 212, 'side'), ['face', 'hefny', 'side', 'right']];
const US = (x = 0): Step[] => [on('hussein', 166 + x, 214, 'side'), on('karim', 196 + x, 204, 'side'), on('warshan', 182 + x, 236, 'side'), on('elrediny', 206 + x, 252, 'side'),
  ...['hussein', 'karim', 'warshan', 'elrediny'].map(id => ['face', id, 'side', 'right'] as Step)];
const DRAW: Step[] = [
  on('abdelfattah', 240, 120, 'down'), ['walk', 'abdelfattah', 240, 180],
  say('abdelfattah', 'The draw for the Cup. Quarter-final: 2nd Secondary against 1st Secondary.'),
  say('karim', "1st Secondary. Abdallah's team."),
  say('hefny', 'The one with the left foot?'),
  say('karim', 'The one with the left foot.'),
];

export const BEFORE: Step[][] = [
  [ // the warm-up: the Cup is announced in class, then a friendly against 2nd Prep
    ['at', 'classroom'],
    on('mostafa', 56, 110, 'up'), on('hussein', 136, 110, 'up'), on('hefny', 216, 110, 'up'),
    on('karim', 56, 142, 'up'), on('warshan', 136, 142, 'up'), on('elrediny', 216, 142, 'up'), on('shazly', 96, 142, 'up'),
    say('narrator', 'October. Third period. Nobody is listening.'),
    on('abdelfattah', 232, 176, 'up'), ['walk', 'abdelfattah', 232, 128], ['walk', 'abdelfattah', 136, 80], ['face', 'abdelfattah', 'down'],
    say('abdelfattah', 'Gentlemen. The school will hold a football Cup.'),
    say('abdelfattah', 'Seven grades. And one team of teachers.'),
    ['emote', 'karim', '!'],
    say('karim', 'Teachers? Playing? Against us?'),
    on('amr', 232, 176, 'up'), ['walk', 'amr', 232, 112], ['face', 'amr', 'side'],
    say('amr', 'And I will referee. VERY fairly.'),
    say('mostafa', "I'll be the coach. I have a whiteboard. That is most of coaching."),
    say('hefny', "And I'm the crowd. I made a chant. It has one word in it."),
    say('hefny', 'HUSSEIN.'),
    ['emote', 'hussein', '<3'],
    say('hussein', '...I like it.'),
    say('karim', "I'm up front. Obviously."),
    ['emote', 'hefny', '#'],
    say('hefny', 'Obviously.'),
    say('warshan', "I'll play wherever you need me. Sorry. Thank you."),
    say('elrediny', "I'll play next to Warshan. Same as him. A bit more skill."),
    say('warshan', "...That's fair."),
    say('shazly', 'I am the sub. I will be relaxing. Professionally.'),
    ['at', 'court'], ...BENCH, ...US(),
    say('narrator', 'First, a friendly. 2nd Prep. Just to warm up.'),
    on('ziad', 340, 212, 'side'), on('zeyad', 340, 242, 'side'),
    ['walk', 'ziad', 268, 212], ['walk', 'zeyad', 268, 242],
    say('ziad', "I'm Ziad."),
    say('zeyad', "No. I'm Ziad."),
    ['emote', 'ziad', '?'],
    say('ziad', '...Then who am I?'),
    say('hussein', 'Nobody can tell them apart. Not even their mother.'),
    say('mostafa', 'Warm-up. The result does not count. Nobody get injured. Hussein.'),
    say('hussein', 'What? Why did you say my name like that?'),
  ],
  [ // quarter-final: Abdallah
    ['at', 'court'], ...BENCH, ...US(),
    say('narrator', "Quarter-final. 1st Secondary, one year below us. And Abdallah's left foot."),
    on('abdallah', 330, 206, 'side'), on('sec1_1', 330, 240, 'side'),
    ['walk', 'abdallah', 286, 206],
    ['thud'],
    say('narrator', 'He hits the school wall. The wall loses.'),
    say('abdallah', 'Sorry. Left foot. It does that.'),
    say('karim', 'They say his shots are so fast you only see them in the replay.'),
    say('hussein', "If he shoots, I save it. That's the deal."),
    say('hefny', 'Hussein. Your knee.'),
    say('hussein', 'My knee can wait.'),
    ['duel', 'abdallah', 'hussein', 'LEFT FOOT vs THE HIGH DAM', 'If he shoots, I save it.'],
    say('mostafa', 'Warshan, Elrediny: stay goal-side of him. Karim: score.'),
    say('karim', 'I always score.'),
    ['emote', 'hefny', '#'],
  ],
  [ // semi-final: Saif, the little brother
    ['at', 'court'], on('hefny', 112, 212, 'side'), ['face', 'hefny', 'side', 'right'], ...US(-20),
    on('mostafa', 214, 228, 'side'), ['face', 'mostafa', 'side', 'right'],
    on('prep1_1', 330, 210, 'side'), on('prep1_2', 330, 250, 'side'), on('saif', 340, 230, 'side'),
    say('narrator', "Semi-final. 1st Prep. Their captain: Saif. Mostafa's little brother."),
    ['walk', 'saif', 250, 230],
    say('mostafa', "He's four years younger than me. He's also the Messi of the school."),
    say('saif', "Sorry, brother. I don't lose. Not even to you."),
    say('mostafa', 'Who taught you football?'),
    say('saif', 'YouTube.'),
    say('mostafa', '...And who pays for the internet?'),
    say('saif', 'Dad.'),
    ['emote', 'mostafa', '...'],
    ['face', 'saif', 'side', 'right'],
    say('saif', 'And you two. PASS. ME. THE BALL.'),
    ['emote', 'prep1_1', '!'],
    say('hefny', 'Is it bad if I cheer for both?'),
    say('mostafa', 'Yes.'),
    ['duel', 'saif', 'mostafa', 'BROTHERS', 'Tonight at dinner, only one of us talks.'],
  ],
  [ // the final: the teachers, and the whole school watching
    ['at', 'court'], on('doaa', 108, 150, 'side'), on('shimaa', 120, 168, 'side'), on('hager', 108, 186, 'side'),
    ...['doaa', 'shimaa', 'hager'].map(id => ['face', id, 'side', 'right'] as Step), ...BENCH, ...US(),
    on('nasser', 286, 204, 'side'), on('ibrahim', 300, 230, 'side'), on('amrk', 282, 254, 'side'), on('rezk', 318, 214, 'side'),
    on('amr', 240, 226, 'down'),
    say('narrator', 'The final. The whole school came to watch.'),
    say('nasser', 'Bismillah. Boys, we will go easy on you.'),
    say('karim', "Please don't."),
    ['walk', 'ibrahim', 150, 172],
    say('ibrahim', 'Miss Doaa. Miss Shimaa. Miss Hager. Watch my left foot today.'),
    say('hager', '...We came to watch the students, Mr Ibrahim.'),
    ['walk', 'ibrahim', 300, 230],
    say('amrk', 'I pass the ball where I look. And I look everywhere.'),
    say('elrediny', '...Is he square?'),
    say('warshan', "Don't say it."),
    say('rezk', 'I am in goal. Normally.'),
    say('amr', 'Teachers. Students. Same rules. ...Mostly the same rules.'),
    on('abdelfattah', 240, 120, 'down'), ['walk', 'abdelfattah', 240, 176],
    say('abdelfattah', 'Gentlemen, play fair. Teachers... also play fair.'),
    say('hussein', "Twelve years of homework. Let's go."),
    ['duel', 'nasser', 'karim', 'STUDENTS vs TEACHERS', 'Twelve years of homework. One afternoon.'],
  ],
];
export const AFTER_WIN: Step[][] = [
  [['at', 'court'], ...BENCH, ...US(), say('mostafa', 'Good. Now we know where the goal is.'), ...DRAW],
  [ // after Abdallah: ice for the knee, and meanwhile Saif happens
    ['at', 'court'], ...BENCH, ...US(),
    ['walk', 'hefny', 160, 220],
    say('hefny', 'HUSSEIN THE HIGH DAM!!'),
    ['jump', 'hefny', 'karim', 'warshan', 'elrediny'],
    say('hefny', '...Hussein, sit down. I brought ice from the canteen for your knee.'),
    say('hussein', 'How much was the ice?'),
    say('hefny', 'Do not ask. The auntie has a monopoly.'),
    ['at', 'court'],
    say('narrator', 'Meanwhile, on the same court: 1st Prep against 3rd Prep.'),
    on('tito', 262, 200, 'side'), on('shika', 244, 238, 'side'), on('bodda', 282, 252, 'side'), on('saif', 340, 222, 'side'),
    say('bodda', 'Look at him. He is tiny.'),
    ['walk', 'saif', 200, 222],
    ['emote', 'shika', '!'], ['emote', 'tito', '?'],
    ['cut', 'saif', 'MESSI MODE', 'Brother or not. I do not lose.'],
    say('narrator', '1st Prep win. Saif dribbled past all three of them. Twice.'),
    say('tito', 'Who IS that kid?'),
    on('mostafa', 122, 238, 'side'), ['face', 'mostafa', 'side', 'right'],
    say('mostafa', '...My brother.'),
  ],
  [ // after Saif
    ['at', 'court'], ...BENCH, ...US(-20),
    on('saif', 250, 230, 'side'), ['walk', 'mostafa', 220, 230],
    say('saif', "...Good game, brother. Don't tell anyone I cried."),
    say('mostafa', "I'm telling everyone."),
    say('hussein', "That was the hardest match of my life. And I did Mr Hassan's homework for twelve years."),
    say('narrator', 'In the other semi-final, the teachers won. Sheikh Nasser scored from his own half. In a galabeya.'),
    on('nasser', 330, 206, 'side'), ['walk', 'nasser', 290, 206],
    say('nasser', 'Alhamdulillah. The final, then.'),
  ],
  [ // champions
    ['at', 'court'], ...BENCH, ...US(), on('shazly', 226, 222, 'side'),
    on('nasser', 290, 206, 'side'), on('abdelfattah', 240, 176, 'down'),
    ['jump', 'karim', 'warshan', 'elrediny', 'shazly', 'hussein'],
    say('narrator', '2nd Secondary win the Cup. They even beat the teachers.'),
    say('abdelfattah', 'This never happened. ...Well done, boys.'),
    say('nasser', 'Next year: a rematch.'),
    say('karim', 'We graduate next year, sir.'),
    say('nasser', '...Then I win by default.'),
    say('hussein', 'Twelve years. Worth it.'),
    ['walk', 'hefny', 158, 218],
    say('hefny', 'HUSSEIN! THE HIGH DAM! CHAMPIONS!'),
    ['jump', 'hefny', 'hussein', 'karim', 'warshan', 'elrediny', 'shazly'],
  ],
];
export const AFTER_LOSS_STORY: Step[] = [['at', 'court'], ...BENCH, ...US(),
  say('mostafa', 'Again. Team talk: pass more, panic less.'), say('hefny', "I'll chant louder. That's my tactic."), say('hussein', 'My knee says again. My knee is lying.')];
export const AFTER_LOSS_CUP: Step[] = [['at', 'court'], ...BENCH, say('narrator', 'Knocked out. In Cup mode, the tournament starts again from the beginning.'), say('mostafa', 'From the top. Warm-up first.')];
export const AFTER_WARMUP_LOSS: Step[] = [['at', 'court'], ...BENCH, ...US(), say('mostafa', "It's only a friendly. ...We never talk about this."), ...DRAW];

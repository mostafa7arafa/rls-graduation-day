// Who plays, and how well. Stats are 0..1. `sprite` = a baked character sheet in public/assets.
// 4 a side: a keeper + 3 outfield, one sub. Signature traits come later (M3).

export interface PlayerDef {
  id: string; sprite: string;
  speed: number; shot: number; pass: number; dribble: number; tackle: number;
  keeper?: number;                     // keepers only: reflexes, reach and handling
}
export interface TeamDef {
  id: string; name: string; short: string;
  color: number;                       // ring under the players' feet
  gk: PlayerDef; field: [PlayerDef, PlayerDef, PlayerDef]; sub?: PlayerDef;
  ai: { reaction: number; aggression: number };  // decision interval (s), 0..1 how eagerly they press/shoot
}

const P = (id: string, sprite: string, speed: number, shot: number, pass: number, dribble: number, tackle: number, keeper?: number): PlayerDef =>
  ({ id, sprite, speed, shot, pass, dribble, tackle, keeper });

export const TEAMS: Record<string, TeamDef> = {
  // 2nd Secondary: us. Hussein "the High Dam" in goal, Karim up front.
  rls: {
    id: 'rls', name: '2nd Secondary', short: '2 SEC', color: 0xc23b3b,
    gk: P('hussein', 'hussein', 0.6, 0.4, 0.5, 0.3, 0.5, 0.95),
    field: [
      P('warshan', 'warshan', 0.72, 0.6, 0.75, 0.7, 0.75),
      P('elrediny', 'student3', 0.75, 0.62, 0.75, 0.8, 0.65),
      P('karim', 'karim', 0.74, 0.95, 0.6, 0.65, 0.45),
    ],
    sub: P('shazly', 'shazly', 0.66, 0.55, 0.6, 0.55, 0.6),
    ai: { reaction: 0.16, aggression: 0.6 },
  },
  // the final: stronger, smarter, and they know it
  teachers: {
    id: 'teachers', name: 'The Teachers', short: 'TEACHERS', color: 0xf4f0e8,
    gk: P('rezk', 'rezk', 0.5, 0.4, 0.5, 0.3, 0.5, 0.82),
    field: [
      P('amrk', 'amr', 0.74, 0.7, 0.95, 0.75, 0.7),
      P('ibrahim', 'ibrahim', 0.82, 0.7, 0.65, 0.92, 0.5),
      P('nasser', 'nasser', 0.54, 0.95, 0.58, 0.5, 0.55),
    ],
    sub: P('abdelfattah', 'abdelfattah', 0.6, 0.6, 0.7, 0.5, 0.55),
    ai: { reaction: 0.12, aggression: 0.7 },
  },
};

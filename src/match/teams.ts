// Who plays, and how well. Stats are 0..1. `sprite` = a baked character sheet in public/assets.
// 4 a side: a keeper + 3 outfield, one sub. Signature traits come later (M3).

export interface PlayerDef {
  id: string; sprite: string;
  speed: number; shot: number; pass: number; dribble: number; tackle: number;
  keeper?: number;                     // keepers only: reflexes, reach and handling
  power?: number;                      // shot speed multiplier: Abdallah's left foot, Sheikh Nasser's cannon
}
export interface TeamDef {
  id: string; name: string; short: string;
  color: number;                       // ring under the players' feet
  gk: PlayerDef; field: [PlayerDef, PlayerDef, PlayerDef]; sub?: PlayerDef;
  ai: { reaction: number; aggression: number };  // decision interval (s), 0..1 how eagerly they press/shoot
}

const P = (id: string, sprite: string, speed: number, shot: number, pass: number, dribble: number, tackle: number, keeper?: number, power?: number): PlayerDef =>
  ({ id, sprite, speed, shot, pass, dribble, tackle, keeper, power });

export const TEAMS: Record<string, TeamDef> = {
  // 2nd Secondary: us. Hussein "the High Dam" in goal, Karim up front.
  rls: {
    id: 'rls', name: '2nd Secondary', short: '2 SEC', color: 0xc23b3b,
    gk: P('hussein', 'hussein', 0.6, 0.4, 0.5, 0.3, 0.5, 0.95),
    field: [
      P('warshan', 'warshan', 0.72, 0.6, 0.75, 0.7, 0.75),
      P('elrediny', 'student3', 0.75, 0.62, 0.75, 0.8, 0.65),
      P('karim', 'karim', 0.74, 0.95, 0.6, 0.65, 0.45, undefined, 1.1),
    ],
    sub: P('shazly', 'shazly', 0.66, 0.55, 0.6, 0.55, 0.6),
    ai: { reaction: 0.16, aggression: 0.6 },
  },
  // the final: stronger, smarter, and they know it
  teachers: {
    id: 'teachers', name: 'The Teachers', short: 'TEACHERS', color: 0xf4f0e8,
    gk: P('rezk', 'rezk', 0.55, 0.4, 0.5, 0.3, 0.5, 0.9),
    field: [
      P('amrk', 'amr', 0.74, 0.7, 0.95, 0.75, 0.7),
      P('ibrahim', 'ibrahim', 0.82, 0.7, 0.65, 0.92, 0.5),
      P('nasser', 'nasser', 0.62, 0.95, 0.62, 0.55, 0.65, undefined, 1.15),
    ],
    sub: P('abdelfattah', 'abdelfattah', 0.6, 0.6, 0.7, 0.5, 0.55),
    ai: { reaction: 0.1, aggression: 0.72 },
  },
  // 1st Secondary, one year below us: Abdallah and his left foot (rockets you can't even see)
  sec1: {
    id: 'sec1', name: '1st Secondary', short: '1 SEC', color: 0x3a7bd5,
    gk: P('sec1gk', 'student7', 0.5, 0.4, 0.5, 0.3, 0.5, 0.68),
    field: [
      P('sec1a', 'student3', 0.7, 0.55, 0.65, 0.6, 0.7),
      P('sec1b', 'student1', 0.72, 0.6, 0.65, 0.62, 0.6),
      P('abdallah', 'student5', 0.74, 1, 0.6, 0.7, 0.45, undefined, 1.3),
    ],
    ai: { reaction: 0.18, aggression: 0.6 },
  },
  // 1st Prep: small, and four years younger. Their captain is Saif, Mostafa's brother, the Messi of the
  // school: he dribbles past you and lays it on a plate for someone else. Hates losing.
  prep1: {
    id: 'prep1', name: '1st Prep', short: '1 PREP', color: 0x7fd0f0,
    gk: P('prep1gk', 'kid', 0.6, 0.4, 0.5, 0.3, 0.5, 0.8),
    field: [
      P('prep1a', 'kid', 0.75, 0.6, 0.7, 0.65, 0.75),
      P('saif', 'kid', 0.95, 0.8, 0.98, 1, 0.55),
      P('prep1b', 'kid', 0.78, 0.75, 0.7, 0.65, 0.6),
    ],
    ai: { reaction: 0.11, aggression: 0.75 },
  },
  // 2nd Prep: the twins, Ziad and Zeyad. Nobody can tell them apart. Including the referee.
  prep2: {
    id: 'prep2', name: '2nd Prep', short: '2 PREP', color: 0x3fa34d,
    gk: P('prep2gk', 'student3', 0.5, 0.4, 0.5, 0.3, 0.5, 0.5),
    field: [
      P('prep2a', 'student7', 0.55, 0.45, 0.5, 0.45, 0.5),
      P('ziad', 'student1', 0.62, 0.55, 0.55, 0.55, 0.5),
      P('zeyad', 'student1', 0.62, 0.55, 0.55, 0.55, 0.5),
    ],
    ai: { reaction: 0.26, aggression: 0.45 },
  },
  // 3rd Prep: older, cocky, kicks more legs than balls. Saif's team knocks them out.
  prep3: {
    id: 'prep3', name: '3rd Prep', short: '3 PREP', color: 0x2a2a2a,
    gk: P('prep3gk', 'student7', 0.5, 0.4, 0.5, 0.3, 0.5, 0.55),
    field: [
      P('tito', 'student3', 0.65, 0.55, 0.45, 0.5, 0.8),
      P('shika', 'student5', 0.65, 0.55, 0.45, 0.5, 0.8),
      P('bodda', 'student1', 0.7, 0.7, 0.5, 0.6, 0.75),
    ],
    ai: { reaction: 0.2, aggression: 0.8 },
  },
  prim5: {
    id: 'prim5', name: '5th Primary', short: '5 PRIM', color: 0xf2c94c,
    gk: P('prim5gk', 'kid', 0.4, 0.3, 0.4, 0.3, 0.4, 0.35),
    field: [P('prim5a', 'kid', 0.45, 0.35, 0.4, 0.4, 0.35), P('prim5b', 'kid', 0.45, 0.35, 0.4, 0.4, 0.35), P('prim5c', 'kid', 0.5, 0.4, 0.4, 0.45, 0.35)],
    ai: { reaction: 0.3, aggression: 0.4 },
  },
  prim6: {
    id: 'prim6', name: '6th Primary', short: '6 PRIM', color: 0xf08a3c,
    gk: P('prim6gk', 'kid', 0.45, 0.3, 0.4, 0.3, 0.4, 0.42),
    field: [P('prim6a', 'kid', 0.5, 0.4, 0.45, 0.45, 0.4), P('prim6b', 'kid', 0.5, 0.4, 0.45, 0.45, 0.4), P('prim6c', 'kid', 0.55, 0.45, 0.45, 0.5, 0.4)],
    ai: { reaction: 0.28, aggression: 0.45 },
  },
};

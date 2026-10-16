// RLS floors. One char = one 16x16 tile; keep row widths equal within a map.
// Data only (no imports): tools/bake-art.mjs reads this file directly with Node.
// `when` on props/warps = a save flag name ('!flag' = only while it is NOT set).

export interface PropDef {
  key: string; x: number; y: number;          // texture key, top-left in px
  flat?: boolean;                              // drawn under everyone (court markings)
  block?: [number, number, number, number][];  // collision boxes [dx, dy, w, h] relative to x,y
  when?: string;
  id?: string;                                 // scripts can move/hide props by id
}
export interface Warp { x: number; y: number; w: number; h: number; to: string; tx: number; ty: number; dir: 'up' | 'down' | 'left' | 'right'; when?: string }
export interface MapDef { rows: string[]; props: PropDef[]; warps: Warp[]; music: 'school' | 'upstairs' }

const T = 16;
const tree = (x: number, y: number, k: 'tree1' | 'tree2'): PropDef => ({ key: k, x: x * T, y: y * T, block: [[13, 38, 10, 8]] });

const GROUND = `
########################################################
#WWnWWW[]WWWWnWWW#WKKKKKKKKKW#WWNWnWWcW#WWWnWWWNWWnWwWW#
#FFFFFFFFFFFFFFFF#FFFFFFFFFFF#FFFFFFFFF#FFFFFFFFFFFFFFF#
#FFFFFFtTFFFFFFFF#FFFFFFFFFFF#FFFqqFFFF#FFFFFFFFFFFFFFF#
#FFFFFFFFFFFFFFFF#FFFqqFFqqFF#FFFFFFFFF#FFCCCCCFCCCCCFF#
#FDDDFFDDDFFDDDFF#FFFFFFFFFFF#FFRRRRFFF#FFFFFFFFFFFFFFF#
#FFFFFFFFFFFFFFFF#FFFqqFFqqFF#FFRRRRFFF#FFFFFFFFFFFFFFF#
#FDDDFFDDDFFDDDFF#FFFFFFFFFFF#FFFFFFFFF#FFFFFFFFFFFFFFF#
#FFFFFFFFFFFFFFFF#FFFFFFFFFFF#FFFFFFFFF#FFFFFFFFFFFFFFF#
##############f###################f#########f#####f#####
#WWWWWWWNWWWWWdWWWWWWWWXWWWWNWWWWWdWWWWWwWWWdWWWWWdWWWW#
#SSffffffffffffffffffffffffffffffffffffffffffffffffffff#
#SSffffffffffffffffffffffffffffffffffffffffffffffffffff#
##########################ffff##########################
OOOoOOOoOOOoOOOoOOOoOOOoOOddddOoOOOoOOOoOOOoOOOoOOOoOOOO
v*....*.......======p===p======p===p===================v
v.....,....,..=========================================v
v.....,....,..=--------------------------==============v
v..,.......,..=-uuuuuuuuuuuuuuuuuuuuuuuu-==============v
v..,.......,..=-uuuuuuuuuuuuuuuuuuuuuuuu-==============v
v..*....*.....=-uuuuuuuuuuuuuuuuuuuuuuuu-===bbb==bbb===v
v..,....,.....=-uuuuuuuuuuuuuuuuuuuuuuuu-==============v
v.......,....,=-uuuuuuuuuuuuuuuuuuuuuuuu-==============v
v.......,....,=-uuuuuuuuuuuuuuuuuuuuuuuu-==============v
v.......,....,=-uuuuuuuuuuuuuuuuuuuuuuuu-==============v
v....*.......*=-uuuuuuuuuuuuuuuuuuuuuuuu-==============v
v....,.......,=-uuuuuuuuuuuuuuuuuuuuuuuu-==============v
v....,....,...=-uuuuuuuuuuuuuuuuuuuuuuuu-==============v
v....,....,...=-uuuuuuuuuuuuuuuuuuuuuuuu-==============v
v.,.......,...=-uuuuuuuuuuuuuuuuuuuuuuuu-==============v
v.*.......*...=-uuuuuuuuuuuuuuuuuuuuuuuu-==============v
v.,:::::::::..=-uuuuuuuuuuuuuuuuuuuuuuuu-==============v
v.,:::::::::..=-uuuuuuuuuuuuuuuuuuuuuuuu-==============v
v.,:::::::::..=--------------------------==============v
v..:::::::::,.=========================================v
v..:::::::::*.=========================================v
v..:::::::::,.=========================================v
v..:::::::::,.=========================================v
v..:::::::::,.====mmmmmmmm=============================v
v...,....,....====mmmmmmmm=============================v
v...*....*....====mmmmmmmm=============================v
v,.......,....=========================================v
v,.......,....=========================================v
v,....,.......=========================================v
v,....,.......=========================================v
hhhhhhhhhhhhhhhhhhhhhhhhhhGGgghhhhhhhhhhhhhhhhhhhhhhhhhh
rrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrr
rrlrrrrlrrrrlrrrrlrrrrlrrrrlrrrrlrrrrlrrrrlrrrrlrrrrlrrr
`.trim().split('\n');

const FIRST = `
########################################
#Wn[]WWWnWWNW#WkkkWnWkkkWnW#Wn[]WWNWWnW#
#FFFFFFFFFFFF#FFFFFFFFFFFeF#FFFFFFFFFFF#
#FFFFtTFFFFFF#FFFFFFFFFFFFF#FFFtTFFFFFF#
#FFFFFFFFFFFF#FFLLLFFLLLFFF#FFFFFFFFFFF#
#FDDDFFDDDFFF#FFFFFFFFFFFFF#FDDDFFDDDFF#
#FFFFFFFFFFFF#FFLLLFFLLLFFF#FFFFFFFFFFF#
#FDDDFFDDDFFF#FFFFFFFFFFFFF#FDDDFFDDDFF#
#FFFFFFFFFFFF#FFFFFFFFFFFFF#FFFFFFFFFFF#
#########f##########f############f######
#WWWWNWWWdWWWWWWNWWWdWWWwWWNWWWWWdWWNWW#
#SSffffffffffffffffffffffffffffffffffff#
#SSffffffffffffffffffffffffffffffffffff#
#######f######################f#########
#WnWWNWdnWWwWWW########WnWWPPWdnWWWNWnW#
#FFFFFFFFFFFYYF########FFFFFFtTFFFFFFFF#
#FFqqFFFqqFFFFF########FFFFFFFFFFFFFFFF#
#FFqqFFFqqFFFFF########FDDDFFFFFFDDDFFF#
#FFFFFFFFFFFFFF########FFFFFFFFFFFFFFFF#
#FFFFFFFFFFFFFF########FDDDFFFFFFDDDFFF#
########################################
`.trim().split('\n');

export const MAPS: Record<string, MapDef> = {
  ground: {
    rows: GROUND, music: 'school',
    props: [
      { key: 'court', x: 16 * T, y: 18 * T, flat: true },
      { key: 'goalL', x: 16 * T - 6, y: 18 * T + 92 }, { key: 'goalR', x: 40 * T - 14, y: 18 * T + 92 },
      tree(2, 17, 'tree1'), tree(8, 22, 'tree2'), tree(3, 40, 'tree2'), tree(10, 41, 'tree1'), tree(50, 41, 'tree1'), tree(52, 24, 'tree2'),
      { key: 'swings', x: 4 * T, y: 32 * T, block: [[2, 30, 4, 8], [51, 30, 4, 8]] },
      { key: 'car', id: 'car', x: 44 * T, y: 36 * T, block: [[2, 14, 60, 20]], when: '!car_gone' },
      { key: 'flag', x: 47 * T, y: 24 * T, block: [[0, 56, 7, 7]] },
      { key: 'chain', x: 1 * T, y: 10 * T + 6, block: [[0, 4, 32, 36]], when: '!stairs_open' },
    ],
    warps: [{ x: 1, y: 11, w: 2, h: 2, to: 'first', tx: 3.5, ty: 12.5, dir: 'right', when: 'stairs_open' }],
  },
  first: {
    rows: FIRST, music: 'upstairs',
    props: [],
    warps: [{ x: 1, y: 11, w: 2, h: 2, to: 'ground', tx: 3.5, ty: 12.5, dir: 'right' }],
  },
};

export const LEGEND: Record<string, string> = {
  '~': 'void', '.': 'grass', ',': 'grass2', '*': 'flowers', '=': 'pavers', '-': 'pavers2', ':': 'sand',
  f: 'floor', F: 'floor2', d: 'doorway', '#': 'wallTop', W: 'wall', n: 'wallWin', '[': 'boardL', ']': 'boardR',
  N: 'notice', h: 'fenceH', v: 'fenceV', G: 'gateL', g: 'gateR', D: 'desk', t: 'tdeskL', T: 'tdeskR',
  r: 'road', l: 'roadLine', p: 'pot', K: 'shelf', C: 'counter', w: 'cooler', X: 'doorShut', O: 'outWall',
  o: 'outWin', u: 'turf', U: 'turf2', b: 'bench', _: 'curb', c: 'cabinet', q: 'tabletop', R: 'rug',
  S: 'stairs', m: 'mat', L: 'labBench', k: 'labShelf', P: 'mapPoster', e: 'sink', Y: 'sofa',
};

export const SOLID = new Set('~#Wn[]NhvGgDtTpKCwXOobcqLkPeY'.split(''));

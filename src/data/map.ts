// RLS ground floor. One char = one 16x16 tile, 56 cols x 48 rows. Edit freely, keep row widths equal.
export const MAP = `
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
#ffffffffffffffffffffffffffffffffffffffffffffffffffffff#
#ffffffffffffffffffffffffffffffffffffffffffffffffffffff#
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
v..:::::::::,.=========================================v
v...,....,....=========================================v
v...*....*....=========================================v
v,.......,....=========================================v
v,.......,....=========================================v
v,....,.......=========================================v
v,....,.......=========================================v
hhhhhhhhhhhhhhhhhhhhhhhhhhGGgghhhhhhhhhhhhhhhhhhhhhhhhhh
rrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrr
rrlrrrrlrrrrlrrrrlrrrrlrrrrlrrrrlrrrrlrrrrlrrrrlrrrrlrrr
`.trim().split('\n');

export const LEGEND: Record<string, string> = {
  '~': 'void', '.': 'grass', ',': 'grass2', '*': 'flowers', '=': 'pavers', '-': 'pavers2', ':': 'sand',
  f: 'floor', F: 'floor2', d: 'doorway', '#': 'wallTop', W: 'wall', n: 'wallWin', '[': 'boardL', ']': 'boardR',
  N: 'notice', h: 'fenceH', v: 'fenceV', G: 'gateL', g: 'gateR', D: 'desk', t: 'tdeskL', T: 'tdeskR',
  r: 'road', l: 'roadLine', p: 'pot', K: 'shelf', C: 'counter', w: 'cooler', X: 'doorShut', O: 'outWall',
  o: 'outWin', u: 'turf', U: 'turf2', b: 'bench', _: 'curb', c: 'cabinet', q: 'tabletop', R: 'rug',
};

export const SOLID = new Set('~#Wn[]NhvGgDtTpKCwXOobcq'.split(''));

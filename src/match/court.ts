// The real court at RLS, from the entrance looking in: school wall on the RIGHT (the ball bounces
// off it), the pathway + garden on the LEFT (ball out = kick-in), school building at the top end,
// canteen at the bottom. Grey street-stone tiles. Tiny: it barely fits 3v3, we played 4v4.
// Units are world pixels, 16 px = 1 m. Origin = top-left corner of the playing surface.

export const PPM = 16;
export const CW = 208;                 // width  (x): 13 m, garden side x=0 -> wall x=CW
export const CL = 352;                 // length (y): 22 m, building goal y=0 -> canteen goal y=CL
export const GOAL_W = 48;              // 3 m wide
export const GOAL_X0 = (CW - GOAL_W) / 2, GOAL_X1 = GOAL_X0 + GOAL_W;
export const BAR = 30;                 // crossbar height (z), ~2 m
export const GOAL_D = 12;              // net depth behind the line
export const BOX_R = 52;               // keeper area: a half-circle around the goal centre

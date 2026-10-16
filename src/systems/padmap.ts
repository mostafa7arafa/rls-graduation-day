// Which button index is which, per controller. Browsers give "standard" pads (real DualSense /
// Xbox pads) one fixed layout, but generic PC pads on Linux report their raw order instead, e.g.
// the QIXIONG PC Gamepad: Cross 0, Circle 1, Square 3, Triangle 4, L1 6, R1 7, L2 8, R2 9,
// Share 10, Options 11, d-pad on axes 6/7. A pad can also be set up by hand (CONTROLLER SETUP),
// which is saved per controller name.

export interface Layout {
  cross: number; circle: number; square: number; triangle: number;
  l1: number; r1: number; l2: number; r2: number; start: number;
  dpad: 'buttons' | 'hat';            // standard d-pad = buttons 12-15; generic = axes 6 (x) / 7 (y)
}
export const ROLES = ['cross', 'circle', 'square', 'triangle', 'l1', 'r1', 'l2', 'r2', 'start'] as const;
export type Role = typeof ROLES[number];

const STANDARD: Layout = { cross: 0, circle: 1, square: 2, triangle: 3, l1: 4, r1: 5, l2: 6, r2: 7, start: 9, dpad: 'buttons' };
// Linux generic (evdev) order: A B C X Y Z TL TR TL2 TR2 SELECT START MODE THUMBL THUMBR
const GENERIC: Layout = { cross: 0, circle: 1, square: 3, triangle: 4, l1: 6, r1: 7, l2: 8, r2: 9, start: 11, dpad: 'hat' };

const KEY = 'rls-pads';
let saved: Record<string, Layout> = (() => { try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch { return {}; } })();

export function layout(p: Gamepad): Layout {
  return saved[p.id] ?? (p.mapping === 'standard' ? STANDARD : GENERIC);
}
export function saveLayout(id: string, l: Layout) {
  saved = { ...saved, [id]: l };
  try { localStorage.setItem(KEY, JSON.stringify(saved)); } catch { /* private mode */ }
}
export function resetLayout(id: string) {
  const { [id]: _, ...rest } = saved; saved = rest;
  try { localStorage.setItem(KEY, JSON.stringify(saved)); } catch { /* private mode */ }
}

/** d-pad as -1/0/1 per axis */
export function dpad(p: Gamepad, l: Layout): { x: number; y: number } {
  if (l.dpad === 'hat') {
    const hx = p.axes[6] ?? 0, hy = p.axes[7] ?? 0;
    return { x: hx > 0.5 ? 1 : hx < -0.5 ? -1 : 0, y: hy > 0.5 ? 1 : hy < -0.5 ? -1 : 0 };
  }
  const b = (i: number) => !!p.buttons[i]?.pressed;
  return { x: (b(15) ? 1 : 0) - (b(14) ? 1 : 0), y: (b(13) ? 1 : 0) - (b(12) ? 1 : 0) };
}

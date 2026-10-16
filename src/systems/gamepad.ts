// PlayStation / Xbox controller support. Rather than teaching every scene about gamepads, this
// bridge turns controller buttons into the keyboard keys the game already understands
// (Phaser reads `keyCode`, menus/minigames read `key`), so every menu and minigame works as-is.
//
//   D-pad / left stick -> arrows      A / Cross  -> Z (talk, confirm)    B / Circle -> X (back)
//   X / Square, R2      -> Shift (run) LB / RB / L1 / R1 -> Tab (swap)    Start / Options -> Esc (menu)
// Button numbers differ between controllers (generic PC pads on Linux), so they come from padmap.ts.
// No controller button mutes: on generic pads that used to land on L2 and switched the sound off mid-game.

import { layout, dpad } from './padmap';

export interface Bind { key: string; code: string; keyCode: number }
const K = (key: string, code: string, keyCode: number): Bind => ({ key, code, keyCode });
export const UP = K('ArrowUp', 'ArrowUp', 38), DOWN = K('ArrowDown', 'ArrowDown', 40), LEFT = K('ArrowLeft', 'ArrowLeft', 37), RIGHT = K('ArrowRight', 'ArrowRight', 39);
export const OK = K('z', 'KeyZ', 90), BACK = K('x', 'KeyX', 88), RUN = K('Shift', 'ShiftLeft', 16), SWAP = K('Tab', 'Tab', 9), START = K('Escape', 'Escape', 27), MUTE = K('m', 'KeyM', 77);

/** which logical keys are held on this pad */
function read(p: Gamepad): Bind[] {
  const l = layout(p), b = (i: number) => !!p.buttons[i]?.pressed;
  const ax = p.axes[0] ?? 0, ay = p.axes[1] ?? 0, DEAD = 0.5, d = dpad(p, l);
  const held: Bind[] = [];
  if (d.y < 0 || ay < -DEAD) held.push(UP);
  if (d.y > 0 || ay > DEAD) held.push(DOWN);
  if (d.x < 0 || ax < -DEAD) held.push(LEFT);
  if (d.x > 0 || ax > DEAD) held.push(RIGHT);
  if (b(l.cross)) held.push(OK);
  if (b(l.circle)) held.push(BACK);
  if (b(l.square) || b(l.r2)) held.push(RUN);
  if (b(l.l1) || b(l.r1)) held.push(SWAP);
  if (b(l.start)) held.push(START);
  return held;
}

export function fire(type: 'keydown' | 'keyup', k: Bind) {
  const e = new KeyboardEvent(type, { key: k.key, code: k.code, bubbles: true, cancelable: true });
  // keyCode/which are read-only in the constructor; Phaser still keys off them
  Object.defineProperty(e, 'keyCode', { get: () => k.keyCode });
  Object.defineProperty(e, 'which', { get: () => k.keyCode });
  window.dispatchEvent(e);
}

const down = new Set<Bind>();
// The football match reads controllers itself (analog sticks, two players). While it runs, the
// bridge only forwards the menu buttons, so a pad doesn't also drive the keyboard player.
let only: Bind[] | null = null;
export function bridgeOnly(keys: Bind[] | null) { only = keys; }
const listeners: ((pad: Gamepad | null) => void)[] = [];

/** 'playstation' | 'xbox' style labels for on-screen hints, or null with no controller */
export function padStyle(): 'playstation' | 'xbox' | null {
  const p = [...navigator.getGamepads()].find(Boolean);
  if (!p) return null;
  if (/xbox|xinput|045e/i.test(p.id)) return 'xbox';   // Microsoft first: some PS pads also say "Wireless Controller"
  return /054c|playstation|dualsense|dualshock|wireless controller/i.test(p.id) || p.mapping !== 'standard' ? 'playstation' : 'xbox';  // generic PC pads are mostly PS-shaped
}
export const onPadChange = (fn: (pad: Gamepad | null) => void) => { listeners.push(fn); };

export function startGamepadBridge() {
  addEventListener('gamepadconnected', (e) => listeners.forEach(f => f((e as GamepadEvent).gamepad)));
  addEventListener('gamepaddisconnected', () => listeners.forEach(f => f(null)));
  const tick = () => {
    const now = new Set<Bind>();
    for (const p of navigator.getGamepads()) if (p && p.connected) read(p).forEach(k => { if (!only || only.includes(k)) now.add(k); });
    for (const k of now) if (!down.has(k)) { down.add(k); fire('keydown', k); }
    for (const k of [...down]) if (!now.has(k)) { down.delete(k); fire('keyup', k); }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

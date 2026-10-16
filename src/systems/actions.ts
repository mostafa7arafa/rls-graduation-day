// Football input: one SlotInput per human player, read straight from the devices (analog stick,
// held buttons for charging shots, and which controller is which, for two players).
//
//   player 1 = keyboard (and the phone's on-screen buttons, which press keys) + the first controller
//   player 2 = the second controller, or the only controller if the keyboard is player 1 in co-op
//
//              keyboard           PlayStation (Xbox)                  phone
//   move       arrows / WASD      left stick / d-pad                  d-pad
//   pass       Z / J / Space      Cross (A)                           A
//   shoot      X / K  (hold)      Square (X), hold                    B
//   lob        C / L              Circle (B)                          -
//   through    V / I              Triangle (Y)                        -
//   sprint     Shift              R2 / R1 (RT / RB)                   RUN
//   switch     Tab / Q            L1 / L2 (LB / LT)                   SWAP
//
// Without the ball: pass = switch to the player nearest the ball, shoot or lob = tackle.
// Button numbers per controller come from padmap.ts (generic PC pads number them differently).

import type { SlotInput } from '../match/sim';
import { layout, dpad } from './padmap';

const held = new Set<string>();
const tapped = new Set<string>();   // pressed since the last read: a quick tap between two frames still counts
const onDown = (e: KeyboardEvent) => { held.add(e.code); tapped.add(e.code); if (e.code === 'Tab' || e.code.startsWith('Arrow') || e.code === 'Space') e.preventDefault(); };
const onUp = (e: KeyboardEvent) => held.delete(e.code);
const onBlur = () => { held.clear(); tapped.clear(); };

/** start listening (returns a stop function). Held keys are dropped when the window loses focus. */
export function startActions() {
  held.clear(); tapped.clear();
  addEventListener('keydown', onDown); addEventListener('keyup', onUp); addEventListener('blur', onBlur);
  return () => { removeEventListener('keydown', onDown); removeEventListener('keyup', onUp); removeEventListener('blur', onBlur); held.clear(); };
}

const any = (...codes: string[]) => codes.some(c => held.has(c) || tapped.has(c));
function keyboard(): SlotInput {
  let mx = (any('ArrowRight', 'KeyD') ? 1 : 0) - (any('ArrowLeft', 'KeyA') ? 1 : 0);
  let my = (any('ArrowDown', 'KeyS') ? 1 : 0) - (any('ArrowUp', 'KeyW') ? 1 : 0);
  if (mx && my) { mx *= Math.SQRT1_2; my *= Math.SQRT1_2; }
  return { mx, my, pass: any('KeyZ', 'KeyJ', 'Space', 'Enter'), shoot: any('KeyX', 'KeyK'), lob: any('KeyC', 'KeyL'), through: any('KeyV', 'KeyI'), sprint: any('ShiftLeft', 'ShiftRight'), swap: any('Tab', 'KeyQ') };
}

function pad(p: Gamepad): SlotInput {
  const l = layout(p), b = (i: number) => !!p.buttons[i]?.pressed;
  let mx = p.axes[0] ?? 0, my = p.axes[1] ?? 0;
  const m = Math.hypot(mx, my), DEAD = 0.2;
  if (m < DEAD) { mx = 0; my = 0; } else { const k = Math.min(1, (m - DEAD) / (1 - DEAD)) / m; mx *= k; my *= k; }  // radial dead zone, rescaled
  const d = dpad(p, l);
  if (d.x || d.y) {
    mx = d.x; my = d.y;
    if (mx && my) { mx *= Math.SQRT1_2; my *= Math.SQRT1_2; }
  }
  // the FIFA layout: X pass, Square shoot, Circle lob, Triangle through ball, R2/R1 sprint, L1 switch
  return { mx, my, pass: b(l.cross), shoot: b(l.square), lob: b(l.circle), through: b(l.triangle), sprint: b(l.r2) || b(l.r1), swap: b(l.l1) || b(l.l2) };
}

export const pads = () => [...navigator.getGamepads()].filter((p): p is Gamepad => !!p && p.connected);

const merge = (a: SlotInput, b: SlotInput): SlotInput => ({
  mx: Math.abs(b.mx) > Math.abs(a.mx) ? b.mx : a.mx, my: Math.abs(b.my) > Math.abs(a.my) ? b.my : a.my,
  pass: a.pass || b.pass, shoot: a.shoot || b.shoot, lob: a.lob || b.lob, through: a.through || b.through, sprint: a.sprint || b.sprint, swap: a.swap || b.swap,
});

/** is there a device for player 2? (a 2nd controller, or one controller while the keyboard plays P1) */
export const hasP2 = () => pads().length >= 1;

/** forget quick taps made in a menu */
export function clearTaps() { tapped.clear(); }

/** inputs for the human slots: slot 0 always, slot 1 when two players */
export function readSlots(two: boolean): Map<number, SlotInput> {
  const out = slots(two);
  tapped.clear();
  return out;
}
function slots(two: boolean): Map<number, SlotInput> {
  const ps = pads(), out = new Map<number, SlotInput>();
  if (!two) { out.set(0, ps[0] ? merge(keyboard(), pad(ps[0])) : keyboard()); return out; }
  // two players: with 2+ controllers, P1 = keyboard + pad 1 and P2 = pad 2; with one, keyboard vs that pad
  out.set(0, ps.length >= 2 ? merge(keyboard(), pad(ps[0])) : keyboard());
  if (ps.length) out.set(1, pad(ps[ps.length >= 2 ? 1 : 0]));
  return out;
}

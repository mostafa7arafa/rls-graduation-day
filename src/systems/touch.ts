// Phone / tablet controls. Like the gamepad bridge, the on-screen buttons just press the keyboard
// keys the game already understands, so every scene and minigame works without knowing about touch.
//
//   left thumb: a d-pad you can slide around (8 directions)     right thumb: A (talk) and B (back)
//   above them: SWAP (leader) and RUN (hold)      top-left corner: MENU (pause) and FULL (fullscreen)
//
// It only appears on touch-first devices, and hides itself if a real keyboard or a controller is used.

import { fire, UP, DOWN, LEFT, RIGHT, OK, BACK, RUN, SWAP, START } from './gamepad';
import type { Bind } from './gamepad';

export const isTouch = () => matchMedia('(pointer: coarse)').matches;
let active = false;
export const touchActive = () => active;
const listeners: (() => void)[] = [];
export const onTouchChange = (fn: () => void) => { listeners.push(fn); };

const CSS = `
#touch { position: fixed; inset: 0; pointer-events: none; z-index: 10; user-select: none; -webkit-user-select: none; font-family: PressStart, monospace; }
#touch.off { display: none; }
#touch .pad { position: absolute; left: max(14px, env(safe-area-inset-left)); bottom: 14px; width: 132px; height: 132px; border-radius: 50%;
  background: rgba(244,240,232,.10); border: 2px solid rgba(244,240,232,.28); pointer-events: auto; touch-action: none; }
#touch .pad i { position: absolute; color: rgba(244,240,232,.55); font-style: normal; font-size: 12px; }
#touch .knob { position: absolute; left: 50%; top: 50%; width: 52px; height: 52px; margin: -26px 0 0 -26px; border-radius: 50%;
  background: rgba(242,201,76,.45); border: 2px solid rgba(242,201,76,.8); transition: transform .05s; }
#touch .btn { position: absolute; display: flex; align-items: center; justify-content: center; border-radius: 50%; pointer-events: auto; touch-action: none;
  color: #f4f0e8; background: rgba(27,20,32,.55); border: 2px solid rgba(244,240,232,.45); font-size: 14px; }
#touch .btn.on { background: rgba(242,201,76,.55); border-color: #f2c94c; color: #1b1420; }
#touch .a { width: 68px; height: 68px; right: max(18px, env(safe-area-inset-right)); bottom: 52px; border-color: rgba(159,224,154,.8); }
#touch .b { width: 54px; height: 54px; right: calc(max(18px, env(safe-area-inset-right)) + 80px); bottom: 16px; border-color: rgba(255,122,122,.8); }
#touch .small { width: auto; height: 30px; padding: 0 10px; border-radius: 15px; font-size: 8px; top: max(8px, env(safe-area-inset-top)); }
#touch .swap { right: calc(max(10px, env(safe-area-inset-right)) + 0px); top: auto; bottom: 134px; }
#touch .run { right: calc(max(10px, env(safe-area-inset-right)) + 80px); top: auto; bottom: 134px; }
#touch .menu { left: max(10px, env(safe-area-inset-left)); }
#touch .full { left: calc(max(10px, env(safe-area-inset-left)) + 70px); }
#touch .full.gone { display: none; }
`;

export function startTouchControls() {
  if (!isTouch()) return;
  const style = document.createElement('style'); style.textContent = CSS; document.head.appendChild(style);
  const root = document.createElement('div'); root.id = 'touch';
  root.innerHTML = `
    <div class="pad"><i style="left:58px;top:6px">▲</i><i style="left:58px;bottom:6px">▼</i><i style="left:8px;top:58px">◀</i><i style="right:8px;top:58px">▶</i><div class="knob"></div></div>
    <div class="btn a">A</div><div class="btn b">B</div>
    <div class="btn small swap">SWAP</div><div class="btn small run">RUN</div>
    <div class="btn small menu">MENU</div><div class="btn small full">FULL</div>`;
  document.body.appendChild(root);
  active = true;

  // ── d-pad: direction from the thumb's offset to the centre, so sliding works without lifting
  const pad = root.querySelector<HTMLElement>('.pad')!, knob = root.querySelector<HTMLElement>('.knob')!;
  let held = new Set<Bind>(), padPointer = -1;
  const setDirs = (next: Set<Bind>) => {
    for (const k of held) if (!next.has(k)) fire('keyup', k);
    for (const k of next) if (!held.has(k)) fire('keydown', k);
    held = next;
  };
  const track = (e: PointerEvent) => {
    const r = pad.getBoundingClientRect();
    const dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
    const len = Math.hypot(dx, dy), max = r.width / 2 - 20, k = Math.min(1, max / (len || 1));
    knob.style.transform = `translate(${dx * k}px, ${dy * k}px)`;
    const next = new Set<Bind>();
    if (len > 16) { // dead zone; a 45° wedge each way gives clean diagonals
      const a = Math.atan2(dy, dx) * 180 / Math.PI;
      if (a > -157.5 && a < -22.5) next.add(UP);
      if (a > 22.5 && a < 157.5) next.add(DOWN);
      if (a > 112.5 || a < -112.5) next.add(LEFT);
      if (a > -67.5 && a < 67.5) next.add(RIGHT);
    }
    setDirs(next);
  };
  pad.addEventListener('pointerdown', (e) => { e.preventDefault(); padPointer = e.pointerId; pad.setPointerCapture(e.pointerId); track(e); });
  pad.addEventListener('pointermove', (e) => { if (e.pointerId === padPointer) track(e); });
  const release = (e: PointerEvent) => { if (e.pointerId !== padPointer) return; padPointer = -1; knob.style.transform = ''; setDirs(new Set()); };
  pad.addEventListener('pointerup', release); pad.addEventListener('pointercancel', release);

  // ── buttons: press = keydown, lift = keyup
  const hold = (sel: string, key: Bind) => {
    const el = root.querySelector<HTMLElement>(sel)!;
    let down = false;
    el.addEventListener('pointerdown', (e) => { e.preventDefault(); el.setPointerCapture(e.pointerId); if (!down) { down = true; el.classList.add('on'); fire('keydown', key); } });
    const up = () => { if (down) { down = false; el.classList.remove('on'); fire('keyup', key); } };
    el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
  };
  hold('.a', OK); hold('.b', BACK); hold('.swap', SWAP); hold('.run', RUN); hold('.menu', START);
  const full = root.querySelector<HTMLElement>('.full')!;
  full.addEventListener('pointerdown', (e) => { e.preventDefault(); goFullscreen(); });
  const fullState = () => full.classList.toggle('gone', !document.fullscreenEnabled || !!document.fullscreenElement);
  addEventListener('fullscreenchange', fullState); fullState();

  // the first touch anywhere also goes fullscreen + landscape (Android; iPhones need "Add to Home Screen")
  addEventListener('pointerdown', () => goFullscreen(), { once: true });

  // a real keyboard or a controller takes over: hide the buttons
  const hide = () => { if (!active) return; active = false; root.classList.add('off'); listeners.forEach(f => f()); };
  addEventListener('keydown', (e) => { if (e.isTrusted) hide(); });
  addEventListener('gamepadconnected', hide);
}

function goFullscreen() {
  const el = document.documentElement as HTMLElement & { webkitRequestFullscreen?: () => void };
  if (document.fullscreenElement) return;
  const req = el.requestFullscreen?.({ navigationUI: 'hide' }) ?? (el.webkitRequestFullscreen?.(), undefined);
  Promise.resolve(req).then(() => (screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> }).lock?.('landscape')).catch(() => {});
}

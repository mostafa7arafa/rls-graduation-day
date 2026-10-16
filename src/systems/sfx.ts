// All sound is synthesized with WebAudio — no audio files to license or load.
// Each speaker has a "voice" pitch for the typewriter blips (Undertale-style) and for reaction grunts.
// Routing: every sound -> sfxBus | musicBus -> master -> speakers. Mute just zeroes master.
let ctx: AudioContext | null = null;
let master: GainNode, sfxBus: GainNode, musicBus: GainNode;
let muted = false;

/** the shared AudioContext (created lazily; browsers only let it run after a user gesture) */
export function audio(): AudioContext | null {
  try {
    if (!ctx) {
      ctx = new AudioContext();
      master = ctx.createGain(); master.gain.value = muted ? 0 : 1; master.connect(ctx.destination);
      sfxBus = ctx.createGain(); sfxBus.connect(master);
      musicBus = ctx.createGain(); musicBus.gain.value = 0.55; musicBus.connect(master);
    }
    if (ctx.state === 'suspended' && !document.hidden) void ctx.resume();
    return ctx;
  } catch { return null; }
}
export const musicOut = () => (audio(), musicBus);

// wake audio on the first gesture, and go quiet while the tab is hidden (timers get throttled there)
for (const ev of ['keydown', 'pointerdown']) addEventListener(ev, () => audio(), { once: true });
document.addEventListener('visibilitychange', () => {
  if (!ctx) return;
  if (document.hidden) void ctx.suspend(); else void ctx.resume();
});

export function tone(freq: number, dur: number, type: OscillatorType = 'square', vol = 0.06, slideTo?: number, delay = 0, out?: AudioNode, vibrato = 0) {
  const a = audio(); if (!a || muted) return;
  const t = a.currentTime + delay;
  const o = a.createOscillator(), g = a.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
  if (vibrato) {
    const lfo = a.createOscillator(), depth = a.createGain();
    lfo.frequency.value = vibrato; depth.gain.value = freq * 0.03;
    lfo.connect(depth).connect(o.frequency); lfo.start(t); lfo.stop(t + dur + 0.02);
  }
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(out ?? sfxBus); o.start(t); o.stop(t + dur + 0.02);
}

export function noise(dur: number, vol = 0.08, delay = 0, out?: AudioNode, highpass = 0) {
  const a = audio(); if (!a || muted) return;
  const t = a.currentTime + delay;
  const buf = a.createBuffer(1, Math.ceil(a.sampleRate * dur), a.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
  const s = a.createBufferSource(), g = a.createGain(); s.buffer = buf; g.gain.value = vol;
  let node: AudioNode = s;
  if (highpass) { const f = a.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = highpass; s.connect(f); node = f; }
  node.connect(g).connect(out ?? sfxBus); s.start(t);
}

export type Reaction = '!' | '?' | '<3' | '...' | '#' | 'laugh' | 'noo' | 'ow';

export const sfx = {
  blip: (pitch = 440) => tone(pitch * (0.95 + Math.random() * 0.1), 0.05, 'square', 0.035),
  select: () => tone(660, 0.06, 'square', 0.05, 990),
  move: () => tone(520, 0.04, 'square', 0.04),
  back: () => tone(400, 0.08, 'square', 0.05, 250),
  hit: () => { noise(0.18, 0.12); tone(220, 0.18, 'sawtooth', 0.06, 70); },
  bump: () => tone(120, 0.06, 'triangle', 0.08),
  heal: () => [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.12, 'triangle', 0.06, undefined, i * 0.07)),
  door: () => { noise(0.25, 0.06); tone(90, 0.3, 'triangle', 0.1, 60); },
  item: () => [784, 988, 1175, 1568].forEach((f, i) => tone(f, 0.14, 'square', 0.04, undefined, i * 0.09)),
  // the RLS school bell: a harsh electric ring
  bell: () => { for (let i = 0; i < 26; i++) { tone(1180, 0.05, 'square', 0.035, undefined, i * 0.06); tone(1420, 0.05, 'square', 0.02, undefined, i * 0.06 + 0.03); } },
  sting: () => [330, 311, 294, 277].forEach((f, i) => tone(f, 0.25, 'sawtooth', 0.05, undefined, i * 0.22)),
  win: () => [523, 659, 784, 659, 784, 1046].forEach((f, i) => tone(f, 0.16, 'square', 0.05, undefined, i * 0.12)),
  honk: () => { tone(392, 0.18, 'square', 0.06); tone(494, 0.18, 'square', 0.05); tone(392, 0.3, 'square', 0.06, undefined, 0.25); tone(494, 0.3, 'square', 0.05, undefined, 0.25); },
  // a tractor: low chugging pulses
  engine: () => { for (let i = 0; i < 14; i++) { tone(55 + (i % 2) * 6, 0.09, 'sawtooth', 0.07, 45, i * 0.11); noise(0.05, 0.03, i * 0.11, undefined, 200); } },
  whistle: () => tone(2400, 0.35, 'square', 0.04, undefined, 0, undefined, 30),
  cheer: () => { noise(1.2, 0.06, 0, undefined, 900); [523, 659, 784].forEach((f, i) => tone(f, 0.25, 'triangle', 0.03, undefined, 0.1 + i * 0.1)); },
  kick: () => { tone(160, 0.08, 'sine', 0.2, 60); noise(0.04, 0.06, 0, undefined, 1500); },

  /** a wordless voice reaction in the speaker's own pitch (gasp, aww, rage growl...) */
  react: (p: number, kind: Reaction) => {
    switch (kind) {
      case '!': tone(p * 0.9, 0.13, 'square', 0.06, p * 1.9); noise(0.05, 0.03, 0, undefined, 3000); break;
      case '?': tone(p * 0.8, 0.08, 'square', 0.05); tone(p * 0.9, 0.16, 'square', 0.05, p * 1.4, 0.1); break;
      case '<3':
        tone(p * 1.25, 0.55, 'triangle', 0.08, p * 0.8, 0, undefined, 7);
        [2.4, 3, 3.6].forEach((m, i) => tone(p * m, 0.08, 'square', 0.02, undefined, 0.15 + i * 0.08));
        break;
      case '#':
        tone(p * 0.45, 0.45, 'sawtooth', 0.07, p * 0.38, 0, undefined, 28);
        noise(0.35, 0.05, 0.02, undefined, 400);
        break;
      case '...': noise(0.5, 0.025, 0, undefined, 1200); tone(p * 0.7, 0.45, 'triangle', 0.04, p * 0.45, 0.05); break;
      case 'laugh': [1.3, 1.2, 1.25, 1.1, 1.15].forEach((m, i) => tone(p * m, 0.07, 'square', 0.05, p * m * 0.85, i * 0.11)); break;
      case 'noo': tone(p * 1.5, 1.5, 'sawtooth', 0.06, p * 0.5, 0, undefined, 6); break;
      case 'ow': tone(p * 1.4, 0.16, 'square', 0.06, p * 0.7); break;
    }
  },

  toggleMute: () => {
    muted = !muted;
    if (ctx) master.gain.setTargetAtTime(muted ? 0 : 1, ctx.currentTime, 0.03);
    return muted;
  },
};

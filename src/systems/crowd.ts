// The crowd on the pathway, synthesized like everything else (no audio files):
//   - a murmur that swells when the ball gets near a goal
//   - "ooooh" on a near miss, a roar on a goal, applause on a save
//   - chants sung by a crowd of formant "voices": each voice is a buzzy oscillator through two
//     band-pass filters tuned to a vowel (F1/F2), so a dozen of them slightly out of time and
//     tune read as people singing. "Hu-SEIN! el-SADD el-AA-li!" = Hussein, the High Dam.

import { audio, sfxOut } from './sfx';

// vowel formants (Hz), adult voices
const VOWEL = { u: [320, 870], e: [500, 1750], ei: [450, 2000], a: [720, 1150], i: [300, 2250], o: [480, 900] } as const;
type V = keyof typeof VOWEL;
interface Syl { v: V; dur: number; up?: number; s?: boolean }   // up = pitch step, s = starts with an "s"

let bed: { src: AudioBufferSourceNode; gain: GainNode; filt: BiquadFilterNode } | null = null;
let level = 0;

function noiseBuffer(a: AudioContext, secs: number) {
  const buf = a.createBuffer(1, Math.ceil(a.sampleRate * secs), a.sampleRate), d = buf.getChannelData(0);
  let b0 = 0, b1 = 0, b2 = 0;   // cheap pink-ish noise: a crowd is low and soft, not hissy
  for (let i = 0; i < d.length; i++) { const w = Math.random() * 2 - 1; b0 = 0.99 * b0 + w * 0.05; b1 = 0.96 * b1 + w * 0.3; b2 = 0.6 * b2 + w * 0.6; d[i] = (b0 + b1 + b2) * 0.25; }
  return buf;
}

/** one crowd voice singing a syllable */
function voice(a: AudioContext, out: AudioNode, t: number, pitch: number, syl: Syl, vol: number) {
  const o = a.createOscillator(); o.type = 'sawtooth';
  o.frequency.setValueAtTime(pitch, t);
  o.frequency.linearRampToValueAtTime(pitch * (syl.up ?? 1), t + syl.dur * 0.6);
  const g = a.createGain(), mix = a.createGain(); mix.gain.value = 0.5;
  for (const f of VOWEL[syl.v]) { const bp = a.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = f; bp.Q.value = 6; o.connect(bp).connect(mix); }
  mix.connect(g).connect(out);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(vol, t + 0.04);
  g.gain.setValueAtTime(vol, t + syl.dur * 0.7);
  g.gain.exponentialRampToValueAtTime(0.0001, t + syl.dur);
  o.start(t); o.stop(t + syl.dur + 0.05);
  if (syl.s) {   // the hiss of an "s"
    const n = a.createBufferSource(); n.buffer = noiseBuffer(a, 0.08);
    const hp = a.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 3500;
    const ng = a.createGain(); ng.gain.value = vol * 1.2;
    n.connect(hp).connect(ng).connect(out); n.start(Math.max(a.currentTime, t - 0.07));
  }
}

/** a crowd singing a line: `voices` people, each a bit off in time and tune */
function sing(line: Syl[], { voices = 12, base = 170, vol = 0.05, delay = 0, gap = 0.04 } = {}) {
  const a = audio(); if (!a) return 0;
  const out = sfxOut();
  let t0 = a.currentTime + delay;
  for (let k = 0; k < voices; k++) {
    const pitch = base * (0.85 + Math.random() * 0.4) * (k % 3 === 0 ? 2 : 1);   // a few higher voices
    let t = t0 + Math.random() * 0.05;
    for (const s of line) { voice(a, out, t, pitch, s, vol / Math.sqrt(voices)); t += s.dur + gap; }
  }
  return line.reduce((n, s) => n + s.dur + gap, 0);
}

function clap(times: number, every: number, delay = 0, vol = 0.05) {
  const a = audio(); if (!a) return;
  for (let i = 0; i < times; i++) for (let k = 0; k < 6; k++) {
    const n = a.createBufferSource(); n.buffer = noiseBuffer(a, 0.04);
    const bp = a.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1200 + Math.random() * 900; bp.Q.value = 1.2;
    const g = a.createGain(); g.gain.value = vol;
    n.connect(bp).connect(g).connect(sfxOut()); n.start(a.currentTime + delay + i * every + Math.random() * 0.03);
  }
}

const HUSSEIN: Syl[] = [{ v: 'u', dur: 0.2 }, { v: 'ei', dur: 0.4, up: 1.25, s: true }];
const HIGH_DAM: Syl[] = [{ v: 'e', dur: 0.14 }, { v: 'a', dur: 0.32, up: 1.2, s: true }, { v: 'e', dur: 0.14 }, { v: 'a', dur: 0.3, up: 1.12 }, { v: 'i', dur: 0.34, up: 0.9 }];
const OLE: Syl[] = [{ v: 'o', dur: 0.3 }, { v: 'e', dur: 0.3, up: 0.9 }, { v: 'o', dur: 0.2 }, { v: 'e', dur: 0.2, up: 0.9 }, { v: 'o', dur: 0.2 }, { v: 'e', dur: 0.2, up: 0.9 }, { v: 'o', dur: 0.2 }, { v: 'e', dur: 0.5, up: 1.1 }];

export const crowd = {
  /** start the murmur (call when the match screen opens) */
  start() {
    const a = audio(); if (!a || bed) return;
    const src = a.createBufferSource(); src.buffer = noiseBuffer(a, 3); src.loop = true;
    const filt = a.createBiquadFilter(); filt.type = 'bandpass'; filt.frequency.value = 600; filt.Q.value = 0.7;
    const gain = a.createGain(); gain.gain.value = 0;
    src.connect(filt).connect(gain).connect(sfxOut()); src.start();
    gain.gain.setTargetAtTime(0.05, a.currentTime, 0.8);
    bed = { src, gain, filt }; level = 0;
  },
  stop() {
    const a = audio(); if (!a || !bed) return;
    const b = bed; bed = null;
    b.gain.gain.setTargetAtTime(0, a.currentTime, 0.3);
    setTimeout(() => { try { b.src.stop(); } catch { /* already stopped */ } }, 1500);
  },
  /** 0..1: how exciting the moment is (ball near a goal); the murmur follows it smoothly */
  excite(x: number) {
    const a = audio(); if (!a || !bed) return;
    if (Math.abs(x - level) < 0.05) return;
    level = x;
    bed.gain.gain.setTargetAtTime(0.05 + x * 0.09, a.currentTime, 0.4);
    bed.filt.frequency.setTargetAtTime(600 + x * 500, a.currentTime, 0.4);
  },
  ooh() { sing([{ v: 'o', dur: 0.9, up: 0.7 }], { voices: 14, base: 190, vol: 0.06 }); },
  roar() {
    const a = audio(); if (!a || !bed) return;
    bed.gain.gain.cancelScheduledValues(a.currentTime);
    bed.gain.gain.setTargetAtTime(0.32, a.currentTime, 0.08);
    bed.gain.gain.setTargetAtTime(0.06, a.currentTime + 1.6, 0.8);
    sing([{ v: 'o', dur: 1.6, up: 1.1 }], { voices: 16, base: 200, vol: 0.07 });
    clap(6, 0.25, 0.4, 0.05);
  },
  applause() { clap(5, 0.12, 0, 0.035); },
  /** «حسين السد العالي» — Hussein, the High Dam */
  hussein() {
    let t = 0;
    for (let r = 0; r < 2; r++) {
      t += sing(HUSSEIN, { delay: t, vol: 0.06 }) + 0.12;
      t += sing(HIGH_DAM, { delay: t, vol: 0.06 }) + 0.25;
    }
    clap(4, 0.5, 0, 0.04);
  },
  ole() { sing(OLE, { vol: 0.045 }); clap(6, 0.3, 0, 0.03); },
};

// Background music: a tiny chiptune sequencer, written as text so tracks are easy to tweak.
// Egyptian flavour comes from the maqam scales (Hijaz, Bayati — quarter tones included, synths
// don't care) and darbuka rhythms: D = doum (low), T = tak (high), k = soft ka.
//
// Note tokens: C D E F G A B + optional # / b / q (quarter-flat) + octave, e.g. "F#5", "Eq4".
// "." = rest, "-" = hold the previous note one more step, "|" = bar line (ignored).
import { audio, musicOut, tone, noise } from './sfx';

interface Voice { notes: string; wave: OscillatorType; vol: number; vibrato?: number; staccato?: boolean }
interface Track { bpm: number; voices: Voice[]; drums: string; drumVol: number }

// steps are 8th notes
const TRACKS = {
  // the school: cheeky Hijaz on D over a maqsoum groove (dum-tak-_-tak-dum-_-tak-_)
  school: {
    bpm: 116, drumVol: 1,
    voices: [
      { wave: 'square', vol: 0.028, vibrato: 5, notes: `
        D5 - F#5 G5 A5 - G5 F#5 | G5 F#5 Eb5 F#5 D5 - - . | D5 - F#5 G5 A5 - Bb5 A5 | G5 A5 Bb5 C6 A5 - - . |
        D6 - C6 Bb5 A5 - G5 A5 | Bb5 A5 G5 F#5 G5 - - . | A5 G5 F#5 Eb5 F#5 G5 F#5 Eb5 | D5 - - . A4 . D5 . |
        . . . . . . . . | . . . . . . . . | A4 . D5 . F#5 . A5 . | G5 F#5 G5 A5 G5 - - . |
        Bb5 . A5 . G5 . F#5 . | Eb5 F#5 G5 F#5 Eb5 - D5 . | C5 D5 Eb5 F#5 G5 A5 Bb5 C6 | D6 - - . . . . . |` },
      { wave: 'triangle', vol: 0.09, staccato: true, notes: `
        D3 . . D3 A2 . D3 . | D3 . . D3 A2 . D3 . | D3 . . D3 A2 . D3 . | C3 . . C3 G2 . C3 . |
        G2 . . G2 D3 . G2 . | G2 . . G2 D3 . G2 . | Eb3 . . Eb3 D3 . C3 . | D3 . . D3 A2 . D3 . |
        D3 . . D3 A2 . D3 . | D3 . . D3 A2 . D3 . | D3 . . D3 A2 . D3 . | G2 . . G2 D3 . G2 . |
        G2 . . G2 D3 . G2 . | C3 . . C3 G2 . C3 . | C3 . . C3 Eb3 . Eb3 . | D3 . . D3 A2 . D3 . |` },
    ],
    drums: 'D T . T D . T k | D T . T D . T k | D T . T D . T k | D T k T D T T T',
  },
  // Mr Hassan's class: a fast Saidi beat in Hijaz on A — tense, but still silly
  battle: {
    bpm: 152, drumVol: 1.1,
    voices: [
      { wave: 'square', vol: 0.03, vibrato: 6, notes: `
        A4 Bb4 C#5 D5 E5 . E5 . | F5 E5 D5 C#5 D5 . . . | E5 F5 G5 F5 E5 D5 C#5 D5 | C#5 Bb4 A4 . A4 . . . |
        A5 . G5 F5 E5 . F5 E5 | D5 . C#5 D5 E5 . . . | F5 E5 D5 C#5 Bb4 C#5 D5 E5 | C#5 . Bb4 . A4 . . . |` },
      { wave: 'triangle', vol: 0.1, staccato: true, notes: `
        A2 . A2 A3 A2 . A2 A3 | A2 . A2 A3 A2 . A2 A3 | D3 . D3 D2 D3 . D3 D2 | A2 . A2 A3 A2 . A2 A3 |
        A2 . A2 A3 A2 . A2 A3 | D3 . D3 D2 D3 . D3 D2 | Bb2 . Bb2 Bb3 Bb2 . Bb2 Bb3 | A2 . A2 A3 A2 . E2 . |` },
    ],
    drums: 'D T . D D . T . | D T . D D . T . | D T . D D . T . | D T T D D T T T',
  },
  // title screen: slow, nostalgic Bayati (that Eq is a real quarter tone) on a ney-ish triangle
  title: {
    bpm: 84, drumVol: 0.5,
    voices: [
      { wave: 'triangle', vol: 0.09, vibrato: 5, notes: `
        A4 - - G4 F4 - Eq4 F4 | G4 - - - - - . . | F4 G4 A4 Bb4 A4 - G4 F4 | Eq4 - - - D4 - - . |
        D5 - C5 Bb4 A4 - Bb4 A4 | G4 - A4 G4 F4 - - . | G4 F4 Eq4 F4 G4 - F4 Eq4 | D4 - - - - - - . |` },
      { wave: 'triangle', vol: 0.06, notes: `
        D3 - - - - - - - | C3 - - - - - - - | Bb2 - - - - - - - | A2 - - - - - - - |
        Bb2 - - - - - - - | G2 - - - - - - - | C3 - - - - - - - | D3 - - - - - - - |` },
    ],
    drums: 'D . . . D . T . | D . . . D . T k',
  },
} satisfies Record<string, Track>;

export type TrackId = keyof typeof TRACKS;

const SEMI: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const freq = (tok: string) => {
  const m = /^([A-G])(#|b|q)?(\d)$/.exec(tok); if (!m) return 0;
  const midi = 12 * (Number(m[3]) + 1) + SEMI[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : m[2] === 'q' ? -0.5 : 0);
  return 440 * 2 ** ((midi - 69) / 12);
};
/** "D5 - F#5 ." -> per-step list of { f, steps } (null = nothing starts on this step) */
function parse(src: string) {
  const toks = src.split(/\s+/).filter(t => t && t !== '|');
  return toks.map((t, i) => {
    if (t === '.' || t === '-') return null;
    let steps = 1; while (toks[i + steps] === '-') steps++;
    return { f: freq(t), steps };
  });
}

let current: { id: TrackId; timer: number; out: GainNode } | null = null;

export const music = {
  play(id: TrackId) {
    if (current?.id === id) return;
    music.stop();
    const a = audio(); if (!a) return;
    const tr = TRACKS[id];
    const step = 60 / tr.bpm / 2;
    const voices = (tr.voices as Voice[]).map(v => ({ ...v, seq: parse(v.notes) }));
    const drums = tr.drums.split(/\s+/).filter(t => t && t !== '|');
    const out = a.createGain(); out.gain.value = 0; out.connect(musicOut());
    out.gain.setTargetAtTime(1, a.currentTime, 0.25);
    let n = 0, next = a.currentTime + 0.1;
    // look-ahead scheduler: every 25ms queue whatever falls in the next 120ms
    const tick = () => {
      while (next < a.currentTime + 0.12) {
        const delay = Math.max(0, next - a.currentTime);
        for (const v of voices) {
          const e = v.seq[n % v.seq.length];
          if (e?.f) tone(e.f, v.staccato ? step * 0.8 : step * e.steps * 0.95, v.wave, v.vol, undefined, delay, out, v.vibrato);
        }
        const d = drums[n % drums.length], dv = tr.drumVol;
        if (d === 'D') tone(150, 0.16, 'sine', 0.22 * dv, 50, delay, out);
        else if (d === 'T') noise(0.05, 0.07 * dv, delay, out, 2500);
        else if (d === 'k') noise(0.03, 0.03 * dv, delay, out, 4000);
        n++; next += step;
      }
    };
    tick();
    current = { id, timer: window.setInterval(tick, 25), out };
  },

  stop(fade = 0.3) {
    if (!current) return;
    const { timer, out } = current; current = null;
    clearInterval(timer);
    const a = audio(); if (!a) return;
    out.gain.setTargetAtTime(0, a.currentTime, fade / 3);
    setTimeout(() => out.disconnect(), fade * 1000 + 400);
  },
};

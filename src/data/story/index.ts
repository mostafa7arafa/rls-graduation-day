// THE SCREENPLAY, one file per chapter. This index stitches them together for the engine.
import { flag } from '../../systems/save';
import { chapter } from './types';
import type { Npc, Spot, Script } from './types';
import * as ch1 from './ch1';
import * as ch2 from './ch2';
import * as ch3 from './ch3';
import * as ch4 from './ch4';
import * as ch5 from './ch5';
import * as ch6 from './ch6';
import * as ch7 from './ch7';
import * as extras from './extras';

export * from './types';
export { FORM, signed } from './recurring';
export const intro = ch1.intro;

const CHAPTERS = [ch1, ch2, ch3, ch4, ch5, ch6, ch7];

export const NPCS: Npc[] = [...CHAPTERS.flatMap(ch => ch.NPCS), ...extras.NPCS];
export const SPOTS: Spot[] = CHAPTERS.flatMap(ch => ch.SPOTS);

export function objective(): string {
  return CHAPTERS[Math.min(chapter(), CHAPTERS.length) - 1].objective();
}

/** script to run when the leader walks out of the open main gate (null = nothing happens) */
export function exitScript(): Script | null {
  if (chapter() === 1 && flag('gate_open')) return ch1.ending;
  return null;
}

/** script to run on arriving at a map (null = nothing) */
export function enterScript(map: string): Script | null {
  if (map === 'first' && chapter() === 2 && flag('sig_nasser')) return ch3.enterFirst;
  return null;
}

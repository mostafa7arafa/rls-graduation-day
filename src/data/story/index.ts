// THE SCREENPLAY, one file per chapter. This index stitches them together for the engine.
import { flag } from '../../systems/save';
import { chapter } from './types';
import type { Npc, Spot, Script } from './types';
import * as ch1 from './ch1';
import * as ch2 from './ch2';

export * from './types';
export { FORM, signed } from './recurring';
export const intro = ch1.intro;

const CHAPTERS = [ch1, ch2];

export const NPCS: Npc[] = CHAPTERS.flatMap(ch => ch.NPCS);
export const SPOTS: Spot[] = CHAPTERS.flatMap(ch => ch.SPOTS);

export function objective(): string {
  return CHAPTERS[Math.min(chapter(), CHAPTERS.length) - 1].objective();
}

/** script to run when the leader walks out of the open main gate (null = nothing happens) */
export function exitScript(): Script | null {
  if (chapter() === 1 && flag('gate_open')) return ch1.ending;
  return null;
}

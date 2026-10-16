// What a script can do. Scripts are `async (c: Ctx) => {...}` — the whole story is written against this.
import type { Who } from '../../systems/save';
import type { Reaction } from '../../systems/sfx';
import type { TrackId } from '../../systems/music';
import { count } from '../../systems/save';

export type Dir = 'down' | 'up' | 'side';
export type Face = Dir | 'left' | 'right';
export type EncounterId = 'hassan' | 'nasser' | 'yasser' | 'lab' | 'abdelkareem' | 'amr' | 'karim';

export interface Ctx {
  leader: Who;
  say(who: string, text: string): Promise<void>;
  choose(options: string[], who?: string, prompt?: string): Promise<number>;
  wait(ms: number): Promise<void>;
  shake(intensity?: number, ms?: number): void;
  emote(who: string, mark: '!' | '?' | '<3' | '...' | '#'): void;   // also plays that character's voice reaction
  react(who: string, kind: Reaction): void;                          // voice reaction without a bubble (laugh, noo, ow...)
  tint(who: string, color: number, ms: number): void;
  battle(id: EncounterId): Promise<boolean>;                         // teacher encounter; resolves true on a win
  toast(text: string): void;
  bell(): void;
  openGate(): void;
  sting(): void;
  music(track: TrackId | null): void;
  /** full-screen chapter title card; `during` runs while the screen is black (e.g. a teleport) */
  chapter(n: number, title: string, during?: () => Promise<void>): Promise<void>;
  /** move the party to another map/tile (x,y in tiles, feet position) */
  teleport(map: string, x: number, y: number, dir?: Face): Promise<void>;
  /** walk an NPC or party member by tile steps, e.g. [[0,-2],[3,0]] */
  walk(who: string, steps: [number, number][], speed?: number): Promise<void>;
  face(who: string, dir: Face): void;
  show(who: string, visible: boolean): void;
  /** only this party member walks around (others vanish); null brings everyone back */
  solo(who: Who | null): void;
  moveProp(id: string, dx: number, dy: number, ms: number): Promise<void>;
  /** re-check every NPC/prop `when` right now (after flags change mid-script) */
  sync(): void;
  credits(): Promise<void>;
}
export type Script = (c: Ctx) => Promise<void>;

export interface Npc {
  id: string;                 // unique; also the speaker id unless `sprite` says otherwise
  sprite?: string;            // texture (defaults to id) — lets one character stand in different places per chapter
  map?: string;               // default 'ground'
  x: number; y: number;       // tile of the feet
  dir: Dir; flip?: boolean;
  when?: () => boolean;
  script: Script;
}
export interface Spot { map?: string; x: number; y: number; w?: number; h?: number; when?: () => boolean; script: Script }

/** pick a line based on who is leading */
export const by = <T>(c: Ctx, m: Record<Who, T>) => m[c.leader];
/** current chapter (1-based) */
export const chapter = () => Math.max(1, count('chapter'));

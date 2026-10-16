// Story state: flags + inventory + where the party stands. Persisted to localStorage (versioned).
const KEY = 'rls-save', VERSION = 2;

export type Who = 'mostafa' | 'hussein' | 'hefny';

export interface State {
  version: number;
  flags: Record<string, boolean | number | string>;
  items: string[];
  leader: Who;
  map: string;               // which floor (key of MAPS in data/map.ts)
  x: number; y: number;      // leader's feet, in px
  dir: 'up' | 'down' | 'left' | 'right';
}

export const state: State = fresh();

function fresh(): State {
  return { version: VERSION, flags: {}, items: [], leader: 'mostafa', map: 'ground', x: 27.5 * 16, y: 17 * 16, dir: 'up' };
}

export const flag = (k: string) => !!state.flags[k];
export const setFlag = (k: string, v: boolean | number | string = true) => { state.flags[k] = v; };
export const count = (k: string) => Number(state.flags[k] ?? 0);
export const bump = (k: string) => { state.flags[k] = count(k) + 1; return count(k); };
export const hasItem = (i: string) => state.items.includes(i);
export const giveItem = (i: string) => { if (!hasItem(i)) state.items.push(i); };
export const takeItem = (i: string) => { state.items = state.items.filter(x => x !== i); };

export function save() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* private mode etc. */ }
}

export function hasSave(): boolean {
  try { return !!localStorage.getItem(KEY); } catch { return false; }
}

export function load(): boolean {
  try {
    const raw = localStorage.getItem(KEY); if (!raw) return false;
    const s = JSON.parse(raw) as State;
    if (s.version === 1) Object.assign(s, { version: 2, map: 'ground', dir: 'up' }); // v1 had a single map
    if (s.version !== VERSION) return false;
    Object.assign(state, fresh(), s);
    return true;
  } catch { return false; }
}

export function reset() { Object.assign(state, fresh()); }

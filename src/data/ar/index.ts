// All Egyptian Arabic, one file per chapter (+ shared UI in ch1). English string -> Masri.
import { CH1 } from './ch1';
import { CH2 } from './ch2';

export const AR: Record<string, string> = { ...CH1, ...CH2 };

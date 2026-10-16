// All Egyptian Arabic, one file per chapter (+ shared UI in ch1). English string -> Masri.
import { CH1 } from './ch1';
import { CH2 } from './ch2';
import { CH3 } from './ch3';
import { CH4 } from './ch4';
import { CH5 } from './ch5';
import { CH6 } from './ch6';
import { CH7 } from './ch7';
import { V2 } from './v2';
import { V2B } from './v2b';
import { MATCH } from './match';

export const AR: Record<string, string> = { ...CH1, ...CH2, ...CH3, ...CH4, ...CH5, ...CH6, ...CH7, ...V2, ...V2B, ...MATCH };

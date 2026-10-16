// Characters who stay around all game. Chapter 1 has their first scenes (ch1.ts);
// from Chapter 2 on, their NPC scripts hand over to these, which branch by chapter.
import { flag, bump } from '../../systems/save';
import { by, chapter } from './types';
import type { Script } from './types';

/** the e5la2 taraf (clearance form): one flag per signature, in story order */
export const FORM = ['sig_nasser', 'sig_yasser', 'sig_lab', 'sig_abdelkareem', 'sig_amr', 'sig_stamp'] as const;
export const signed = () => FORM.filter(f => flag(f)).length;

const cycle = (key: string, lines: string[]) => lines[(bump(key) - 1) % lines.length];

export const LATER: Record<'hassan' | 'abdelfattah' | 'habeba' | 'auntie' | 'gate', Script> = {
  hassan: async (c) => {
    if (chapter() === 2) {
      await c.say('hassan', 'Sheikh Nasser\'s quiz? A word of advice from a survivor:');
      return c.say('hassan', 'Do not be RIGHT. Be AGREEABLE. I learned that in my first week here. In 1987.');
    }
    await c.say('hassan', by(c, {
      mostafa: 'Go, engineer. Build something that does homework. Then build one that CHECKS it.',
      hussein: 'Go, Hussein. Before I remember your old grades.',
      hefny: 'Go, doctor. And control your temper. And your hair.',
    }));
  },

  abdelfattah: async (c) => {
    if (chapter() === 2) {
      await c.say('abdelfattah', cycle('abdel_ch2', [
        'Sheikh Nasser\'s quiz? Remember, my boys: there are correct answers... and there are SHEIKH NASSER\'S answers.',
        'Use what you have. Mostafa has a phone. Hussein has that face. Hefny has... a temper. Even a temper can be useful.',
        'He waited all year for this quiz. Be gentle with him.',
      ]));
      return;
    }
    await c.say('abdelfattah', cycle('abdel_talks', [
      'Arabic grammar is like life, my boys. Nobody understands it. We all pretend.',
      'Mostafa, they tell me you talk to computers now. Do they answer? Mine just says "Not Responding."',
      'Hefny, a doctor! Finally someone who can check my blood pressure after teaching Hussein.',
    ]));
  },

  habeba: async (c) => {
    await c.say('habeba', by(c, {
      mostafa: 'Still here, Mostafa? I thought you three left.',
      hussein: 'Hussein! Did you get locked in again? ...Again again?',
      hefny: 'Hefny! Karim says hi. He says it a lot, actually. He likes saying hi.',
    }));
    if (c.leader === 'hefny') { c.tint('hefny', 0xff5050, 900); c.emote('hefny', '#'); }
    if (c.leader === 'hussein') c.emote('hussein', '<3');
  },

  auntie: async (c) => {
    await c.say('auntie', by(c, {
      mostafa: 'Still here, ya Mostafa? Paperwork? Ya habibi, I have been waiting for MY paperwork since 1998.',
      hussein: 'Still here, Hussein? Good. The 2 pounds are still here too.',
      hefny: 'Eat something, ya doctor. Quizzes on an empty stomach are haram.',
    }));
  },

  gate: async (c) => {
    if (flag('gate_open')) return c.say('narrator', 'The gate is open. The street smells like freedom and ful.');
    await c.say('narrator', '"NO STUDENT LEAVES WITHOUT A SIGNED CLEARANCE FORM (E5LA2 TARAF). — The Administration"');
    const n = signed();
    if (n === 0) await c.say('narrator', 'You have no form. You have no signatures. You have each other. That is not enough.');
    else await c.say('narrator', ['', 'Signatures so far: 1 of 6.', 'Signatures so far: 2 of 6.', 'Signatures so far: 3 of 6.', 'Signatures so far: 4 of 6.', 'Signatures so far: 5 of 6.', 'All six signatures. The padlock is still on.'][n]);
  },
};

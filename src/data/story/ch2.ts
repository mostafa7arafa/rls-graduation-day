// CHAPTER 2 — "The Quiz". The gate needs an e5la2 taraf (clearance form) now. Sheikh Nasser holds it,
// and the key to the stairs. His quiz has right answers, and Sheikh Nasser's answers.
import { flag, setFlag, giveItem } from '../../systems/save';
import { by, chapter } from './types';
import type { Script, Npc, Spot } from './types';
import { sandwichTalk } from './ch5';

export function objective(): string {
  if (flag('sig_nasser')) return 'Go upstairs to Mr Yasser (stairs: west corridor).';
  if (flag('met_nasser')) return 'Pass Sheikh Nasser\'s quiz (the mosque corner).';
  return 'Find Sheikh Nasser: mosque corner, by the court.';
}

export const start: Script = async (c) => {
  await c.say('narrator', 'The gate slams shut behind you. Click. The padlock is back. With a new note.');
  await c.say('narrator', '"NO STUDENT LEAVES WITHOUT A SIGNED CLEARANCE FORM (E5LA2 TARAF). — The Administration"');
  c.emote('hussein', '!');
  await c.say('hussein', 'E5la2 taraf?! My dad lost a whole year of his life to one of those.');
  await c.say('mostafa', 'The final boss of every Egyptian. Paperwork.');
  await c.say('hefny', 'Fine. Sheikh Nasser first. The mosque corner is by the court.');
};

export const NPCS: Npc[] = [
  { id: 'nasser', x: 21, y: 37, dir: 'down', when: () => chapter() >= 2, script: async (c) => {
    if (await sandwichTalk(c, 'nasser')) return;
    if (flag('sig_nasser')) {
      return c.say('nasser', by(c, {
        mostafa: 'Mostafa! Ask your computer about me. It will say: "Sheikh Nasser. Always right."',
        hussein: 'Hussein, my son. You agreed with me seven times today. That is seven more than Hefny.',
        hefny: 'Hefny. Habibi. One day you will understand that spiders have six legs.',
      }));
    }
    if (!flag('met_nasser')) {
      setFlag('met_nasser');
      await c.say('narrator', 'Sheikh Nasser sits in the mosque corner, prayer beads clicking, radiating total confidence.');
      await c.say('nasser', 'Ahlan, ahlan! My three boys! Sit, sit. Today is a big day. Today... you learn the TRUTH.');
      await c.say('nasser', 'Before I sign your e5la2 taraf, a small quiz. General knowledge. Very easy. I prepared it myself.');
      await c.say('hefny', 'General knowledge? Sheikh, you teach religion.');
      await c.say('nasser', 'Knowledge is knowledge, ya Hefny. And I know ALL of it.');
      await c.say(c.leader, by(c, {
        mostafa: '(whispering) Guys. Whatever he says... we agree. Okay? We agree.',
        hussein: 'Is it multiple choice? I\'m very good at guessing. Statistically.',
        hefny: '(muttering) If he says the sun goes around the earth, I\'m leaving.',
      }));
    } else {
      await c.say('nasser', 'Back again? Good, good. Knowledge needs repetition. Like my answers.');
    }
    const won = await c.battle('nasser');
    if (won) {
      setFlag('sig_nasser'); setFlag('stairs_open');
      await c.say('nasser', 'MashaAllah! You are the first students to agree with me in twenty years.');
      await c.say('nasser', 'Here. Your e5la2 taraf, with my signature. And the key to the stairs.');
      giveItem('form'); c.toast('Got: CLEARANCE FORM (1/6 signed)');
      await c.say('nasser', 'The stairs have been chained since Hussein\'s 2016 incident.');
      c.emote('hussein', '...');
      await c.say('hussein', 'It was ONE banister. And it was already loose.');
      await c.say('nasser', 'Go upstairs. Mr Yasser is waiting. He said to tell Hussein: "spell your name."');
      await c.say('hussein', '...H... U... S... why is he like this.');
      await c.say('hussein', 'Sheikh, one last thing. Spiders. It\'s eight legs, right? Between us?');
      await c.say('nasser', 'Six.');
      await c.say('hussein', 'Six. Got it. Six.');
      c.emote('hefny', '#');
      await c.say('hefny', 'I am going to need therapy after this quiz. Medical school can wait.');
      c.sync();
      c.toast('The stairs are open (west end of the corridor)');
    } else {
      await c.say('nasser', 'Wrong, wrong, and... creatively wrong. Go, think, come back.');
      await c.say('nasser', '(He is smiling. He has never had this much fun.)');
    }
  } },
];

export const SPOTS: Spot[] = [
  { x: 1, y: 11, w: 3, h: 2, when: () => !flag('stairs_open'), script: async (c) => {
    await c.say('narrator', 'The stairs are chained. A sign: "CLOSED SINCE HUSSEIN\'S 2016 INCIDENT."');
    await c.say(c.leader, by(c, {
      mostafa: 'What did you DO, Hussein?',
      hussein: 'Nobody can prove anything.',
      hefny: 'I was there. I still have nightmares.',
    }));
  } },
  { x: 18, y: 38, w: 8, h: 3, when: () => chapter() >= 2, script: async (c) => {
    await c.say('narrator', 'The prayer mats. Freshly vacuumed. Sheikh Nasser vacuums them himself, every morning, while explaining why vacuums are a Western conspiracy.');
  } },
];

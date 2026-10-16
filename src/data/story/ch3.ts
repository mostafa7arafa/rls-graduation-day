// CHAPTER 3 — "Spelling Rain". Upstairs. Mr Yasser (English) spent six years picking on Hussein.
// Today Hussein catches words with his goalkeeper gloves — and spells the one word he truly knows: TRACTOR.
import { flag, setFlag, bump } from '../../systems/save';
import { by, chapter } from './types';
import type { Script, Npc, Spot } from './types';
import { start as chapter4Start } from './ch4';
import { sandwichTalk } from './ch5';

export function objective(): string {
  if (flag('met_yasser')) return 'Pass Mr Yasser\'s spelling test (English room).';
  return 'Find Mr Yasser: the English room, first floor.';
}

const cycle = (key: string, lines: string[]) => lines[(bump(key) - 1) % lines.length];
const F = 'first';

/** first time up the stairs */
export const enterFirst: Script = async (c) => {
  setFlag('chapter', 3);
  await c.chapter(3, 'Spelling Rain');
  await c.say('narrator', 'The first floor. It smells like whiteboard markers and fear.');
  c.emote('ibrahim', '!');
  await c.say('ibrahim', 'My old students! Mostafa. Hefny. And... Hussein. Welcome, welcome to the first floor.');
  await c.say('ibrahim', 'Two years I taught you social studies. I still keep your essays. I read them when I need to laugh.');
  await c.say('hussein', 'You KEPT them?');
  await c.say('ibrahim', 'Hussein\'s essay on Egypt: "Egypt is a country. It is hot. The end." I framed it.');
  await c.say('hefny', 'Mine was twelve pages.');
  await c.say('ibrahim', 'Yours was thirteen, Hefny. You wrote a page apologising that it was only twelve.');
  await c.say('ibrahim', 'Mr Yasser is in the English room, the first door. Be brave. Spell carefully.');
};

export const NPCS: Npc[] = [
  { id: 'ibrahim', map: F, x: 7, y: 11, dir: 'down', script: async (c) => {
    if (await sandwichTalk(c, 'ibrahim')) return;
    if (chapter() === 3 && !flag('sig_yasser')) {
      return c.say('ibrahim', cycle('ibrahim3', [
        'Mr Yasser has been standing at that board since seven in the morning. With his red pen. Waiting.',
        'Social studies fact: Rashid is the centre of the world. I marked it on the map. Go and check.',
        'The teachers\' lounge is at the end, on the left. Do not go in. Nobody comes out the same.',
      ]));
    }
    await c.say('ibrahim', by(c, {
      mostafa: 'Mostafa, my son. You fixed my projector in my class every single week. When your computers rule the world, tell them I was kind to you.',
      hussein: 'Hussein! Two years by my window. You know more about the courtyard pigeons than about the Nile.',
      hefny: 'Hefny, the lab is that way. I can see in your eyes that you want to go to the lab.',
    }));
  } },

  { id: 'yasser', map: F, x: 5, y: 2, dir: 'down', script: async (c) => {
    if (flag('sig_yasser')) {
      return c.say('yasser', by(c, {
        mostafa: 'Mostafa. Your code comments. I have read them. "Fix this later lol." Twelve years of English for "lol".',
        hussein: 'T-R-A-C-T-O-R. I still cannot believe it. I will be thinking about it for a long time.',
        hefny: 'Doctor Hefny. Write your prescriptions clearly. The whole world is counting on your spelling.',
      }));
    }
    if (!flag('met_yasser')) {
      setFlag('met_yasser');
      await c.say('narrator', 'Mr Yasser stands at the board, red pen in hand, like a sniper.');
      await c.say('yasser', 'Well, well. Mostafa. Hefny. And... Hussein. Or, as I spell it: H-O-P-E-L-E-S-S.');
      c.emote('hussein', '...');
      await c.say('hussein', 'That\'s... actually spelled right. I\'m hurt AND impressed.');
      await c.say('yasser', 'You want my signature? Then SPELL. In English. Correctly. For once in your life.');
      if (c.leader === 'mostafa') {
        await c.say('mostafa', 'Mr Yasser, I write English every day. Code is basically English.');
        await c.say('yasser', 'Code is NOT English. "Def"? "Elif"? Those are not WORDS, Mostafa.');
      } else if (c.leader === 'hussein') {
        await c.say('hussein', 'Mr Yasser, I\'ve been practising.');
        await c.say('yasser', 'Practising what? Excuses?');
      } else {
        await c.say('hefny', 'Sir, we\'re a doctor and an engineer now. Can we skip this?');
        await c.say('yasser', 'Doctor Hefny. Spell "stethoscope". ...Exactly.');
      }
      await c.say('yasser', 'Hussein. You are a goalkeeper, yes? Then CATCH.');
      await c.say('hefny', 'Hussein. Breathe. B-R-E-A-T-H-E.');
      await c.say('hussein', 'DON\'T SPELL AT ME.');
    } else {
      await c.say('yasser', 'Back for more red ink? Gloves on, Hussein.');
    }
    const won = await c.battle('yasser');
    if (!won) {
      await c.say('yasser', 'As expected. Go. Read a dictionary. Any dictionary.');
      return;
    }
    await c.say('yasser', 'Hmph. Acceptable. Barely.');
    await c.say('yasser', 'One last word. For Hussein only. No gloves. Spell... TRACTOR.');
    c.emote('mostafa', '...'); c.emote('hefny', '...');
    await c.wait(600);
    await c.say('hussein', 'T. R. A. C. T. O. R.');
    await c.say('narrator', 'Perfect. Flawless. Mr Yasser drops his red pen.');
    c.emote('yasser', '!');
    await c.say('yasser', 'How... how do you know THAT one?');
    await c.say('hussein', 'I drive one, Mr Yasser. On my family\'s farm. Every weekend.');
    await c.say('hussein', 'I can\'t spell "because". But I can spell the thing I drive to school when the bus is late.');
    await c.say('mostafa', '...You drive a TRACTOR to school?');
    await c.say('hussein', 'Only on important days.');
    await c.say('yasser', '...Signed. And Hussein... maybe I was too hard on you.');
    await c.say('hussein', 'Maybe?');
    await c.say('yasser', '...I was too hard on you. Now go, before I change my mind.');
    c.emote('hussein', '<3');
    setFlag('sig_yasser');
    c.toast('Signature 2/6: Mr Yasser (English)');
    await chapter4Start(c);
  } },

  // the teachers' lounge: three young teachers, infinite gossip
  { id: 'doaa', map: F, x: 2, y: 16, dir: 'side', flip: true, script: async (c) => {
    if (await sandwichTalk(c, 'doaa')) return;
    if (c.leader === 'hefny') {
      await c.say('doaa', 'Doctor Hefny! My back hurts when I do this. *does this* What do I have?');
      await c.say('hefny', 'You have... a back, Miss.');
      return;
    }
    await c.say('doaa', by(c, {
      mostafa: 'Mostafa! Can you fix the lounge printer? It has printed only the letter Q since March.',
      hussein: 'Hussein! You still owe me one homework. From 2017. I am not angry. I am DISAPPOINTED.',
      hefny: '',
    }));
  } },
  { id: 'shimaa', map: F, x: 10, y: 16, dir: 'side', script: async (c) => {
    if (c.leader === 'mostafa') {
      await c.say('shimaa', 'Mostafa, is it true? A robot can correct two hundred exam papers?');
      await c.say('mostafa', 'Yes, Miss.');
      await c.say('shimaa', 'Then WHY have I been doing it by hand for six years?!');
    } else if (c.leader === 'hussein') {
      await c.say('shimaa', 'Hussein. You were the only student in history to write "I don\'t know" on a multiple-choice exam.');
      await c.say('hussein', 'It was honest.');
    } else {
      await c.say('shimaa', 'Hefny, I heard Karim parked inside the school again. Don\'t get angry. ...You\'re getting angry.');
      c.tint('hefny', 0xff5050, 1200); c.emote('hefny', '#');
    }
  } },
  { id: 'hager', map: F, x: 13, y: 17, dir: 'down', script: async (c) => {
    if (c.leader === 'mostafa') {
      await c.say('hager', 'Mostafa! Quick! How do I delete a message I sent to the teachers\' WhatsApp group an hour ago?');
      await c.say('mostafa', 'After an hour? You can\'t, Miss.');
      await c.say('hager', '...Then I need a new identity.');
    } else if (c.leader === 'hussein') {
      await c.say('hager', 'Hussein! Smile! *selfie* For the teachers\' group. Caption: "He graduated. We are all shocked."');
    } else {
      await c.say('hager', 'Hefny, Habeba is downstairs. With Karim. I\'m just saying. I\'m not saying anything. I\'m just saying.');
      c.tint('hefny', 0xff5050, 1200);
    }
  } },
];

export const SPOTS: Spot[] = [
  { map: F, x: 3, y: 1, w: 2, script: async (c) => {
    await c.say('narrator', 'The board says: "TODAY: SPELLING. HUSSEIN: FRONT ROW. HUSSEIN: NO GLOVES IN CLASS."');
    if (c.leader === 'hussein') await c.say('hussein', 'The gloves stay. The gloves are part of me.');
  } },
  { map: F, x: 15, y: 1, w: 3, script: (c) => c.say('narrator', 'Shelves of colourful bottles. One label says: "DO NOT LET HUSSEIN NEAR". It is on every bottle.') },
  { map: F, x: 21, y: 1, w: 3, script: (c) => c.say('narrator', 'More bottles. One is bubbling. Nobody has touched it since 2014. It is still bubbling.') },
  { map: F, x: 31, y: 1, w: 2, script: (c) => c.say('narrator', 'The board: "PRIVATE LESSONS: 200LE / hour. GROUP DISCOUNT: none. FAMILY DISCOUNT: also none."') },
  { map: F, x: 27, y: 14, w: 2, script: (c) => c.say('narrator', 'A world map. Rashid is marked with a big red dot. Mr Ibrahim insists it is the centre of the world.') },
  { map: F, x: 5, y: 10, script: (c) => c.say('narrator', 'NOTICE: "English club cancelled. Reason: Hussein joined."') },
  { map: F, x: 16, y: 10, script: (c) => c.say('narrator', 'NOTICE: "Science fair 2019 — winner: Mohamed Hefny. Runner-up: also Mohamed Hefny (second project)."') },
  { map: F, x: 27, y: 10, script: (c) => c.say('narrator', 'NOTICE: "Math private lessons: ask Mr Abdelkareem. Prices negotiable." Someone has added: "(they are not)".') },
  { map: F, x: 36, y: 10, script: (c) => c.say('narrator', 'NOTICE: "LOST: one whistle. If found, return to Mr Amr. Do NOT blow it. He will come."') },
  { map: F, x: 24, y: 10, script: (c) => c.say('narrator', 'The first-floor water cooler. Even warmer than the ones downstairs. Heat rises. Science.') },
  { map: F, x: 4, y: 14, script: (c) => c.say('narrator', 'LOUNGE RULES: 1. No students. 2. Seriously, no students. 3. Hussein: especially.') },
  { map: F, x: 12, y: 15, w: 2, script: (c) => c.say('narrator', 'The teachers\' sofa. Students who sit on it are never seen again.') },
];

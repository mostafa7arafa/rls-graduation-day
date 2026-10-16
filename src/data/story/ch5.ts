// CHAPTER 5 — "The Private Lesson". Mr Abdelkareem (math) sells everything, including his signature.
// The only currency he trusts: ful sandwiches. Collect them around the school (some only for the right
// friend), then haggle. Hefny hates math: his rage is a weapon that can blow the whole deal.
import { flag, setFlag, count, bump } from '../../systems/save';
import { by, chapter } from './types';
import type { Script, Npc, Spot, Ctx } from './types';
import { start as chapter6Start } from './ch6';
import { fmt } from '../../systems/i18n';

const F = 'first';
export const MIN_SANDWICHES = 4;
export const sandwiches = () => count('sandwiches');

/** give sandwiches once per source (flag), with a toast */
function gift(c: Ctx, source: string, n: number) {
  if (flag(`sw_${source}`)) return false;
  setFlag(`sw_${source}`);
  for (let i = 0; i < n; i++) bump('sandwiches');
  c.toast(fmt(n === 1 ? 'Got: 1 FUL SANDWICH' : 'Got: {n} FUL SANDWICHES', { n }));
  return true;
}
/** chapter-5 sandwich lines for characters who live in other files (returns false if nothing to say) */
export async function sandwichTalk(c: Ctx, who: string): Promise<boolean> {
  if (chapter() !== 5 || !flag('met_abdelkareem') || flag('sig_abdelkareem')) return false;
  switch (who) {
    case 'auntie':
      if (flag('sw_auntie')) return false;
      await c.say('auntie', 'Sandwiches? For Abdelkareem?! That man once charged me for telling me the time.');
      if (c.leader === 'hussein') {
        await c.say('hussein', '...Auntie. Here. Two pounds. From 2019. With interest: zero.');
        c.emote('auntie', '<3');
        await c.say('auntie', 'HUSSEIN PAID! Habibi! Take three! Take four! Take the whole tray!');
        gift(c, 'auntie', 4);
      } else {
        await c.say('auntie', 'Take two. For the cause. But tell Hussein: I have not forgotten.');
        gift(c, 'auntie', 2);
      }
      return true;
    case 'ibrahim':
      if (flag('sw_ibrahim')) return false;
      await c.say('ibrahim', 'A sandwich? I always carry a spare. Social studies teaches you one thing: be ready for war.');
      gift(c, 'ibrahim', 1);
      return true;
    case 'doaa':
      if (flag('sw_doaa')) return false;
      if (c.leader !== 'mostafa') { await c.say('doaa', 'I have a sandwich for whoever fixes this printer. ...Is Mostafa with you?'); return true; }
      await c.say('narrator', 'Mostafa opens the printer, frowns, and turns it off and on again.');
      await c.say('narrator', 'It prints the letter Q. Then everything else. In the right order.');
      await c.say('doaa', 'A MIRACLE! Take my sandwich. Take my respect. Take the printer if you want.');
      gift(c, 'doaa', 1);
      return true;
    case 'hassan':
      if (flag('sw_hassan')) return false;
      if (c.leader !== 'hussein') { await c.say('hassan', 'Sandwiches for Abdelkareem? Hmph. Send Hussein. Only Hussein.'); return true; }
      await c.say('hassan', 'Hussein. Take mine. Do not make that face. I am not being nice. I am just not hungry.');
      await c.say('hassan', '...Fine. I am being nice. Tell no one.');
      gift(c, 'hassan', 1);
      return true;
    case 'habeba':
      if (flag('sw_habeba')) return false;
      if (c.leader !== 'hussein') { await c.say('habeba', 'I only brought half a sandwich. ...Is Hussein okay? He looked hungry.'); return true; }
      await c.say('habeba', 'Hussein, you look hungry. Here, take half my sandwich.');
      c.emote('hussein', '<3');
      await c.say('narrator', 'Hussein receives half a sandwich from Habeba. He will never eat it. He will frame it.');
      await c.say('mostafa', 'Hussein. Hussein, we need that for the math teacher.');
      await c.say('hussein', '...For the cause. Goodbye, sandwich.');
      gift(c, 'habeba', 1);
      return true;
    case 'nasser':
      if (flag('sw_nasser')) return false;
      await c.say('nasser', 'A sandwich? First, a question: what is ful made of?');
      if (c.leader === 'hefny') {
        await c.say('hefny', 'Fava beans, Sheikh.');
        await c.say('nasser', 'Wrong! It is made of LOVE. ...And fava beans. Take it.');
      } else {
        await c.say(c.leader, 'Love, Sheikh?');
        await c.say('nasser', 'CORRECT! Finally, a student who listens. Take it.');
      }
      gift(c, 'nasser', 1);
      return true;
  }
  return false;
}

export function objective(): string {
  if (!flag('met_abdelkareem')) return 'Get Mr Abdelkareem\'s signature (math room, east).';
  if (sandwiches() < MIN_SANDWICHES) return fmt('Collect ful sandwiches ({n}/{m}).', { n: sandwiches(), m: MIN_SANDWICHES });
  return fmt('Haggle with Mr Abdelkareem ({n} sandwiches).', { n: sandwiches() });
}

export const start: Script = async (c) => {
  setFlag('chapter', 5);
  await c.chapter(5, 'The Private Lesson');
  await c.say('narrator', 'Across the corridor, a calculator beeps. Somewhere, money is being counted.');
  await c.say('mostafa', 'Mr Abdelkareem. Math.');
  c.tint('hefny', 0xff5050, 1400); c.emote('hefny', '#');
  await c.say('hefny', 'MATH.');
  await c.say('hussein', 'He once charged me for a lesson I didn\'t attend. "Absence fee."');
};

export const NPCS: Npc[] = [
  { id: 'abdelkareem', map: F, x: 31, y: 2, dir: 'down', script: async (c) => {
    if (chapter() < 5) {
      return c.say('abdelkareem', 'Private lessons: Tuesdays and Thursdays. Group lessons: same price, times three. Next.');
    }
    if (flag('sig_abdelkareem')) {
      return c.say('abdelkareem', by(c, {
        mostafa: 'Mostafa! Your salary, as an engineer. Ballpark. For no reason. ...Okay, for a reason.',
        hussein: 'Hussein. I will miss you. You were my most profitable student. You failed so CONSISTENTLY.',
        hefny: 'Hefny. Habibi. One day you will love math. And on that day, my lessons are 300 an hour.',
      }));
    }
    if (!flag('met_abdelkareem')) {
      setFlag('met_abdelkareem');
      await c.say('narrator', 'Mr Abdelkareem is counting a stack of bills. He does not look up.');
      await c.say('abdelkareem', 'A signature? Of course, of course. My signature is FREE.');
      await c.say('abdelkareem', '...The PEN is five hundred pounds.');
      await c.say('mostafa', 'We don\'t have five hundred pounds.');
      await c.say('abdelkareem', 'Then what DO you have?');
      await c.say('hussein', '...Ful sandwiches?');
      c.emote('abdelkareem', '!');
      await c.say('abdelkareem', 'Ful sandwiches. NOW we are talking business. Inflation, habibi. Sandwiches are the only stable currency.');
      await c.say('abdelkareem', 'Bring me sandwiches. At least four. Then we negotiate.');
      await c.say('hefny', 'Where are we supposed to find sandwiches?!');
      await c.say('mostafa', 'Everyone in this school owes us something. Let\'s collect.');
      c.tint('hefny', 0xff5050, 1200);
      await c.say('hefny', 'Hussein. Hold me back. If he says the word "fraction" I will lose control.');
      await c.say('hussein', 'I\'m not holding you back. I\'m hiding behind you.');
      c.toast('Collect ful sandwiches from people around the school');
      return;
    }
    if (sandwiches() < MIN_SANDWICHES) {
      return c.say('abdelkareem', sandwiches() === 0
        ? 'No sandwiches? Then why are you breathing my air? Air is also not free.'
        : 'That is not enough sandwiches. I have standards. Four, minimum. I can count, you know. Professionally.');
    }
    await c.say('abdelkareem', 'Ahh. I can smell them. Sit. The lesson begins.');
    const won = await c.battle('abdelkareem');
    if (!won) {
      await c.say('abdelkareem', 'Lesson over. Come back when you are serious. The sandwiches stay with you. For now.');
      return;
    }
    setFlag('sig_abdelkareem');
    await c.say('abdelkareem', 'A pleasure doing business. Here. Signed. With the five-hundred-pound pen.');
    await c.say('abdelkareem', '...You know, I never actually needed the money. I just like winning.');
    await c.say('abdelkareem', 'And you three... you beat me. In MY classroom. I am almost proud. Almost. Go.');
    c.toast('Signature 4/6: Math (Mr Abdelkareem)');
    await chapter6Start(c);
  } },
];

export const SPOTS: Spot[] = [
  { map: F, x: 24, y: 10, when: () => chapter() === 5 && !flag('sw_cooler') && flag('met_abdelkareem'), script: async (c) => {
    await c.say('narrator', 'Behind the water cooler: a ful sandwich. Still warm. Like the water.');
    gift(c, 'cooler', 1);
  } },
  { map: F, x: 33, y: 5, w: 3, h: 3, when: () => chapter() >= 5, script: (c) => c.say('narrator', 'Math desks. Someone carved "2+2=5 (Mr Abdelkareem charges for the extra 1)".') },
];

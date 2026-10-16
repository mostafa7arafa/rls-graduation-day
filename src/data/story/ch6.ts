// CHAPTER 6 — "Push-Ups". Mr Amr, gym teacher, thirty years without sitting down once.
// He wants his signature earned on the court: push-ups, jumping jacks and burpees, on the darbuka beat.
import { flag, setFlag } from '../../systems/save';
import { by, chapter } from './types';
import type { Script, Npc, Spot } from './types';
import { start as chapter7Start } from './ch7';

export function objective(): string {
  if (flag('met_amr')) return 'Survive Mr Amr\'s workout (the court).';
  return 'Find Mr Amr: the court, downstairs.';
}

export const start: Script = async (c) => {
  setFlag('chapter', 6);
  await c.chapter(6, 'Push-Ups');
  await c.say('narrator', 'A whistle. From the court downstairs. Very loud. It goes on for eleven seconds.');
  await c.say('hussein', 'Mr Amr. He can smell people who skipped gym.');
  await c.say('mostafa', 'We ALL skipped gym.');
  await c.say('hefny', 'I had a doctor\'s note!');
  await c.say('mostafa', 'You wrote it yourself.');
  c.emote('hefny', '#');
  await c.say('hefny', 'I am GOING to be a doctor! It counts!');
};

export const NPCS: Npc[] = [
  { id: 'amr', x: 28, y: 25, dir: 'down', when: () => !flag('ceremony'), script: async (c) => {
    if (chapter() < 6) {
      return c.say('amr', '*TWEEEET* TWENTY MORE LAPS! ...Oh. You are not my class. Carry on. Walk faster.');
    }
    if (flag('sig_amr')) {
      return c.say('amr', by(c, {
        mostafa: 'Mostafa! Engineers sit all day. Stand up every hour. I will know if you do not.',
        hussein: 'Hussein. Four pulled muscles. A school record. I put it on the notice board.',
        hefny: 'Hefny! That anger? That is ENERGY. Use it for push-ups, not for Karim.',
      }));
    }
    if (!flag('met_amr')) {
      setFlag('met_amr');
      c.shake(0.003, 400);
      await c.say('amr', '*TWEEEEEEEEEEET* YOU THREE! I know you! Twelve years! Twelve years of "my leg hurts", "I forgot my shoes", "I have a doctor\'s note"!');
      await c.say('hefny', 'It was a REAL note.');
      await c.say('amr', 'It was in YOUR handwriting, Hefny.');
      await c.say('amr', 'My signature? Earn it. Push-ups, on the beat. Like real athletes. Like the national team.');
      await c.say(c.leader, by(c, {
        mostafa: 'Mr Amr, I sit at a desk for a living. My body is mostly coffee.',
        hussein: 'I\'m a goalkeeper, Mr Amr. I don\'t do push-ups. I do DIVES.',
        hefny: 'Doctors don\'t need push-ups. We need... clean hands.',
      }));
      await c.say('hussein', 'Mr Amr, I\'m injured. Permanently. Since 2009.');
      await c.say('amr', 'Then you are WARMED UP. Arrows on the beat! When the arrow hits the line! GO!');
      await c.say('hefny', '(to Hussein) If I die doing push-ups, tell the medical school I was brave.');
      await c.say('hussein', 'I\'ll tell them you were Hefny. They\'ll understand.');
    } else {
      await c.say('amr', 'BACK FOR MORE! Good! Pain is just weakness leaving the body!');
      if (c.leader === 'hussein') await c.say('hussein', 'It\'s leaving through my back, Mr Amr.');
    }
    const won = await c.battle('amr');
    if (!won) {
      await c.say('amr', 'Rest. Drink water. Not the cooler water, it is warm. Then come back.');
      return;
    }
    setFlag('sig_amr');
    await c.say('amr', '...Not bad. NOT BAD! Hussein, you pulled four muscles. A new record. I am proud.');
    await c.say('amr', 'Signed. Thirty years, and you three finally came to gym. On the last day.');
    c.toast('Signature 5/6: Sport (Mr Amr)');
    await chapter7Start(c);
  } },
];

export const SPOTS: Spot[] = [];

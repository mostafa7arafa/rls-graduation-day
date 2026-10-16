// CHAPTER 4 — "Doctor Hefny". The science lab: Mr Abdo and Mr Ahmed Rezk, who have disagreed about
// everything since 1994. Hussein and Mostafa are banned (the beaker incident; the fume hood that played
// Amr Diab), so Hefny goes in alone. Four potions, two teachers, one Hefny.
import { flag, setFlag, state } from '../../systems/save';
import { by, chapter } from './types';
import type { Script, Npc, Spot } from './types';
import { start as chapter5Start } from './ch5';

const F = 'first';
const solo = () => state.flags.solo === 'hefny';

export function objective(): string {
  if (solo()) return 'Brew the potions (talk to the lab teachers).';
  return 'Get the science signature (the lab, next door).';
}

export const start: Script = async (c) => {
  setFlag('chapter', 4);
  await c.chapter(4, 'Doctor Hefny');
  c.shake(0.004, 400);
  await c.say('narrator', 'Next door, something explodes. Gently.');
  c.emote('hefny', '<3');
  await c.say('hefny', 'The LAB. Mr Abdo and Mr Ahmed Rezk.');
  await c.say('hussein', 'Why does he look at the lab the way I look at Habeba?');
  await c.say('mostafa', 'Because the lab looks back.');
};

const lab: Script = async (c) => {
  if (chapter() < 4) {
    c.shake(0.003, 300);
    return c.say('abdo', 'Not now! NOT NOW! The reaction is at a very delicate stage! Come back later!');
  }
  if (flag('sig_lab')) {
    return c.say('rezk', by(c, {
      mostafa: 'Mostafa. The fume hood still hums Amr Diab sometimes. At night. We are scared of it.',
      hussein: 'Hussein. Stay. Behind. The. Line.',
      hefny: 'Doctor Hefny! Come back and visit. Bring safety goggles. Bring two.',
    }));
  }
  if (!solo()) {
    c.emote('abdo', '!');
    await c.say('abdo', 'STOP! Who enters the lab? ...Ah. Hefny. And... the other two.');
    await c.say('rezk', 'Hussein is banned from the lab. Since 2017. The beaker incident.');
    await c.say('hussein', 'It was ONE beaker!');
    await c.say('rezk', 'It was forty beakers, Hussein. Forty. We counted them in pieces.');
    await c.say('abdo', 'And Mostafa is banned since he "fixed" the fume hood. It played Amr Diab for a whole term.');
    await c.say('mostafa', 'That was a feature.');
    await c.say('rezk', 'Only Doctor Hefny may stay. You two: corridor.');
    await c.say('hussein', 'Hefny. If they keep you in here forever, I\'m taking your sandwich.');
    await c.say('hefny', 'If they keep me in here forever, I will finally be happy.');
    await c.say('narrator', 'Mostafa and Hussein are escorted out. Hussein waves sadly through the little door window.');
    c.solo('hefny');
    c.sync();
    await c.say('hefny', '...Alone. In the lab. This is the best day of my life.');
    await c.say('abdo', 'Our signature costs four potions, Doctor.');
    await c.say('rezk', 'Brewed MY way.');
    await c.say('abdo', 'MY way.');
  } else {
    await c.say('abdo', 'Back to the bench, Doctor! Mr Ahmed Rezk has already cleaned up. Badly.');
  }
  const won = await c.battle('lab');
  if (!won) {
    await c.say('rezk', 'Clean up. Then try again. ...Please clean up.');
    return;
  }
  setFlag('sig_lab');
  await c.say('rezk', 'Signed. By both of us. Separately. We do not share pens.');
  c.toast('Signature 3/6: Science (Mr Abdo & Mr Ahmed Rezk)');
  await c.say('abdo', 'Go, Doctor. Save lives. Start with your friends. They look hungry.');
  c.solo(null);
  await c.teleport(F, 20.5, 12.5, 'down');
  await c.say('hussein', 'Did you blow anything up?');
  await c.say('hefny', 'Three things. On purpose.');
  await c.say('mostafa', 'Your hair is... bigger.');
  await c.say('hefny', 'Science has a price.');
  await chapter5Start(c);
};

export const NPCS: Npc[] = [
  { id: 'abdo', map: F, x: 18, y: 2, dir: 'down', script: lab },
  { id: 'rezk', map: F, x: 22, y: 2, dir: 'down', script: lab },
  // while Hefny is alone inside, the other two wait in the corridor
  { id: 'mostafa_wait', sprite: 'mostafa', map: F, x: 18, y: 11, dir: 'down', when: solo, script: async (c) => {
    await c.say('mostafa', 'If you see the fume hood, tell it I said hi. And that I\'m sorry. And that it was worth it.');
  } },
  { id: 'hussein_wait', sprite: 'hussein', map: F, x: 22, y: 11, dir: 'down', when: solo, script: async (c) => {
    await c.say('hussein', 'Bring me a souvenir. Something small. Something that explodes.');
  } },
];

export const SPOTS: Spot[] = [
  { map: F, x: 16, y: 4, w: 3, h: 3, when: () => chapter() >= 4, script: (c) => c.say('narrator', 'A lab bench. Scorch marks shaped like a small Hussein. Nobody talks about it.') },
  { map: F, x: 21, y: 4, w: 3, h: 3, when: () => chapter() >= 4, script: (c) => c.say('narrator', 'Another bench. A sign: "MR ABDO\'S SIDE". Across the line, another sign: "MR AHMED REZK\'S SIDE. WE DO NOT CROSS."') },
  { map: F, x: 25, y: 2, script: (c) => c.say('narrator', 'The lab sink. It has three taps: hot, cold, and one nobody has ever dared to open.') },
];

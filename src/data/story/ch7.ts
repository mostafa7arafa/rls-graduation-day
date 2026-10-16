// CHAPTER 7 — "The Penalty". Karim "borrowed" the principal's stamp to stamp his own grades.
// Penalty shootout on the court, Hussein in goal, Habeba watching. Then the finale at the gate:
// Mr Abdelfattah's confession, Karim's dead car in the gateway, and Hussein's tractor.
import { flag, setFlag } from '../../systems/save';
import { by, chapter } from './types';
import type { Script, Npc, Spot } from './types';

const T = 16;

export function objective(): string {
  if (flag('sig_stamp')) return 'The form is complete! Go to the main gate.';
  return 'Beat Karim in the penalty shootout (the court).';
}

export const start: Script = async (c) => {
  setFlag('chapter', 7); setFlag('finale_started');
  c.sound('honk');
  await c.chapter(7, 'The Penalty', async () => { c.sync(); });
  await c.say('narrator', 'HONK. HONK. A car horn. Inside the school. Of course.');
  c.emote('karim', '!');
  await c.say('karim', 'Yo! The three musketeers! Still here? I graduated at nine this morning. Took me twenty minutes.');
  c.tint('hefny', 0xff4040, 1600); c.emote('hefny', '#');
  await c.say('hefny', 'KARIM.');
  await c.say('karim', 'Relax, Hefny. Looking for the principal\'s stamp? For your little form?');
  await c.say('narrator', 'Karim spins a rubber stamp on one finger. It says PRINCIPAL.');
  await c.say('karim', 'I borrowed it this morning. To stamp... some of my grades.');
  await c.say('mostafa', 'You stamped your own grades.');
  await c.say('karim', 'Efficiency, Mostafa. You of all people should respect that.');
  await c.say('hussein', 'Give it back, Karim.');
  await c.say('karim', 'Sure. Beat me. Penalties, five each. Hussein in goal, obviously. Habeba\'s watching. No pressure.');
  await c.say('habeba', 'Good luck... everyone!');
  c.emote('hussein', '<3');
  await c.say('hefny', 'Twelve years. I have waited TWELVE YEARS for this.');
};

export const NPCS: Npc[] = [
  { id: 'karim', x: 33, y: 29, dir: 'side', when: () => flag('finale_started') && !flag('karim_left'), script: async (c) => {
    if (flag('sig_stamp')) {
      return c.say('karim', by(c, {
        mostafa: 'Mostafa. If you ever build a robot goalkeeper, don\'t. Hussein is enough.',
        hussein: 'That save, man. That SAVE. I\'m going to see it every time I close my eyes.',
        hefny: '...See you around, Hefny. For real. Not in a bad way.',
      }));
    }
    await c.say('karim', 'Ready? Five each. Try not to cry, Hefny.');
    const won = await c.battle('karim');
    if (!won) {
      await c.say('karim', 'Hahaha! Again? Sure. I\'ve got all day. I literally have no classes. Ever.');
      return;
    }
    await c.say('narrator', 'Karim stares at the ball. Then at Hussein. Then at the ball again.');
    await c.say('karim', '...Nobody saves my penalties. Nobody.');
    await c.say('karim', 'You know... I had the car. The watch. The phone. Everything.');
    await c.say('karim', 'But I never had... this. Three idiots who stayed locked in a school all day, together, for a piece of paper.');
    await c.say('karim', 'Here. The stamp. ...You guys are alright.');
    c.emote('hefny', '...');
    await c.wait(500);
    await c.say('hefny', '...You\'re alright too, Karim.');
    await c.say('mostafa', 'Did Hefny just—');
    await c.say('hussein', 'Don\'t. Don\'t ruin it.');
    await c.say('habeba', 'Hussein! That save was AMAZING!');
    c.emote('hussein', '<3'); c.react('hussein', 'noo');
    await c.say('narrator', 'Hussein faints. Briefly. Gloriously.');
    setFlag('sig_stamp');
    c.toast('Signature 6/6: THE PRINCIPAL\'S STAMP');
  } },
  { id: 'habeba_court', sprite: 'habeba', x: 36, y: 33, dir: 'side', when: () => flag('finale_started'), script: async (c) => {
    await c.say('habeba', by(c, {
      mostafa: 'You three are really leaving, huh? It\'s going to be so quiet here.',
      hussein: 'Hussein! You were so cool today! ...Is your head okay? It\'s bleeding a little.',
      hefny: 'Hefny, you were nice to Karim! He\'s going to talk about it for a week.',
    }));
    if (c.leader === 'hussein') { c.emote('hussein', '<3'); await c.say('hussein', 'It\'s FINE. It\'s always bleeding a little.'); }
  } },
  { id: 'abdelfattah_gate', sprite: 'abdelfattah', x: 27, y: 40, dir: 'down', when: () => flag('abdel_at_gate'), script: async (c) => {
    await c.say('abdelfattah', 'Go, my boys. Go. Before I write another poem.');
  } },
];

export const SPOTS: Spot[] = [];

/** at the main gate with all six signatures */
export const finale: Script = async (c) => {
  c.music(null);
  await c.say('narrator', 'The padlock. The form. Six signatures and a stamp.');
  setFlag('abdel_at_gate'); c.sync();
  c.emote('abdelfattah', '!');
  await c.say('abdelfattah', 'WAIT! My boys! Wait!');
  await c.walk('abdelfattah', [[0, 2]]);
  await c.say('abdelfattah', 'Before you go... a confession. There is no "Administration".');
  await c.say('abdelfattah', 'I chained the gate. I wrote the notes. I asked every teacher to keep you here, one more day.');
  c.emote('hussein', '!'); c.emote('hefny', '!'); c.emote('mostafa', '!');
  await c.say('hussein', 'YOU?!');
  c.music('ending');
  await c.say('abdelfattah', 'Twelve years, habibi. Twelve years, and you were going to walk out of that gate without saying goodbye to anyone.');
  await c.say('abdelfattah', 'Mr Hassan wanted to tell Hussein he was his favourite. Sheikh Nasser wanted one more quiz. Mr Yasser wanted to say sorry.');
  await c.say('abdelfattah', 'Everyone here had... unfinished business. With you three.');
  await c.say('mostafa', '...That\'s actually really nice, sir.');
  await c.say('hefny', 'I\'m not crying. It\'s the oud perfume. It travels.');
  await c.say('abdelfattah', 'Here. The key. The REAL one.');
  c.openGate();
  await c.say('narrator', 'The gate swings open. And then, behind you: a sad little engine noise.');
  // Karim tries to leave first... and his car dies right in the gateway
  await c.teleport('ground', 22.5, 43.5, 'right');
  c.boxTop(true);
  c.sound('engine');
  await c.moveProp('car', -18 * T, 7 * T, 2600);
  c.sound('honk');
  await c.say('karim', 'After you— no, wait, me first— oh. Oh no.');
  await c.say('karim', 'Battery\'s dead. Sorry, guys. It\'s been parked here three years. I think it forgot how to drive.');
  await c.say('mostafa', 'Nobody knows how it got in. And now nobody can get out.');
  c.tint('hefny', 0xff4040, 1200); c.emote('hefny', '#');
  await c.say('hefny', 'I am going to LIFT it.');
  await c.say('hussein', 'Hefny. Sit.');
  await c.say('hussein', '...Leave this to me.');
  await c.say('narrator', 'Hussein takes out his phone.');
  await c.say('hussein', 'Baba? ...Yes. Bring the tractor. ...Yes, THE tractor. ...Yes. It is an important day.');
  await c.wait(800);
  setFlag('tractor_here'); c.sync();
  c.sound('engine');
  await c.moveProp('tractor', -26 * T, 0, 3200);
  await c.say('narrator', 'A green tractor rumbles down the street of Rashid. Children cheer. A goat follows it.');
  await c.say('hussein', 'Thanks, Baba!');
  await c.say('narrator', 'A rope. A tug. Karim\'s car rolls out of RLS for the first time in three years.');
  c.sound('engine');
  await Promise.all([
    c.moveProp('tractor', 34 * T, 0, 3400),
    (async () => { await c.moveProp('car', 0, 3 * T, 700); await c.moveProp('car', 34 * T, 0, 2700); })(),
  ]);
  await c.say('karim', 'MY CAR! ...Actually, thank you. I didn\'t know how to get it out.');
  c.sound('engine');
  await c.moveProp('tractor', -34 * T, 0, 3000);
  await c.say('narrator', 'A minute later, the tractor is back. Without the car. Nobody asks.');
  await c.say('hussein', 'Gentlemen. Your ride.');
  await c.say('mostafa', 'We are leaving our graduation... on a tractor.');
  await c.say('hefny', 'This is the best day of my life.');
  await c.say('hussein', 'You said that in the lab.');
  await c.say('hefny', 'It keeps getting BETTER.');
  // all aboard
  c.show('mostafa', false); c.show('hussein', false); c.show('hefny', false);
  c.swapProp('tractor', 'tractorRide');
  c.sound('engine');
  await c.moveProp('tractor', -36 * T, 0, 7000);
  await c.say('narrator', 'And so, on graduation day, three friends finally left Rosetta Language School.');
  await c.say('narrator', 'On a tractor. Followed by a goat. Exactly as everyone always knew they would.');
  await c.credits();
};

export const isFinaleReady = () => chapter() === 7 && flag('sig_stamp');

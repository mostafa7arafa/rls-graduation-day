// BENCH TALKS. Once per chapter, the three can sit on the court bench and just talk.
// No quests, no teachers: Hussein and Hefny being Hussein and Hefny, and the future getting closer.
import { flag, setFlag } from '../../systems/save';
import { chapter } from './types';
import type { Ctx, Script } from './types';

const TALKS: Record<number, Script> = {
  2: async (c) => {
    await c.say('hussein', 'So. Twelve years. What are you going to miss? Honestly.');
    await c.say('hefny', 'The lab. The smell of the lab. Mr Abdo shouting "INTERESTING" when something catches fire.');
    await c.say('hussein', 'The court. This court. Every scar on my body has an address here.');
    await c.say('hussein', 'Mostafa?');
    await c.say('mostafa', '...Honestly? This. Sitting here with you two, doing nothing important.');
    await c.say('hefny', 'That is the most Mostafa answer possible.');
    await c.say('hussein', 'He\'s going to make a computer that sits with us. So he doesn\'t have to.');
  },
  3: async (c) => {
    await c.say('mostafa', 'Hussein. The tractor. Explain.');
    await c.say('hussein', 'My family has land outside Rashid. Palm trees, a bit of wheat. My dad taught me to drive the tractor when I was ten.');
    await c.say('hefny', 'Ten?! You couldn\'t ride the swing safely at ten.');
    await c.say('hussein', 'The swing was the problem. Not me. The tractor respects me.');
    await c.say('hussein', 'One day I want a farm. And next to it, a football academy. Free, for kids from Rashid.');
    await c.say('mostafa', '...That\'s actually a really good dream.');
    await c.say('hussein', 'With goalkeeper training. By me. I will teach them how to dive. And how to fall. Mostly how to fall.');
  },
  4: async (c) => {
    await c.say('hefny', 'Can I say something? Without you two making jokes?');
    await c.say('hussein', 'No promises. Go.');
    await c.say('hefny', 'Medicine is seven years. Maybe more. What if I\'m not good enough? What if I get angry at a patient?');
    await c.say('mostafa', 'Hefny. You were alone in that lab today and you made four perfect potions while two grown men screamed at you.');
    await c.say('hussein', 'And you get angry because you care too much. That\'s... honestly, that\'s what I want in a doctor.');
    await c.say('hefny', '...Thank you.');
    await c.say('hussein', 'Also you\'ll be fine. Your handwriting is already terrible.');
    await c.say('hefny', 'THERE it is.');
  },
  5: async (c) => {
    await c.say('hefny', 'Mostafa. Your AI. Will it replace doctors?');
    await c.say('mostafa', 'It\'ll help doctors. It won\'t replace them.');
    await c.say('hussein', 'Will it replace goalkeepers?');
    await c.say('mostafa', 'Hussein, nothing can replace you. Nothing would WANT to. It\'s too dangerous.');
    await c.say('hefny', 'Will it replace Mr Abdelkareem?');
    await c.say('mostafa', 'If it starts charging us for sandwiches, yes.');
    await c.say('hussein', 'We just paid a math teacher in ful. Twelve years of education and we ended in a barter economy.');
  },
  6: async (c) => {
    await c.say('hefny', 'Hussein, list your injuries. All of them. As your future doctor.');
    await c.say('hussein', 'Arm, twice, the swing. Two fingers, the penalties. Head, permanently. Ankle, the stairs. Back, today. Pride, daily.');
    await c.say('hefny', 'And the banister?');
    await c.say('hussein', 'The banister was not injured. The banister started it.');
    await c.say('mostafa', 'Twelve years and you never once stopped diving for the ball.');
    await c.say('hussein', 'Because one day, I was going to catch something important.');
    await c.say('hefny', '...Did you?');
    await c.say('hussein', 'Look around, man.');
  },
  7: async (c) => {
    await c.say('hussein', 'Habeba\'s watching the shootout.');
    await c.say('hefny', 'I know. I can feel it. In my bones. My angry bones.');
    await c.say('mostafa', 'You both liked her. For years. And she chose—');
    await c.say('hussein', 'A car.');
    await c.say('hefny', 'She chose a car.');
    await c.say('hussein', '...It\'s a really nice car, though.');
    await c.say('hefny', 'It is a VERY nice car.');
    await c.say('mostafa', 'You know what she didn\'t get? This. Whatever this is.');
    await c.say('hussein', 'A bench and two idiots?');
    await c.say('mostafa', 'Exactly.');
  },
};

/** the bench on the court: a talk once per chapter. Returns false when there's nothing new to say. */
export async function benchTalk(c: Ctx): Promise<boolean> {
  const ch = chapter(), talk = TALKS[ch];
  if (!talk || flag(`bench_${ch}`) || flag('ceremony')) return false;
  const sit = await c.choose(['Sit together for a bit', 'Not now'], 'narrator', 'The bench. Your bench.');
  if (sit === 1) return true;
  setFlag(`bench_${ch}`);
  await c.say('narrator', 'The three of you sit down. For a minute, nobody is looking for you.');
  await talk(c);
  return true;
}
export const benchAvailable = () => !!TALKS[chapter()] && !flag(`bench_${chapter()}`) && !flag('ceremony');

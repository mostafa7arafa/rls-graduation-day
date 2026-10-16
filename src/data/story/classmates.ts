// THE CLASSMATES & THE YEARBOOK. "The form is for the school. The yearbook is for the friends."
// Mr Mahmoud (French, politics, travel, photography) hands out the yearbook from Chapter 2.
// Classmates sign it in short scenes; Aly El Fahl and Karim Ebid argue "who is dumber" across three
// chapters and finally settle it on a game show hosted by Hussein. Signatures personalise the ceremony and credits.
import { flag, setFlag, bump, count, hasItem, giveItem } from '../../systems/save';
import { by, chapter } from './types';
import type { Npc, Ctx, Script } from './types';

/** who can sign, in display order, with what they write (shown in the credits) */
export const YEARBOOK: { id: string; note: string }[] = [
  { id: 'rahma', note: '"Mostafa — good luck. (Hefny — you too.) (Hussein — no.)"' },
  { id: 'warshan', note: '"It was an honour to share a court with you. Sincerely, Ahmed."' },
  { id: 'shazly', note: '"Chill. — Shazly"' },
  { id: 'basha', note: '"Abdelfattah Basha. First place. Twelve years. Good luck, all."' },
  { id: 'amin', note: '"AMIN (2nd... or 3rd... we will never know)"' },
  { id: 'aly', note: '"I knew you would graduate. I knew it before you did. — Aly (genius)"' },
  { id: 'ebid', note: '"Aly is dumber. — Karim Ebid (the smart one)"' },
];
export const bookSigned = () => YEARBOOK.filter(y => flag(`yb_${y.id}`)).length;
const hasBook = () => hasItem('yearbook');

async function sign(c: Ctx, who: string) {
  if (flag(`yb_${who}`)) return;
  setFlag(`yb_${who}`);
  c.toast('Yearbook signed!');
}
/** classmates who would sign, but you have no yearbook yet */
async function noBook(c: Ctx, who: string) {
  await c.say(who, 'You don\'t even have a yearbook? Mr Mahmoud is handing them out. Downstairs corridor. With the beret.');
}

// ── Aly vs Karim Ebid: three debates, then the show
const DEBATES: Script[] = [
  async (c) => {
    await c.say('aly', 'The Rosetta Stone is in London. The British Museum. I have been there.');
    await c.say('ebid', 'You have never left Beheira.');
    await c.say('aly', 'In my MIND I have been there.');
    await c.say('ebid', 'Anyway, it is a fake. The real one is in Sheikh Nasser\'s drawer.');
    await c.say('aly', 'Everybody knows that. I said it first.');
    await c.say('ebid', 'Hussein! Settle it! Who is dumber, me or him?');
    if (c.leader === 'hefny') {
      await c.say('hefny', 'The stone IS in London. It was found HERE, in Rashid, in 1799. You are both standing on the answer.');
      await c.say('aly', 'See? He agrees with me.');
      c.tint('hefny', 0xff5050, 900);
      await c.say('hefny', 'I do NOT.');
    } else {
      await c.say(c.leader, by(c, {
        mostafa: 'I\'d need more data. A lot more data.',
        hussein: 'Honestly? It changes every minute. It\'s beautiful. Never stop.',
        hefny: '',
      }));
    }
    await c.say('aly', 'We will settle this properly. With a competition. Later.');
  },
  async (c) => {
    await c.say('aly', 'The Nile is bigger than the sea. It is longer.');
    await c.say('ebid', 'The sea is bigger. It is wider. And it has salt. Salt is heavy.');
    await c.say('aly', 'The Nile ENDS in the sea. So the Nile wins. It got there first.');
    await c.say('ebid', 'That is not how winning works.');
    await c.say('aly', 'That is EXACTLY how winning works. Ask Karim.');
    await c.say(c.leader, by(c, {
      mostafa: 'They meet right here, at Rashid. You two are arguing about our own street.',
      hussein: 'I love this. Please never graduate. Stay here and argue forever. I\'ll visit.',
      hefny: 'The Nile flows INTO the Mediterranean. At Rashid. Where we LIVE. Where you were BORN.',
    }));
    await c.say('ebid', 'Show-off.');
  },
  async (c) => {
    await c.say('aly', 'Ful is a fruit.');
    await c.say('ebid', 'Ful is a vegetable.');
    await c.say('aly', 'Ful is a LIFESTYLE.');
    await c.say('ebid', '...Okay. That one is true.');
    await c.say('aly', 'That\'s it. We need a judge. A real show. With buttons.');
    await c.say('ebid', 'Hussein hosts! Hefny keeps score! Mostafa... presses the buttons. Like always.');
    await c.say('hussein', 'I\'ve been training for this my whole life. Ladies and gentlemen... WHO! IS! DUMBER?!');
  },
];

const alyEbid: Script = async (c) => {
  if (flag('yb_aly')) {
    return c.say(c.leader === 'hussein' ? 'ebid' : 'aly', by(c, {
      mostafa: 'We are writing a book together now. "Everything We Know". It is a very short book.',
      hussein: 'Same time next year, host? We have a new debate. Is water wet.',
      hefny: 'Doctor Hefny. If we ever get sick, we will diagnose ourselves. We already know everything.',
    }));
  }
  // one debate per chapter; from chapter 5 they catch up all at once (nobody misses the show)
  const n = count('debates');
  if (n < 2) {
    if (flag(`debate_ch${chapter()}`) && chapter() < 5) return c.say('ebid', 'We are taking a break. Arguing with Aly is a full-time job.');
    setFlag(`debate_ch${chapter()}`); bump('debates');
    return DEBATES[n](c);
  }
  if (n === 2) {
    if (chapter() < 5) return c.say('aly', 'We are preparing the final argument. It will be our masterpiece. Come back later.');
    bump('debates'); await DEBATES[2](c);
  } else await c.say('aly', 'Ready for the show? Hussein, your microphone is... this banana. Use your imagination.');
  if (!hasBook()) return noBook(c, 'aly');
  const go = await c.choose(['Start the show!', 'Not now'], 'hussein');
  if (go === 1) return;
  const won = await c.battle('show');
  if (!won) {
    await c.say('ebid', 'The judge is clearly confused. We demand a rematch. Whenever. We are always here.');
    return;
  }
  await c.say('aly', '...A tie. Exactly equal. Twelve years of arguing and we are EXACTLY as dumb as each other.');
  await c.say('ebid', '...Brother.');
  await c.say('aly', 'Brother.');
  await c.say('narrator', 'Aly El Fahl and Karim Ebid hug. Then argue about who started the hug.');
  await c.say('narrator', 'They both sign your yearbook. On the same page. In a fight over the pen.');
  await sign(c, 'aly'); setFlag('yb_ebid');
};

export const NPCS: Npc[] = [
  // Mr Mahmoud and the yearbook (ground floor corridor)
  { id: 'mahmoud', x: 12, y: 11, dir: 'down', when: () => chapter() >= 2 && !flag('ceremony'), script: async (c) => {
    if (!hasBook()) {
      await c.say('mahmoud', 'Bonjour, mes amis! Mostafa, Hussein, Hefny. The famous three. I have something for you.');
      await c.say('mahmoud', 'The class yearbook. Every page empty. A life with empty pages is a sad life.');
      await c.say('mahmoud', 'Find your classmates. Make them sign. And at the very end... the class photo. By me. Naturellement.');
      giveItem('yearbook'); c.toast('Got: THE YEARBOOK');
      await c.say(c.leader, by(c, {
        mostafa: 'So the form is for the school...',
        hussein: 'Wait, this one doesn\'t need a teacher\'s signature? Finally, paperwork I can do.',
        hefny: 'Is there a page for grades? I want to put my grades in it.',
      }));
      if (c.leader === 'mostafa') await c.say('mahmoud', '...and the yearbook is for the friends. Exactement.');
      if (c.leader === 'hefny') await c.say('mahmoud', 'No, Hefny. That is the whole point.');
      return;
    }
    const n = bookSigned();
    if (n >= YEARBOOK.length) return c.say('mahmoud', 'Every page signed! Magnifique. Now only the photo is missing. Patience. At the ceremony.');
    await c.say('mahmoud', bump('mahmoud_talks') % 2
      ? by(c, {
        mostafa: 'Mostafa, in Paris the engineers argue in cafés for hours. You would love it. Or hate it. Both, probably.',
        hussein: 'Hussein, in French "goalkeeper" is "gardien de but". Guardian of the goal. Very poetic. You are a poem, Hussein.',
        hefny: 'Hefny, French doctors write so badly no one can read them. You will fit right in.',
      })
      : 'Classmates are everywhere today: the corridors, the court, the garden, upstairs. Aly and Karim Ebid you will HEAR before you see.');
  } },

  // Rahma: her own wit, a soft spot for Mostafa, a war with Hussein, respect for Hefny
  { id: 'rahma', x: 9, y: 12, dir: 'up', when: () => !flag('ceremony'), script: async (c) => {
    if (flag('yb_rahma')) {
      return c.say('rahma', by(c, {
        mostafa: 'Don\'t read what I wrote. Not now. Not ever. ...Okay, maybe in ten years.',
        hussein: 'Still here, Hussein? The school is big. Be somewhere else in it.',
        hefny: 'Good luck with medicine, Hefny. Save lives. Start with Hussein\'s spelling.',
      }));
    }
    if (c.leader === 'mostafa') {
      c.emote('rahma', '!');
      await c.say('rahma', 'M-Mostafa! Congratulations. You look... graduated. Very graduated.');
      await c.say('mostafa', 'Thanks, Rahma. You too.');
      await c.say('rahma', 'I... wrote something for you. In case you had a yearbook. Do you have a yearbook?');
      if (!hasBook()) return noBook(c, 'rahma');
      await c.say('narrator', 'Rahma writes for a long time. She covers it with her hand. She writes a little more.');
    } else if (c.leader === 'hussein') {
      await c.say('rahma', 'Hussein. Of course it\'s you. Did you come to ruin my last day personally?');
      await c.say('hussein', 'I came to ask for your signature, Rahma. As a fan.');
      await c.say('rahma', 'A fan. Of what?');
      await c.say('hussein', 'Of how much you hate me. It\'s consistent. I respect consistency.');
      await c.say('rahma', '...Fine. I will sign. To prove I am the bigger person. Which I am. By a lot.');
      if (!hasBook()) return noBook(c, 'rahma');
      c.emote('hussein', '<3');
    } else {
      await c.say('rahma', 'Hefny! Congratulations, doctor. You were the only one of the three with a brain.');
      await c.say('hefny', 'I\'ll tell the others.');
      await c.say('rahma', 'Don\'t. They won\'t understand the words.');
      if (!hasBook()) return noBook(c, 'rahma');
    }
    await sign(c, 'rahma');
  } },

  // Ahmed Warshan: polite, quiet, can play
  { id: 'warshan', x: 30, y: 35, dir: 'up', when: () => !flag('ceremony'), script: async (c) => {
    if (flag('yb_warshan')) return c.say('warshan', 'Take care of yourselves. Really. And Hussein: stretch before you dive.');
    await c.say('warshan', 'Congratulations, guys. Really. It was an honour to share a court with you.');
    await c.say(c.leader, by(c, {
      mostafa: 'Warshan, in twelve years you never once said a bad word.',
      hussein: 'Warshan! You passed me the ball more than anyone. Even when I was in goal. Especially when I was in goal.',
      hefny: 'Warshan, how are you always so calm? Teach me. Please. I\'m begging.',
    }));
    await c.say('warshan', by(c, {
      mostafa: '...Bad word. (He smiles. That is the worst thing he has ever done.)',
      hussein: 'You always looked lonely back there.',
      hefny: 'I breathe, Hefny. In, and out. You breathe in, and then you shout.',
    }));
    if (!hasBook()) return noBook(c, 'warshan');
    await sign(c, 'warshan');
  } },

  // Ibrahim El Shazly: the anti-Karim. Rich, relaxed, rarely here
  { id: 'shazly', x: 6, y: 27, dir: 'down', when: () => !flag('ceremony'), script: async (c) => {
    if (flag('yb_shazly')) return c.say('shazly', 'Sit down, man. Everyone is running today. Nobody is sitting. Why.');
    await c.say('narrator', 'Ibrahim El Shazly is lying in the shade with his headphones on, completely at peace.');
    await c.say('shazly', 'Graduation? Already? I came today for the first time since March. Good timing, huh.');
    if (c.leader === 'hefny') {
      await c.say('hefny', 'Shazly. You\'re rich like Karim. Why aren\'t you annoying like Karim?');
      await c.say('shazly', 'Too much effort, man.');
    } else {
      await c.say(c.leader, by(c, {
        mostafa: 'Shazly, what are you even listening to?',
        hussein: 'Shazly, teach me your secret. How do you skip school and never get caught?',
        hefny: '',
      }));
      await c.say('shazly', by(c, {
        mostafa: 'Nothing. They\'re not plugged in. People just leave you alone when you wear them.',
        hussein: 'You get caught, man. You just don\'t care. That\'s the secret.',
        hefny: '',
      }));
    }
    if (!hasBook()) return noBook(c, 'shazly');
    await c.say('shazly', 'Sign it? Sure. Hold it for me though. I\'m lying down.');
    await sign(c, 'shazly');
  } },

  // Abdelfattah Basha & Amin: first place, and the eternal fight for second
  { id: 'basha', map: 'first', x: 33, y: 16, dir: 'down', when: () => !flag('ceremony'), script: async (c) => {
    if (flag('yb_basha')) return c.say('basha', 'First place. Twelve years in a row. I am going to miss being first. University has so many people.');
    await c.say('basha', 'Mostafa. Hussein. Hefny. Abdelfattah Basha. First place. Twelve years in a row.');
    await c.say('amin', 'And Amin. Second place. Or third. Depends on Hefny\'s mood that year.');
    c.tint('hefny', 0xff5050, 900);
    await c.say('hefny', 'I was FIRST in 2017.');
    await c.say('basha', 'You were first in SCIENCE in 2017. I checked. I always check.');
    await c.say('amin', 'Hefny. Let\'s make a deal. Today, just today, we are BOTH second.');
    await c.say(c.leader, by(c, {
      mostafa: 'And Basha is first, and I\'m... somewhere. Happily.',
      hussein: 'And where was I?',
      hefny: '...Deal. Both second. Today only.',
    }));
    if (c.leader === 'hussein') await c.say('basha', 'Hussein, you were in the list. Near the end. It was a very long list.');
    if (!hasBook()) return noBook(c, 'basha');
    await c.say('narrator', 'Abdelfattah Basha signs neatly, with the date. Amin signs right under him, slightly bigger.');
    await sign(c, 'basha'); setFlag('yb_amin');
  } },
  { id: 'amin', map: 'first', x: 35, y: 16, dir: 'down', when: () => !flag('ceremony'), script: async (c) => {
    if (flag('yb_amin')) return c.say('amin', 'Second place, Hefny. Together. I\'ll never forget it. Basha won\'t let me.');
    await c.say('amin', 'Talk to Basha first. He is always first. It is his whole personality.');
  } },

  // Aly & Karim Ebid move around as the day goes on
  { id: 'aly', x: 22, y: 15, dir: 'side', flip: true, when: () => chapter() === 2 && !flag('ceremony'), script: alyEbid },
  { id: 'ebid', x: 23, y: 15, dir: 'side', when: () => chapter() === 2 && !flag('ceremony'), script: alyEbid },
  { id: 'aly_up', sprite: 'aly', map: 'first', x: 12, y: 12, dir: 'side', flip: true, when: () => chapter() >= 3 && chapter() <= 4, script: alyEbid },
  { id: 'ebid_up', sprite: 'ebid', map: 'first', x: 13, y: 12, dir: 'side', when: () => chapter() >= 3 && chapter() <= 4, script: alyEbid },
  { id: 'aly_canteen', sprite: 'aly', x: 49, y: 6, dir: 'side', flip: true, when: () => chapter() >= 5 && !flag('ceremony'), script: alyEbid },
  { id: 'ebid_canteen', sprite: 'ebid', x: 50, y: 6, dir: 'side', when: () => chapter() >= 5 && !flag('ceremony'), script: alyEbid },
];

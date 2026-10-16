// THE SCREENPLAY. Every conversation, joke and quest beat in Chapter 1 lives here.
// Scripts are async functions: `await c.say(who, text)` shows a line, `await c.choose([...])` a menu.
// Who's leading (TAB to swap) changes what people say — that's the core comedy mechanic.
import { flag, setFlag, bump, count, hasItem, giveItem } from '../systems/save';
import type { Who } from '../systems/save';
import type { Reaction } from '../systems/sfx';

export interface Ctx {
  leader: Who;
  say(who: string, text: string): Promise<void>;
  choose(options: string[], who?: string, prompt?: string): Promise<number>;
  wait(ms: number): Promise<void>;
  shake(intensity?: number, ms?: number): void;
  emote(who: string, mark: '!' | '?' | '<3' | '...' | '#'): void;   // also plays that character's voice reaction
  react(who: string, kind: Reaction): void;                          // voice reaction without a bubble (laugh, noo, ow...)
  tint(who: string, color: number, ms: number): void;
  battle(id: 'hassan'): Promise<boolean>;
  toast(text: string): void;
  bell(): void;
  openGate(): void;
  sting(): void;
  finish(): Promise<void>;
}
type Script = (c: Ctx) => Promise<void>;

/** pick a line based on who is leading */
const by = <T>(c: Ctx, m: Record<Who, T>) => m[c.leader];

// ─────────────────────────────────────────────── OBJECTIVE (HUD)
export function objective(): string {
  if (flag('gate_open')) return 'Leave RLS. For real this time.';
  if (hasItem('key')) return 'Unlock the main gate (south).';
  if (flag('talked_abdel') && flag('gate_seen')) return 'Get the key from Mr Hassan, Class 1A.';
  if (flag('gate_seen')) return 'The gate is chained. Ask a teacher inside.';
  return 'Graduation is over. Go home! (main gate, south)';
}

// ─────────────────────────────────────────────── INTRO
export const intro: Script = async (c) => {
  await c.say('narrator', 'Rosetta Language School. Rashid, Beheira.');
  await c.say('narrator', 'Graduation day. The last bell of your school life is about to ring...');
  c.bell(); c.shake(0.004, 1400);
  await c.wait(1600);
  c.emote('mostafa', '!'); c.emote('hussein', '!'); c.emote('hefny', '!');
  await c.say('mostafa', "That's it. Twelve years. We are FREE.");
  await c.say('hefny', "I'm actually going to miss the chemistry lab.");
  await c.say('hussein', "I'm going to miss nothing. Not one thing. Let's go home before they change their minds.");
  await c.say('narrator', 'ARROWS/WASD walk · SHIFT run · TAB swap leader · Z talk & inspect');
  await c.say('narrator', 'Tip: people react differently depending on who leads. Try everyone.');
};

// ─────────────────────────────────────────────── NPCs
export interface Npc { id: string; x: number; y: number; dir: 'down' | 'up' | 'side'; flip?: boolean; script: Script }

export const NPCS: Npc[] = [
  { id: 'hassan', x: 7, y: 2, dir: 'down', script: async (c) => {
    if (flag('hassan_beaten')) {
      return c.say('hassan', by(c, {
        mostafa: 'Go, engineer. Build something that does homework. Then build one that CHECKS it.',
        hussein: 'Go, Hussein. Before I remember your old grades.',
        hefny: 'Go, doctor. And control your temper. And your hair.',
      }));
    }
    if (count('hassan_lost') > 0) {
      await c.say('hassan', 'Back for more? Sit. Down.');
    } else {
      await c.say('narrator', 'A cloud of oud perfume reaches you before he does.');
      await c.say('hassan', 'Well. WELL. Look who finally came to class.');
      await c.say('hassan', 'Mostafa, the engineer. Hefny, the doctor. And... Hussein.');
      await c.say('hussein', 'Hi Mr Hassan. Long time. You look... healthy.');
      await c.say('hassan', 'You want the gate key. Six years I waited for this day. SIX YEARS of "my dog ate my homework."');
      await c.say('hussein', 'That was true one time!');
      c.emote('hassan', '#'); c.shake(0.006, 300);
      await c.say('hassan', 'YOU DON\'T EVEN HAVE A DOG!');
      await c.say('hassan', 'If you want the key... you must SURVIVE. MY. CLASS.');
    }
    const won = await c.battle('hassan');
    if (won) {
      setFlag('hassan_beaten');
      await c.say('hassan', '...3andoko 7essa fara8. (You have a free period.)');
      await c.say('hassan', 'Here. The key. And Hussein...');
      await c.say('hassan', '...you were my favourite disaster.');
      c.emote('hussein', '<3');
      await c.say('hussein', 'Mr Hassan...!');
      await c.say('hassan', 'Now GET OUT of my classroom.');
      giveItem('key'); c.toast('Got: MAIN GATE KEY');
    } else {
      bump('hassan_lost');
      await c.say('narrator', 'DETENTION. Mr Hassan delivers a 40-minute lecture on "the youth of today".');
      await c.say('narrator', '(Talk to him to try again. Maybe someone in the corridor knows his weak spot...)');
    }
  } },

  { id: 'abdelfattah', x: 20, y: 11, dir: 'down', script: async (c) => {
    if (!flag('met_abdel')) {
      setFlag('met_abdel');
      await c.say('abdelfattah', 'My boys! Graduation day! I am so proud I wrote a poem. Forty verses.');
      const p = await c.choose(['Listen to the poem', 'Ask about the gate'], 'abdelfattah');
      if (p === 0) {
        await c.say('abdelfattah', 'Verse one: "O Hussein, who never once did his homework..."');
        c.emote('hussein', '...');
        await c.say('hussein', 'Why is it about me.');
        c.react('abdelfattah', 'laugh');
        await c.say('abdelfattah', 'Verses two through forty are also about you, habibi.');
      }
    }
    if (!flag('gate_seen')) {
      return c.say('abdelfattah', 'Leaving already? Hmm. Go look at the main gate first. Then come back to me.');
    }
    if (!flag('talked_abdel')) {
      setFlag('talked_abdel'); setFlag('hint_perfume');
      await c.say('abdelfattah', 'Ah, the gate. Mr Hassan has the keys. Class 1A, west end of this corridor.');
      await c.say('abdelfattah', 'He has been waiting six years for you, Hussein.');
      c.emote('hussein', '?');
      await c.say('hussein', '...why me specifically.');
      await c.say('abdelfattah', 'A tip, from an old colleague: he is VERY proud of his perfume. Oud. Imported.');
      await c.say('abdelfattah', 'Imported from the shop next to the bakery. But still. Imported.');
      return c.toast('New ACT unlocked: Compliment Perfume');
    }
    const lines = [
      'Arabic grammar is like life, my boys. Nobody understands it. We all pretend.',
      'Mostafa, they tell me you talk to computers now. Do they answer? Mine just says "Not Responding."',
      'Hefny, a doctor! Finally someone who can check my blood pressure after teaching Hussein.',
      'Remember: compliment the perfume. The PERFUME.',
    ];
    await c.say('abdelfattah', lines[bump('abdel_talks') % lines.length]);
  } },

  { id: 'habeba', x: 7, y: 30, dir: 'down', script: async (c) => {
    if (c.leader === 'hussein') {
      c.emote('hussein', '<3');
      await c.say('hussein', 'H-Habeba! Hi! I— the weather— I play goalkeeper. With my hands. Haha. Hands.');
      await c.say('habeba', '...Hi Hussein. Is your head okay?');
      await c.say('hussein', 'It has NEVER been okay.');
    } else if (c.leader === 'hefny') {
      c.emote('hefny', '<3');
      await c.say('hefny', 'Habeba. Good afternoon. I have been studying the, uh, biology of— no. Forget biology.');
      await c.say('habeba', "You're so funny, Hefny! Karim says you're always angry.");
      c.tint('hefny', 0xff5050, 1200); c.shake(0.004, 300); c.emote('hefny', '#');
      await c.say('hefny', 'KARIM. SAYS?!');
    } else {
      await c.say('mostafa', 'Hey Habeba. Congrats on graduating.');
      await c.say('habeba', 'Thanks, Mostafa! ...Your friends are acting really weird behind you.');
      c.emote('hussein', '<3'); c.emote('hefny', '<3');
      await c.say('mostafa', 'They do that. It\'s a medical condition. Hefny is studying it.');
    }
    await c.say('habeba', "I'm waiting for Karim. He's bringing his car around. ...Inside the school. Again.");
  } },

  { id: 'auntie', x: 47, y: 3, dir: 'down', script: async (c) => {
    if (c.leader === 'hussein' && !flag('auntie_debt')) {
      setFlag('auntie_debt');
      c.emote('hussein', '!');
      await c.say('auntie', 'HUSSEIN. You still owe me 2 pounds. From 2019.');
      await c.say('hussein', '...Can I graduate first and pay you in installments?');
    }
    if (!flag('got_sandwich')) {
      setFlag('got_sandwich');
      await c.say('auntie', "Ya habibi, graduation day! Take a ful sandwich. On the house. Don't tell anyone.");
      giveItem('sandwich'); c.toast('Got: FUL SANDWICH (heals in battle)');
      return;
    }
    await c.say('auntie', by(c, {
      mostafa: 'One sandwich per student, ya Mostafa. Even engineers.',
      hussein: 'One per student. Yes, Hussein. Even you. ESPECIALLY you.',
      hefny: 'Eat, ya doctor! You studied so hard you forgot to grow.',
    }));
  } },
];

// ─────────────────────────────────────────────── INSPECTABLE SPOTS (tile rects)
export interface Spot { x: number; y: number; w?: number; h?: number; script: Script }

export const SPOTS: Spot[] = [
  // main gate
  { x: 26, y: 45, w: 4, script: async (c) => {
    if (flag('gate_open')) return c.say('narrator', 'The gate is open. The street smells like freedom and ful.');
    if (hasItem('key')) {
      await c.say('narrator', 'You turn Mr Hassan\'s key in the padlock...');
      c.openGate(); c.shake(0.005, 400);
      await c.say('hussein', 'FREEDOM—');
      await c.say('mostafa', "Don't jinx it.");
      return;
    }
    if (!flag('gate_seen')) {
      setFlag('gate_seen');
      await c.say('narrator', 'The main gate is chained shut. A note hangs from the padlock:');
      await c.say('narrator', '"NO STUDENT LEAVES WITH UNFINISHED BUSINESS. — The Administration"');
      await c.say(c.leader, by(c, {
        mostafa: 'Okay. Someone inside has the key. Let\'s find a teacher.',
        hussein: "Unfinished business? I never STARTED any business.",
        hefny: 'Who chains a school shut on GRADUATION DAY? This has to be illegal!',
      }));
      if (c.leader === 'hefny') c.tint('hefny', 0xff5050, 900);
      return;
    }
    await c.say('narrator', 'Still locked. The note judges you silently.');
  } },
  { x: 7, y: 1, w: 2, script: async (c) => {
    await c.say('narrator', 'Written on the board: "FINAL EXAM — Hussein: SEE ME." It is dated four years ago.');
    if (c.leader === 'hussein') await c.say('hussein', "I'll see him. Eventually. Spiritually.");
  } },
  { x: 23, y: 10, script: async (c) => {
    await c.say('narrator', 'LIBRARY — Closed for renovation since 2009.');
    if (c.leader === 'hefny') {
      await c.say('hefny', 'I studied in there for six years.');
      await c.say('narrator', '...It has been closed since 2009.');
      await c.say('hefny', '...I studied OUTSIDE it. Against the door. Leave me alone.');
    }
  } },
  { x: 37, y: 1, script: async (c) => {
    await c.say('narrator', 'A filing cabinet. One drawer is labelled HUSSEIN. It is the biggest drawer.');
    await c.say('hussein', "That's a lot of paper for someone who never wrote anything.");
  } },
  { x: 8, y: 10, script: (c) => c.say('narrator', 'NOTICE: "LOST — one dignity. Last seen during Hussein\'s oral exam."') },
  { x: 28, y: 10, script: (c) => c.say('narrator', 'NOTICE: "Football team tryouts. Goalkeeper position: TAKEN (by force). — Hussein"') },
  { x: 32, y: 1, script: (c) => c.say('narrator', '"Students of the month": a frame with Hefny\'s photo. And a sticky note on it: "+ Mostafa fixed the projector".') },
  { x: 47, y: 1, script: (c) => c.say('narrator', 'MENU: Ful sandwich 2LE · Ta3meya sandwich 2LE · Chipsy 1LE · Hussein\'s tab: 2LE (2019)') },
  { x: 40, y: 10, script: (c) => c.say('narrator', 'The water cooler. In twelve years, it has never once been cold.') },
  { x: 52, y: 1, script: (c) => c.say('narrator', 'Another water cooler. Also warm. It is consistent, at least.') },
  { x: 16, y: 23, h: 4, script: async (c) => {
    if (c.leader === 'hussein') {
      await c.say('hussein', 'My goal. My KINGDOM. I saved three penalties here in 2018.');
      await c.say('hussein', 'Broke two fingers. Worth it.');
    } else await c.say('narrator', 'Hussein\'s old goal. The grass is worn where he dove for everything — including things that were not the ball.');
  } },
  { x: 39, y: 23, h: 4, script: (c) => c.say('narrator', 'The other goal. Karim scored 40 headers here. Hefny has counted. Hefny remembers every one.') },
  { x: 4, y: 32, w: 4, h: 2, script: async (c) => {
    await c.say('narrator', 'The swings. Hussein broke his arm here.');
    await c.say('hussein', 'TWICE. Same swing. At this point it\'s personal.');
  } },
  { x: 47, y: 27, w: 2, h: 2, script: (c) => c.say('narrator', 'The flagpole. Every morning: taboor (assembly). Every morning: Hussein, late to it.') },
  { x: 44, y: 36, w: 4, h: 3, script: async (c) => {
    if (c.leader === 'hefny') {
      await c.say('narrator', "Karim's car. Parked. Inside. The. School.");
      c.tint('hefny', 0xff4040, 1600); c.shake(0.006, 500); c.emote('hefny', '#');
      await c.say('hefny', 'HOW. HOW DOES HE GET IT THROUGH THE GATE?!');
    } else await c.say(c.leader, by(c, {
      mostafa: 'Gold license plate. Of course it is a gold license plate.',
      hussein: 'He parks INSIDE, but I got detention for bringing a bicycle.',
      hefny: '',
    }));
  } },
  { x: 44, y: 20, w: 8, script: (c) => c.say('narrator', 'A bench. Hefny used to eat lunch here alone, revising. Then Mostafa and Hussein sat on either side and refused to leave.') },
];

// ─────────────────────────────────────────────── ENDING (walk out the gate)
export const ending: Script = async (c) => {
  await c.say('narrator', 'The three of you step onto the street. Free. Actually free.');
  c.react('hussein', 'laugh');
  await c.say('hussein', 'Ful sandwich celebration? Mostafa is paying.');
  await c.say('mostafa', 'Why am I—');
  c.sting(); c.shake(0.003, 600);
  await c.say('narrator', '*KRRSHH* The school loudspeaker crackles to life behind you...');
  await c.say('narrator', '"ATTENTION. Would Hussein, Mostafa and Mohamed Hefny return to the mosque corner."');
  await c.say('narrator', '"Sheikh Nasser has prepared... a QUIZ."');
  c.emote('hussein', '!'); c.emote('hefny', '#'); c.emote('mostafa', '...');
  await c.wait(700); c.react('hussein', 'noo');
  await c.say('hussein', 'NOOOOOOOOOOOOO');
  await c.say('narrator', 'RLS: GRADUATION DAY — Chapter 1 complete. To be continued...');
  await c.finish();
};

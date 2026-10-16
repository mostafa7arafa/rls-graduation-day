// Background people: they make RLS feel full on graduation day. Each one has a few lines that
// cycle, and some react to whoever is leading. They never block progress — they're just life.
import { bump } from '../../systems/save';
import type { Who } from '../../systems/save';
import type { Npc, Dir } from './types';

interface Extra {
  id: string; map?: string; x: number; y: number; dir: Dir; flip?: boolean;
  lines: string[];                       // cycles each time you talk
  leader?: Partial<Record<Who, string>>; // said once, the first time that friend leads the conversation
}

const EXTRAS: Extra[] = [
  // ── ground floor
  { id: 'bawab', x: 24, y: 44, dir: 'side', flip: true, lines: [
    'Locked, ya basha. Orders from upstairs. Or downstairs. From somebody.',
    'Thirty years I guard this gate. It has never been this exciting.',
    'Karim\'s car? I did not see it come in. Nobody saw it come in. Nobody will ever know.',
  ], leader: {
    hussein: 'Hussein! You climbed this fence in 2017. I still have your shoe. In the drawer. With the others.',
    hefny: 'Doctor! My knee goes "krrrk". Like that. Krrrk. Is it serious?',
    mostafa: 'Mostafa, my son set up my phone. Now it only speaks English. Can you fix it? Can you fix HIM?',
  } },
  { id: 'cleaner', x: 35, y: 12, dir: 'down', lines: [
    'Walk on the left. I just mopped the right. ...I mopped the left too. Walk in the air.',
    'Twelve years I clean after you three. Today is the last time. I will miss it. A little. Very little.',
    'Do not touch the walls. The paint is from 1998. It is holding the building up.',
  ], leader: { hussein: 'Hussein. The banister. 2016. I was the one who found it. In the canteen.' } },
  { id: 'mom', x: 42, y: 22, dir: 'down', lines: [
    'My son graduates today! He is in the top ten. The top three, actually. The top... he is in the class.',
    'Are you the three who never came to class? My son talks about you. With respect. And fear.',
  ], leader: { hefny: 'You are Hefny? My son says you always came first. Second? Third? It changes, he says.' } },
  { id: 'dad', x: 53, y: 22, dir: 'down', lines: [
    'Twelve years of private lessons. TWELVE. Mr Abdelkareem bought a villa with my money.',
    'In my day, graduation was a handshake and a ful sandwich. Now there is a DJ?',
  ], leader: { mostafa: 'You do computers? Good. My printer prints only the letter Q. Is it a virus?' } },
  { id: 'kid', x: 9, y: 36, dir: 'up', lines: [
    'Are you the ones who broke the banister?! You are LEGENDS.',
    'My big brother says one day I will be like you three. My mother says "God forbid".',
  ], leader: { hussein: 'Is it TRUE you saved a penalty with your FACE?! ...Can you do it again? Here? Now?' } },
  { id: 'student1', x: 44, y: 6, dir: 'up', lines: [
    'The auntie gave me a free sandwich. FREE. Is the world ending?',
    'I have been in this queue since the first bell. Graduation is a lie. Only the queue is real.',
  ] },
  { id: 'student2', x: 43, y: 29, dir: 'side', flip: true, lines: [
    'Did you hear? Karim parked INSIDE again. On graduation day. With a ribbon on it.',
    'Habeba is so lucky. ...Is she, though? Is she?',
  ] },
  { id: 'student3', x: 44, y: 29, dir: 'side', lines: [
    'Shh. We are not gossiping. We are... discussing current events.',
    'Hussein waved at me in 2019. I am still thinking about what it meant.',
  ], leader: { hussein: '...Hi Hussein. (She is not thinking about 2019. She is definitely thinking about 2019.)' } },
  { id: 'student4', x: 23, y: 12, dir: 'up', lines: [
    'My big brother waited for this library to open. Now it is my turn.',
    'I heard there are books in there from 2009. Ancient times.',
  ] },
  // ── first floor
  { id: 'student5', map: 'first', x: 3, y: 6, dir: 'up', lines: [
    'Mr Yasser gave me a red mark on my NAME. It is spelled correctly. He says it is spelled "boringly".',
  ] },
  { id: 'student6', map: 'first', x: 30, y: 11, dir: 'side', lines: [
    'Is it true Hefny once flipped a desk?',
  ], leader: { hefny: '...Is it true you once flipped a desk? (Hefny says nothing. The desk remembers.)' } },
  { id: 'student7', map: 'first', x: 31, y: 11, dir: 'side', flip: true, lines: [
    'Twice. The second desk landed on the first desk. Mr Abdelkareem charged him for both.',
  ] },
  { id: 'student8', map: 'first', x: 26, y: 18, dir: 'up', lines: [
    'Mr Ibrahim says Rashid is the centre of the world. I checked the map. He might be right.',
  ] },
];

const said = new Set<string>();
export const NPCS: Npc[] = EXTRAS.map((e): Npc => ({
  id: e.id, map: e.map, x: e.x, y: e.y, dir: e.dir, flip: e.flip,
  script: async (c) => {
    const special = e.leader?.[c.leader];
    const key = `${e.id}:${c.leader}`;
    if (special && !said.has(key)) { said.add(key); return c.say(e.id, special); }
    await c.say(e.id, e.lines[(bump(`x_${e.id}`) - 1) % e.lines.length]);
  },
}));

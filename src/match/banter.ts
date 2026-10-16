// What people shout during a match: pools of [speaker, line] per situation, drawn from a shuffled bag so
// the same line doesn't come back until the pool runs out. Speakers: a player or cast id, or 'fan' (someone in
// the crowd). MatchScene picks the pool from the moment (who scored, how many, the score, the minute).
// Arabic for every line is in src/data/ar/match.ts.

export type Banter = [string, string];
export const BANTER: Record<string, Banter[]> = {
  goal_karim_1: [
    ["karim", "Top scorer. As promised."],
    ["hefny", "...Good goal. I hate it. Good goal."],
    ["fan", "KARIM! KARIM! KA... is he waving at us?"],
    ["mostafa", "Exactly like the whiteboard. Roughly."],
    ["karim", "Somebody film that. From the left. My good side."],
    ["hefny", "Fine. FINE. One goal. Anybody can score one goal."],
    ["fan", "Did his sunglasses stay on? They stayed on."],
    ["hussein", "From back here it looked like a missile."],
    ["hefny", "...Fine. Good goal, Karim. FINE."],
  ],
  goal_karim_2: [
    ["hefny", "Two. He has TWO. Who allowed this?"],
    ["karim", "Hefny, you can say it. I am amazing."],
    ["hefny", "I'm not chanting his name. I refuse. HUSSE... no, wait."],
    ["fan", "Two for Karim! Hefny's face is a whole show."],
    ["mostafa", "Hefny, breathe. He's on our team."],
    ["hefny", "I brought ice for Hussein. Now I need some for me."],
    ["karim", "Hefny, say it with me: KA-RIM."],
    ["fan", "Karim is scoring for Instagram now."],
    ["hefny", "Two goals. Zero humility."],
  ],
  goal_karim_3: [
    ["hefny", "THREE?! I'm going home. Somebody tell my mother."],
    ["hefny", "This is not football. This is a Karim documentary."],
    ["karim", "Hefny, I'll sign your shirt later."],
    ["hefny", "I'm changing schools."],
    ["mostafa", "Hefny, you are allowed to clap. Once."],
    ["fan", "Someone hold Hefny. He's trying to climb the wall."],
    ["hefny", "Fine. FINE. KA... KAR... I can't."],
    ["hussein", "Hefny, smile. It's free."],
    ["fan", "Is anyone else allowed to score?"],
  ],
  goal_warshan: [
    ["warshan", "Sorry. Was that okay?"],
    ["hefny", "WARSHAN! The polite killer!"],
    ["fan", "Did Warshan just apologise to the net?"],
    ["mostafa", "Quiet guys score loud goals."],
    ["warshan", "Thank you. Thank you. Sorry."],
    ["karim", "Nice, Warshan. Second best goal today."],
  ],
  goal_elrediny: [
    ["elrediny", "Told you. Same as Warshan, more skill."],
    ["warshan", "...Still fair."],
    ["fan", "The curls! THE CURLS!"],
    ["hefny", "ELREDINY! I don't even have a chant for you yet! I will!"],
    ["mostafa", "That is the one we practised. We never practised."],
  ],
  goal_shazly: [
    ["shazly", "I was relaxing near the goal. It happened."],
    ["hefny", "SHAZLY scored?! Without getting up?!"],
    ["fan", "He didn't even take his headphones off."],
    ["mostafa", "The sub! The sub of destiny!"],
  ],
  goal_hussein: [
    ["hussein", "Keepers can score. Write it down."],
    ["hefny", "HUSSEIN SCORED! THE HIGH DAM IS ALSO THE NILE!"],
    ["fan", "Who is in our goal right now?! Nobody?!"],
  ],
  goal_us: [
    ["hefny", "GOOOAL! Did you see that?!"],
    ["fan", "YES! 2nd Secondary!"],
    ["fan", "I'm telling my cousins about this."],
    ["mostafa", "Tactics. Pure tactics."],
    ["hefny", "Hussein didn't even have to save anything!"],
    ["fan", "Ole! OLE! ...what comes after ole?"],
    ["hussein", "Good. Now let me sit down."],
    ["fan", "Second Secondary, best grade in the school!"],
  ],
  equalizer_us: [
    ["mostafa", "Level! Everything is level! Except Hefny's voice."],
    ["hefny", "WE'RE BACK! WE NEVER LEFT! WE'RE BACK!"],
    ["fan", "It's a game again!"],
    ["fan", "I knew it. I said it. Did I say it? I meant to."],
  ],
  lead_us: [
    ["mostafa", "We are ahead. Nobody do anything stupid. Karim."],
    ["fan", "We are winning! Should we celebrate? Too early?"],
    ["hefny", "In front! IN FRONT!"],
  ],
  late_us: [
    ["hefny", "IN THE LAST MINUTE! I'M CRYING!"],
    ["fan", "Write the date down. Today!"],
    ["mostafa", "That's why you never leave early."],
  ],
  rout_us: [
    ["fan", "Is this still a match or a lesson?"],
    ["mostafa", "Be humble. ...Okay, one celebration."],
    ["hefny", "Somebody call their mothers!"],
    ["fan", "Mr Amr, is there a mercy rule?"],
  ],
  goal_them: [
    ["hefny", "No no no no no."],
    ["mostafa", "Who was marking him?! WHO?!"],
    ["hussein", "That one's on me. ...No, it's on Karim."],
    ["fan", "Hussein, wake up!"],
    ["fan", "Ugh. Fine. Applause. Politely."],
    ["hefny", "That didn't count. In my heart it didn't count."],
    ["karim", "Relax. I'll score two more."],
    ["mostafa", "New plan. Same as the old plan, but better."],
  ],
  goal_saif: [
    ["saif", "Too easy, brother."],
    ["saif", "Tell Dad I scored. He'll ask."],
    ["mostafa", "He's tiny! How is he doing this?!"],
    ["fan", "The little Messi! Sorry, Mostafa."],
    ["hefny", "I'm cheering for both. I'm sorry. I can't help it."],
    ["saif", "Pass it to me next time, guys. Oh wait, I did it alone."],
  ],
  goal_abdallah: [
    ["abdallah", "Sorry. Left foot."],
    ["hussein", "I didn't see it. Did anyone see it?"],
    ["fan", "Replay! We need a replay!"],
    ["hefny", "Hussein, it's not your fault. It's physics."],
  ],
  goal_nasser: [
    ["nasser", "Alhamdulillah. Again?"],
    ["nasser", "The galabeya gives extra power."],
    ["fan", "He scored in a galabeya! Respect."],
    ["hefny", "Sheikh Nasser, with respect, please stop."],
  ],
  goal_ibrahim: [
    ["ibrahim", "Miss Hager, did you see that?"],
    ["hager", "...We saw it, Mr Ibrahim."],
    ["fan", "Mr Ibrahim is showing off again."],
  ],
  goal_amrk: [
    ["amrk", "I looked at the goal. The ball went."],
    ["elrediny", "He IS square. I'm saying it."],
    ["fan", "How did that pass go through four people?"],
  ],
  rout_them: [
    ["mostafa", "Okay. Nobody panic. I'm panicking. Nobody else panic."],
    ["hefny", "I'm still chanting. Out of loyalty."],
    ["fan", "Can we start again?"],
  ],
  save_hussein: [
    ["hussein", "Not today."],
    ["fan", "THE HIGH DAM!"],
    ["hefny", "Did you see that?! Nobody passes the dam!"],
    ["hussein", "My knee says hello."],
    ["fan", "Hussein for president!"],
    ["mostafa", "That's why he's the wall."],
    ["karim", "Nice. Now give it to me."],
  ],
  save_them: [
    ["karim", "How did he save that?!"],
    ["fan", "Ooooh! So close!"],
    ["hefny", "Unbelievable. UNBELIEVABLE."],
    ["mostafa", "Next time, the other corner."],
  ],
  post_us: [
    ["karim", "NOOO! The post!"],
    ["fan", "The post! The post hates us!"],
    ["hefny", "Who put that post there?!"],
    ["karim", "That was on purpose. A warning shot."],
  ],
  post_them: [
    ["hussein", "The post is on my team."],
    ["hefny", "THANK YOU, POST!"],
    ["fan", "Phew!"],
  ],
  miss_us: [
    ["fan", "Into the canteen again."],
    ["hefny", "Close! Kind of! Not really!"],
    ["mostafa", "Aim. AIM."],
    ["karim", "The wind. It was the wind."],
  ],
  lost_saif: [
    ["saif", "PASS IT TO ME!"],
    ["saif", "WHAT WAS THAT?!"],
    ["saif", "Wake up! WAKE UP!"],
    ["saif", "Give me the ball and stand there."],
    ["saif", "Do you need glasses?!"],
    ["saif", "I'm doing everything myself!"],
    ["saif", "My grandmother tackles better!"],
  ],
  lost_us: [
    ["mostafa", "Pass more, panic less!"],
    ["mostafa", "Who is marking him?!"],
    ["mostafa", "Shape! SHAPE!"],
    ["mostafa", "Use your feet! Both of them!"],
    ["mostafa", "That was not on the whiteboard!"],
    ["fan", "Come ON!"],
  ],
  lost_them: [
    ["hefny", "YES! TAKE IT!"],
    ["hefny", "HUSSEIN IS WATCHING YOU!"],
    ["hefny", "Ole!"],
    ["fan", "Take that!"],
    ["hefny", "Tackle of the year!"],
  ],
  foul_on_us: [
    ["fan", "Card! CARD!"],
    ["hefny", "Mr Amr, are you WATCHING?!"],
    ["karim", "He touched my hair! The HAIR!"],
  ],
  foul_by_us: [
    ["fan", "He barely touched him!"],
    ["mostafa", "Gentle! We're gentlemen!"],
  ],
  chatter: [
    ["fan", "Is the canteen open? I'm starving."],
    ["fan", "Who's winning? I just got here."],
    ["fan", "Hussein's knee makes a sound when he dives."],
    ["fan", "I have homework. I'm not doing it."],
    ["fan", "Karim's watch costs more than this court."],
    ["fan", "Mr Amr hasn't sat down in thirty years."],
    ["hefny", "HUSSEIN! HUSSEIN! ...that's the whole chant."],
    ["mostafa", "Talk to each other! Communication!"],
    ["fan", "Where's the ball? Oh. There."],
    ["fan", "My mum thinks I am in class."],
    ["fan", "Mr Hassan is watching from the window. Act normal."],
    ["fan", "Whoever wins, the canteen auntie wins."],
    ["hefny", "I lost my voice. I found it. HUSSEIN!"],
  ],
  chatter_teachers: [
    ["fan", "Students against teachers! This is personal!"],
    ["fan", "If we win, do we get extra marks?"],
    ["hager", "Mr Ibrahim keeps looking over here."],
    ["doaa", "Go, students! ...Quietly."],
    ["fan", "Sheikh Nasser runs faster in a galabeya than I do in trainers."],
  ],
  chatter_prep1: [
    ["fan", "Mostafa against his brother. Dinner is going to be awkward."],
    ["fan", "The little one is fast. Too fast."],
    ["hefny", "I'm cheering for both. Don't tell Mostafa."],
  ],
  chatter_sec1: [
    ["fan", "Don't stand near the wall when Abdallah shoots."],
    ["fan", "One year below us and they think they're better."],
  ],
  mercy: [
    ["mostafa", "Five goals. Mr Amr ended it. Out of mercy."],
  ],
};

const bags = new Map<string, number[]>();
/** the next line from a pool (shuffled, no repeats until it runs out); `ok` filters out speakers who aren't here */
export function pick(key: string, ok: (who: string) => boolean = () => true): Banter | null {
  const pool = BANTER[key]; if (!pool) return null;
  for (let tries = 0; tries < pool.length * 2; tries++) {
    let bag = bags.get(key);
    if (!bag || !bag.length) { bag = pool.map((_, i) => i).sort(() => Math.random() - 0.5); bags.set(key, bag); }
    const b = pool[bag.pop()!];
    if (ok(b[0])) return b;
  }
  return null;
}

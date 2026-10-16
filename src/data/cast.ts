// Who can speak. `voice` = typewriter blip pitch, `face` = portrait texture.
export interface Speaker { name: string; face?: string; voice: number; color: string }

export const CAST: Record<string, Speaker> = {
  mostafa:     { name: 'Mostafa',          face: 'mostafa_face',     voice: 520, color: '#7fb0ff' },
  hussein:     { name: 'Hussein',          face: 'hussein_face',     voice: 380, color: '#ffa860' },
  hefny:       { name: 'Hefny',            face: 'hefny_face',       voice: 600, color: '#7fe08a' },
  hassan:      { name: 'Mr Hassan',        face: 'hassan_face',      voice: 170, color: '#9fe09a' },
  abdelfattah: { name: 'Mr Abdelfattah',   face: 'abdelfattah_face', voice: 300, color: '#e0b080' },
  habeba:      { name: 'Habeba',           face: 'habeba_face',      voice: 760, color: '#ffc0d8' },
  auntie:      { name: 'Canteen Auntie',   face: 'auntie_face',      voice: 440, color: '#f0d8a0' },
  nasser:      { name: 'Sheikh Nasser',    face: 'nasser_face',      voice: 210, color: '#e8e0c8' },
  yasser:      { name: 'Mr Yasser',        face: 'yasser_face',      voice: 330, color: '#8fb0ff' },
  abdo:        { name: 'Mr Abdo',          face: 'abdo_face',        voice: 280, color: '#7fd0f0' },
  rezk:        { name: 'Mr Ahmed Rezk',    face: 'rezk_face',        voice: 190, color: '#d8e8f0' },
  abdelkareem: { name: 'Mr Abdelkareem',   face: 'abdelkareem_face', voice: 240, color: '#f2c94c' },
  amr:         { name: 'Mr Amr',           face: 'amr_face',         voice: 250, color: '#ff7a7a' },
  karim:       { name: 'Karim',            face: 'karim_face',       voice: 420, color: '#f8f8f8' },
  ibrahim:     { name: 'Mr Ibrahim',       face: 'ibrahim_face',     voice: 290, color: '#b8d090' },
  doaa:        { name: 'Miss Doaa',        face: 'doaa_face',        voice: 700, color: '#8fb8f0' },
  shimaa:      { name: 'Miss Shimaa',      face: 'shimaa_face',      voice: 640, color: '#f08fb0' },
  hager:       { name: 'Miss Hager',       face: 'hager_face',       voice: 820, color: '#d0a8f0' },
  narrator:    { name: '',                                           voice: 260, color: '#f4f0e8' },
};

export const PARTY = ['mostafa', 'hussein', 'hefny'] as const;

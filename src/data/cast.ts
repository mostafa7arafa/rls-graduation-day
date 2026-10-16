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
  narrator:    { name: '',                                           voice: 260, color: '#f4f0e8' },
};

export const PARTY = ['mostafa', 'hussein', 'hefny'] as const;

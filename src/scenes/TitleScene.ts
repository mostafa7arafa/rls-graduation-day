import * as Phaser from 'phaser';
import { W, H, FONT } from '../config';
import { sfx } from '../systems/sfx';
import { music } from '../systems/music';
import { tr, txt, isAr, setLang } from '../systems/i18n';
import { hasSave, load, reset, flag } from '../systems/save';

export class TitleScene extends Phaser.Scene {
  private sel = 0;
  private options: string[] = [];
  private optTexts: Phaser.GameObjects.Text[] = [];

  constructor() { super('title'); }

  create(data: { credits?: boolean; sel?: number }) {
    this.cameras.main.fadeIn(500);
    music.play('title');
    // the school at dusk, from the court
    const map = this.add.image(W / 2, H / 2 + 30, 'court').setScale(1.6).setAlpha(0.25);
    this.tweens.add({ targets: map, x: W / 2 - 30, duration: 14000, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    this.add.rectangle(0, 0, W, H, 0x1b1420, 0.55).setOrigin(0);

    const logo = this.add.text(W / 2, 54, 'RLS', { fontFamily: FONT, fontSize: '48px', color: '#f2c94c' }).setOrigin(0.5).setShadow(4, 4, '#c23b3b', 0, false, true);
    this.tweens.add({ targets: logo, y: 58, yoyo: true, repeat: -1, duration: 1400, ease: 'Sine.inOut' });
    this.add.text(W / 2, 96, tr('GRADUATION DAY'), txt(16, { color: '#f4f0e8' })).setOrigin(0.5);
    this.add.text(W / 2, 116, tr('Rosetta Language School · Rashid'), txt(8, { color: '#cfc6b8' })).setOrigin(0.5);

    // the three friends walking, forever trying to leave
    ['hefny', 'hussein', 'mostafa'].forEach((p, i) => {
      const s = this.add.sprite(-30 - i * 22, 226, p).setScale(2).setFlipX(true).play(`${p}-walk-side`);
      this.tweens.add({ targets: s, x: W + 40 + (2 - i) * 22, duration: 9000, repeat: -1, delay: 0 });
    });
    const hassan = this.add.sprite(-120, 226, 'hassan').setScale(2).setFlipX(true).play('hassan-walk-side');
    this.tweens.add({ targets: hassan, x: W + 60, duration: 9000, repeat: -1, delay: 1800 });

    if (data?.credits) {
      this.add.text(W / 2, 140, tr('Thanks for playing! The boys made it out.'), txt(8, { color: '#9fe09a' })).setOrigin(0.5);
    }

    const canContinue = hasSave() && load() && flag('intro_done') && !flag('game_done');
    this.options = [...(canContinue ? ['CONTINUE'] : []), 'NEW GAME', 'FOOTBALL (PREVIEW)', 'LANGUAGE'];
    this.optTexts = this.options.map((_, i) => this.add.text(W / 2, 160 + i * 16, '', txt(8, { color: '#f4f0e8' })).setOrigin(0.5));
    this.sel = data?.sel ?? 0; this.render();

    this.add.text(W / 2, H - 10, tr('by Mostafa, Hussein & Hefny\'s biggest fan · M mutes'), txt(8, { color: '#6d5b64' })).setOrigin(0.5);

    const kb = this.input.keyboard!;
    const move = (d: number) => { this.sel = (this.sel + d + this.options.length) % this.options.length; sfx.move(); this.render(); };
    kb.on('keydown-UP', () => move(-1)); kb.on('keydown-DOWN', () => move(1));
    kb.on('keydown-W', () => move(-1)); kb.on('keydown-S', () => move(1));
    const go = () => this.start();
    kb.on('keydown-ENTER', go); kb.on('keydown-Z', go); kb.on('keydown-SPACE', go); kb.on('keydown-ESC', go); // Esc = a controller's Start
    this.input.once('pointerdown', go);
  }

  private render() {
    this.optTexts.forEach((t, i) => {
      // the language option always shows in the language it switches *from*, so either reader can find it
      const o = this.options[i] === 'LANGUAGE' ? (isAr() ? 'اللغة: مصري' : 'LANGUAGE: ENGLISH') : tr(this.options[i]);
      const on = i === this.sel;
      t.setText(on ? (isAr() ? `◀ ${o} ▶` : `▶ ${o} ◀`) : o).setColor(on ? '#f2c94c' : '#f4f0e8');
    });
  }

  private start() {
    if (this.options[this.sel] === 'LANGUAGE') {
      sfx.select(); setLang(isAr() ? 'en' : 'ar');
      this.input.keyboard!.removeAllListeners(); this.input.removeAllListeners();
      this.scene.restart({ sel: this.sel });
      return;
    }
    this.input.keyboard!.removeAllListeners();
    sfx.select();
    if (this.options[this.sel] === 'FOOTBALL (PREVIEW)') { this.scene.start('cup'); return; }   // Season 2: the cup
    if (this.options[this.sel] === 'NEW GAME') reset();
    this.cameras.main.fadeOut(400, 27, 20, 32);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start('ui'); // UI boots first, then launches the world beneath it
    });
  }
}

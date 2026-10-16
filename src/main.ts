import * as Phaser from 'phaser';
import { W, H } from './config';
import { BootScene } from './scenes/BootScene';
import { TitleScene } from './scenes/TitleScene';
import { WorldScene } from './scenes/WorldScene';
import { UIScene } from './scenes/UIScene';
import { BattleScene } from './scenes/BattleScene';

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: W,
  height: H,
  pixelArt: true,
  backgroundColor: '#1b1420',
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  physics: { default: 'arcade', arcade: { debug: false } },
  scene: [BootScene, TitleScene, WorldScene, UIScene, BattleScene],
});

// handy for debugging / automated playtests from the browser console
(window as unknown as { game: Phaser.Game }).game = game;

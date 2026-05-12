import Phaser from 'phaser';

import { createMainScene, type CreateMainSceneOptions } from './createScene';

export interface CreatePhaserGameOptions extends CreateMainSceneOptions {
  parent: HTMLElement;
}

export function createPhaserGame({
  parent,
  onWallDestroyed,
  onShootAttempt,
  onAmmoConsumed,
  onAmmoRequest,
  initialAmmoType,
  initialAmmoCounts,
}: CreatePhaserGameOptions): Phaser.Game {
  parent.innerHTML = '';

  return new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    backgroundColor: '#7dd3fc',
    scale: {
      mode: Phaser.Scale.RESIZE,
      width: '100%',
      height: '100%',
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    physics: {
      default: 'arcade',
      arcade: {
        gravity: { y: 500, x: 0 },
        debug: false,
      },
    },
    scene: [createMainScene({
      onWallDestroyed,
      onShootAttempt,
      onAmmoConsumed,
      onAmmoRequest,
      initialAmmoType,
      initialAmmoCounts,
    })],
  });
}

/**
 * Haunt Merge — Phaser 3 entry (Milestone 1).
 * Capacitor later: serve this folder as www/ (or copy into dist/).
 */
const GAME_WIDTH = 390;
const GAME_HEIGHT = 700;

const config = {
  type: Phaser.AUTO,
  parent: 'game-container',
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: THEME.colors.bg,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [BoardScene],
  input: {
    activePointers: 1,
  },
};

window.addEventListener('load', () => {
  window.hauntMerge = new Phaser.Game(config);
});

import Phaser from 'phaser';

// ─── COLOR PALETTE ──────────────────────────────────────────────────────────
export const C = {
  BLACK: 0x000000,
  WHITE: 0xffffff,
  WOOD: 0x92400e,
  WOOD_LIGHT: 0xa16207,
  WOOD_DARK: 0x78350f,
  STONE: 0x6b7280,
  STONE_DARK: 0x4b5563,
  IRON: 0x475569,
  BRONZE: 0xcd7f32,
  BRICK: 0x854d0e,
  BRICK_DARK: 0x713f12,
  SKIN: 0xfcd34d,
  HAIR: 0x1c1917,
  CLOTH_ATK: 0x1d4ed8,
  CLOTH_DEF: 0xb91c1c,
  HAT: 0xe5e7eb,
  ENERGY: 0xfbbf24,
  GRASS: 0x22c55e,
  SKY: 0x38bdf8,
  SKY_TOP: 0x7dd3fc,
  SKY_MID: 0x60a5fa,
  SKY_DEEP: 0x4338ca,
  CLOUD: 0xf8fafc,
  CLOUD_SHADOW: 0xbfdbfe,
  ISLAND_TOP: 0x65a30d,
  ISLAND_GRASS: 0x84cc16,
  ISLAND_EARTH: 0x92400e,
  ISLAND_ROCK: 0x7c2d12,
  PANEL_BLUE: 0x172554,
  HP_RED: 0xef4444,
  HP_GREEN: 0x22c55e,
  HEAL_GREEN: 0x4ade80,
  GATE: 0x451a03,
  RARITY_UNCOMMON: 0x10b981,
  RARITY_RARE: 0x3b82f6,
  RARITY_EPIC: 0x8b5cf6,
  RARITY_LEGENDARY: 0xf59e0b,
  RARITY_MYTHIC: 0xef4444,
  ACID: 0x84cc16,
  VOID: 0x09090b,
  VOID_GLOW: 0xc026d3,
} as const;

// ─── TEXTURE KEYS ───────────────────────────────────────────────────────────
export const TEX = {
  PARTICLE_GLOW: 'tex_particle_glow',
  PARTICLE_SPARK: 'tex_particle_spark',
  HP_CROSS: 'tex_hp_cross',
  SMOKE: 'tex_smoke',
  DUST: 'tex_dust',
  GOLD_COIN: 'tex_gold_coin',
} as const;

export function generateTextures(scene: Phaser.Scene) {
  const g = scene.make.graphics({ x: 0, y: 0 }, false);

  g.lineStyle(2, C.BLACK, 1);
  g.fillStyle(C.WHITE, 1);
  g.fillCircle(10, 10, 8);
  g.strokeCircle(10, 10, 8);
  g.generateTexture(TEX.PARTICLE_GLOW, 20, 20);
  g.clear();

  g.lineStyle(1, C.BLACK, 1);
  g.fillStyle(0xfacc15, 1);
  g.fillRect(0, 0, 12, 4);
  g.strokeRect(0, 0, 12, 4);
  g.generateTexture(TEX.PARTICLE_SPARK, 12, 4);
  g.clear();

  g.fillStyle(C.HEAL_GREEN, 1);
  g.fillRect(0, 4, 10, 2);
  g.fillRect(4, 0, 2, 10);
  g.generateTexture(TEX.HP_CROSS, 10, 10);
  g.clear();

  g.fillStyle(C.WHITE, 0.6);
  g.fillCircle(8, 8, 8);
  g.generateTexture(TEX.SMOKE, 16, 16);
  g.clear();

  g.fillStyle(C.WOOD, 0.5);
  g.fillCircle(6, 6, 6);
  g.generateTexture(TEX.DUST, 12, 12);
  g.clear();

  g.lineStyle(2, 0xb45309, 1);
  g.fillStyle(0xfacc15, 1);
  g.fillCircle(10, 10, 9);
  g.strokeCircle(10, 10, 9);
  g.generateTexture(TEX.GOLD_COIN, 20, 20);

  g.destroy();
}

export function drawSoftCloud(scene: Phaser.Scene, x: number, y: number, scale = 1, depth = -15) {
  const container = scene.add.container(x, y).setScale(scale).setDepth(depth);
  const shadow = scene.add.graphics();
  shadow.fillStyle(C.CLOUD_SHADOW, 0.32);
  shadow.fillEllipse(8, 13, 118, 32);

  const gfx = scene.add.graphics();
  gfx.lineStyle(3, 0x93c5fd, 0.55);
  gfx.fillStyle(C.CLOUD, 0.92);
  gfx.fillCircle(-40, 8, 22);
  gfx.fillCircle(-14, -2, 32);
  gfx.fillCircle(24, 4, 27);
  gfx.fillCircle(48, 12, 20);
  gfx.fillRoundedRect(-55, 5, 122, 32, 16);
  gfx.strokeRoundedRect(-55, 5, 122, 32, 16);

  container.add([shadow, gfx]);
  return container;
}

export function drawDistantIsland(scene: Phaser.Scene, x: number, y: number, width: number, scale = 1) {
  const container = scene.add.container(x, y).setScale(scale).setDepth(-12).setAlpha(0.5);
  const gfx = scene.add.graphics();
  gfx.fillStyle(0x4f46e5, 0.22);
  gfx.fillEllipse(0, 0, width, width * 0.28);
  gfx.fillStyle(0x22c55e, 0.28);
  gfx.fillEllipse(0, -6, width * 0.9, width * 0.16);
  gfx.fillStyle(0x7c2d12, 0.26);
  gfx.beginPath();
  gfx.moveTo(-width * 0.34, 2);
  gfx.lineTo(width * 0.34, 2);
  gfx.lineTo(width * 0.12, width * 0.42);
  gfx.lineTo(-width * 0.12, width * 0.42);
  gfx.closePath();
  gfx.fillPath();
  container.add(gfx);
  return container;
}

export function drawFloatingIsland(
  scene: Phaser.Scene,
  x: number,
  y: number,
  width: number,
  height: number,
  depth = 0,
) {
  const container = scene.add.container(x, y).setDepth(depth);
  const gfx = scene.add.graphics();

  gfx.fillStyle(0x000000, 0.18);
  gfx.fillEllipse(0, height + 42, width * 0.92, 34);

  gfx.lineStyle(4, 0x1f2937, 0.8);
  gfx.fillStyle(C.ISLAND_EARTH, 1);
  gfx.beginPath();
  gfx.moveTo(-width / 2, 0);
  gfx.lineTo(-width * 0.34, height * 0.34);
  gfx.lineTo(-width * 0.18, height * 0.74);
  gfx.lineTo(0, height);
  gfx.lineTo(width * 0.18, height * 0.74);
  gfx.lineTo(width * 0.34, height * 0.34);
  gfx.lineTo(width / 2, 0);
  gfx.closePath();
  gfx.fillPath();
  gfx.strokePath();

  gfx.fillStyle(C.ISLAND_ROCK, 0.8);
  for (let i = -2; i <= 2; i++) {
    const px = i * (width / 8);
    const tipY = height * (0.52 + ((i + 3) % 3) * 0.06);
    gfx.fillTriangle(px - 16, 18, px + 18, 18, px + 2, tipY);
  }

  gfx.fillStyle(C.ISLAND_TOP, 1);
  gfx.fillEllipse(0, -6, width, 46);
  gfx.lineStyle(4, 0x14532d, 0.85);
  gfx.strokeEllipse(0, -6, width, 46);

  gfx.fillStyle(C.ISLAND_GRASS, 1);
  gfx.fillEllipse(-width * 0.1, -15, width * 0.74, 26);
  gfx.fillStyle(0xfacc15, 0.7);
  gfx.fillCircle(width * 0.22, -18, 5);
  gfx.fillCircle(-width * 0.3, -14, 4);

  container.add(gfx);
  return container;
}

export function drawTurnBanner(scene: Phaser.Scene, x: number, y: number, text: string) {
  const container = scene.add.container(x, y).setDepth(120);
  const bg = scene.add.graphics();
  bg.fillStyle(C.PANEL_BLUE, 0.82);
  bg.fillRoundedRect(-88, -22, 176, 44, 16);
  bg.lineStyle(3, 0xfde68a, 1);
  bg.strokeRoundedRect(-88, -22, 176, 44, 16);

  const label = scene.add.text(0, 0, text, {
    fontSize: '16px',
    fontFamily: 'Arial Black',
    color: '#ffffff',
    stroke: '#172554',
    strokeThickness: 5,
  }).setOrigin(0.5);

  container.add([bg, label]);
  scene.tweens.add({
    targets: container,
    y: y - 7,
    duration: 1200,
    yoyo: true,
    repeat: -1,
    ease: 'Sine.easeInOut',
  });

  return container;
}

// ─── NATIVE CHARACTER ───────────────────────────────────────────────────────
export type NativeType = 'attacker' | 'defender';
export type NativeState = 'IDLE' | 'PUSHING' | 'PANIC' | 'REPAIRING';

export function drawNative(
  scene: Phaser.Scene, x: number, y: number,
  type: NativeType, state: NativeState = 'IDLE'
) {
  const container = scene.add.container(x, y);
  container.setScale(1.2);
  const gfx = scene.add.graphics();
  gfx.lineStyle(2, C.BLACK, 1);
  const cloth = type === 'attacker' ? C.CLOTH_ATK : C.CLOTH_DEF;

  // Body
  gfx.fillStyle(cloth, 1);
  gfx.fillRoundedRect(-5, 0, 10, 22, 2);
  gfx.strokeRoundedRect(-5, 0, 10, 22, 2);

  // Head
  gfx.fillStyle(C.SKIN, 1);
  gfx.fillCircle(0, -7, 6);
  gfx.strokeCircle(0, -7, 6);

  // Hair bun
  gfx.fillStyle(C.HAIR, 1);
  gfx.fillCircle(0, -10, 3.5);

  // 🌟 FIX TẬN GỐC GẠCH ĐỎ NÓN LÁ: Sử dụng Path thuần túy 🌟
  gfx.fillStyle(C.HAT, 1);
  gfx.lineStyle(1, C.BLACK, 1);
  gfx.beginPath();
  gfx.moveTo(-9, -11);
  gfx.lineTo(0, -20);
  gfx.lineTo(9, -11);
  gfx.closePath();
  gfx.fillPath();
  gfx.strokePath();
  gfx.lineStyle(2, C.BLACK, 1);

  // Limbs
  gfx.fillStyle(C.SKIN, 1);
  if (state === 'PUSHING') {
    gfx.fillRect(-12, 4, 9, 3); gfx.strokeRect(-12, 4, 9, 3);
    gfx.fillRect(-10, 10, 7, 3); gfx.strokeRect(-10, 10, 7, 3);
    gfx.fillRect(-3, 22, 3, 10); gfx.strokeRect(-3, 22, 3, 10);
    gfx.fillRect(1, 20, 3, 10); gfx.strokeRect(1, 20, 3, 10);
  } else if (state === 'REPAIRING') {
    gfx.fillRect(2, 4, 10, 3); gfx.strokeRect(2, 4, 10, 3);
    gfx.fillStyle(C.WOOD, 1);
    gfx.fillRect(11, -1, 3, 9); gfx.strokeRect(11, -1, 3, 9);
    gfx.fillStyle(C.IRON, 1);
    gfx.fillRect(9, -4, 7, 4); gfx.strokeRect(9, -4, 7, 4);
    gfx.fillStyle(C.SKIN, 1);
    gfx.fillRect(-7, 4, 3, 12); gfx.strokeRect(-7, 4, 3, 12);
    gfx.fillRect(-3, 22, 3, 10); gfx.strokeRect(-3, 22, 3, 10);
    gfx.fillRect(1, 22, 3, 10); gfx.strokeRect(1, 22, 3, 10);
  } else if (state === 'PANIC') {
    gfx.fillRect(-9, -2, 3, 10); gfx.strokeRect(-9, -2, 3, 10);
    gfx.fillRect(6, -2, 3, 10); gfx.strokeRect(6, -2, 3, 10);
    gfx.fillRect(-4, 22, 3, 10); gfx.strokeRect(-4, 22, 3, 10);
    gfx.fillRect(2, 20, 3, 12); gfx.strokeRect(2, 20, 3, 12);
  } else {
    gfx.fillRect(-7, 4, 3, 13); gfx.strokeRect(-7, 4, 3, 13);
    gfx.fillRect(4, 4, 3, 13); gfx.strokeRect(4, 4, 3, 13);
    gfx.fillRect(-3, 22, 3, 10); gfx.strokeRect(-3, 22, 3, 10);
    gfx.fillRect(1, 22, 3, 10); gfx.strokeRect(1, 22, 3, 10);
  }

  container.add(gfx);
  return container;
}

// ─── SIEGE MACHINE ──────────────────────────────────────────────────────────
export function drawCatapult(scene: Phaser.Scene, x: number, y: number) {
  const container = scene.add.container(x, y);
  container.setScale(0.8);

  const gfx = scene.add.graphics();
  gfx.lineStyle(3, C.BLACK, 1);
  gfx.fillStyle(C.WOOD, 1);

  gfx.fillRoundedRect(-45, 0, 90, 16, 5);
  gfx.strokeRoundedRect(-45, 0, 90, 16, 5);

  gfx.fillStyle(C.BLACK, 1);
  gfx.fillCircle(-28, 18, 9); gfx.strokeCircle(-28, 18, 9);
  gfx.fillCircle(28, 18, 9); gfx.strokeCircle(28, 18, 9);
  gfx.fillStyle(C.BRONZE, 1);
  gfx.fillCircle(-28, 18, 3); gfx.fillCircle(28, 18, 3);

  gfx.fillStyle(C.WOOD, 1);
  gfx.lineStyle(3, C.BLACK, 1);
  gfx.fillRect(-6, -55, 12, 55);
  gfx.strokeRect(-6, -55, 12, 55);

  const arm = scene.add.graphics();
  arm.lineStyle(3, C.BLACK, 1);
  arm.fillStyle(C.WOOD_LIGHT, 1);
  arm.fillRoundedRect(-4, -65, 8, 75, 4);
  arm.strokeRoundedRect(-4, -65, 8, 75, 4);

  arm.fillStyle(C.WOOD, 1);
  arm.fillCircle(0, -65, 13);
  arm.strokeCircle(0, -65, 13);

  container.add([gfx, arm]);
  return { container, arm };
}

// ─── AMMO VISUALS ───────────────────────────────────────────────────────────
export function drawWoodAmmoIcon(scene: Phaser.Scene, x: number, y: number) {
  const gfx = scene.add.graphics();
  gfx.lineStyle(2, C.BLACK, 1);
  gfx.fillStyle(C.WOOD_LIGHT, 1);
  gfx.fillRoundedRect(x - 20, y - 6, 40, 12, 3);
  gfx.strokeRoundedRect(x - 20, y - 6, 40, 12, 3);
  gfx.fillStyle(C.WOOD_DARK, 1);
  gfx.fillRect(x - 12, y - 2, 24, 2);
  gfx.fillCircle(x - 14, y, 3.5);
  gfx.fillCircle(x + 14, y, 3.5);
  return gfx;
}

export function drawStoneAmmoIcon(scene: Phaser.Scene, x: number, y: number) {
  const gfx = scene.add.graphics();
  gfx.lineStyle(2, C.BLACK, 1);
  gfx.fillStyle(C.STONE, 1);

  // 🌟 FIX TẬN GỐC GẠCH ĐỎ HÌNH ĐA GIÁC: Dùng Path 🌟
  gfx.beginPath();
  gfx.moveTo(x - 12, y - 7);
  gfx.lineTo(x + 4, y - 14);
  gfx.lineTo(x + 14, y - 5);
  gfx.lineTo(x + 11, y + 9);
  gfx.lineTo(x - 4, y + 14);
  gfx.lineTo(x - 14, y + 3);
  gfx.closePath();
  gfx.fillPath();
  gfx.strokePath();

  gfx.fillStyle(C.STONE_DARK, 0.4);
  gfx.fillCircle(x - 3, y - 3, 4);
  return gfx;
}

export function drawIronAmmoIcon(scene: Phaser.Scene, x: number, y: number) {
  const gfx = scene.add.graphics();
  gfx.lineStyle(2, C.BLACK, 1);
  gfx.fillStyle(C.IRON, 1);
  gfx.fillCircle(x, y, 10); gfx.strokeCircle(x, y, 10);
  gfx.fillStyle(C.STONE, 1);
  gfx.fillCircle(x - 5, y - 5, 2); gfx.fillCircle(x + 5, y + 5, 2);
  gfx.fillCircle(x + 5, y - 5, 2); gfx.fillCircle(x - 5, y + 5, 2);
  return gfx;
}

export function drawFireAmmoIcon(scene: Phaser.Scene, x: number, y: number) {
  const gfx = scene.add.graphics();
  gfx.lineStyle(2, C.BLACK, 1);
  gfx.fillStyle(C.STONE_DARK, 1);

  // Lõi đá đen
  gfx.beginPath();
  gfx.moveTo(x - 10, y - 5);
  gfx.lineTo(x + 2, y - 12);
  gfx.lineTo(x + 12, y - 3);
  gfx.lineTo(x + 9, y + 11);
  gfx.lineTo(x - 5, y + 12);
  gfx.lineTo(x - 12, y + 5);
  gfx.closePath();
  gfx.fillPath();
  gfx.strokePath();

  gfx.fillStyle(0xf97316, 0.8);
  gfx.fillCircle(x, y + 4, 6);
  gfx.fillStyle(0xef4444, 0.9);

  // Vệt lửa
  gfx.beginPath();
  gfx.moveTo(x - 8, y + 8);
  gfx.lineTo(x, y - 15);
  gfx.lineTo(x + 8, y + 8);
  gfx.closePath();
  gfx.fillPath();

  return gfx;
}

export function drawAcidAmmoIcon(scene: Phaser.Scene, x: number, y: number) {
  const gfx = scene.add.graphics();
  gfx.lineStyle(2, C.BLACK, 1);
  gfx.fillStyle(C.STONE_DARK, 1);
  gfx.fillCircle(x, y, 10); gfx.strokeCircle(x, y, 10);
  gfx.fillStyle(C.ACID, 1);
  gfx.fillCircle(x - 3, y - 4, 4); gfx.strokeCircle(x - 3, y - 4, 4);
  gfx.fillCircle(x + 4, y + 2, 3); gfx.strokeCircle(x + 4, y + 2, 3);
  gfx.fillCircle(x - 2, y + 5, 2);
  return gfx;
}

export function drawClusterAmmoIcon(scene: Phaser.Scene, x: number, y: number) {
  const gfx = scene.add.graphics();
  gfx.lineStyle(2, C.BLACK, 1);
  gfx.fillStyle(C.STONE, 1);
  gfx.fillCircle(x - 6, y + 4, 6); gfx.strokeCircle(x - 6, y + 4, 6);
  gfx.fillCircle(x + 6, y + 4, 6); gfx.strokeCircle(x + 6, y + 4, 6);
  gfx.fillCircle(x, y - 6, 6); gfx.strokeCircle(x, y - 6, 6);
  gfx.lineStyle(2, C.WOOD_DARK, 1);
  gfx.strokeCircle(x, y, 8);
  return gfx;
}

export function drawVoidAmmoIcon(scene: Phaser.Scene, x: number, y: number) {
  const gfx = scene.add.graphics();
  gfx.fillStyle(C.VOID_GLOW, 0.4);
  gfx.fillCircle(x, y, 14);
  gfx.fillStyle(C.VOID_GLOW, 0.7);
  gfx.fillCircle(x, y, 11);
  gfx.lineStyle(2, C.WHITE, 1);
  gfx.fillStyle(C.VOID, 1);

  gfx.beginPath();
  gfx.moveTo(x, y - 8);
  gfx.lineTo(x + 8, y);
  gfx.lineTo(x, y + 8);
  gfx.lineTo(x - 8, y);
  gfx.closePath();
  gfx.fillPath();
  gfx.strokePath();

  return gfx;
}

export function drawAmmoSelectorIcon(
  scene: Phaser.Scene, x: number, y: number, ammoType: string, count: number = 0
) {
  const container = scene.add.container(x, y);
  container.setScale(1.2);
  const ammoLabelMap: Record<string, string> = {
    WOOD: 'GỖ',
    STONE: 'ĐÁ',
    IRON: 'SẮT',
    FIRE: 'LỬA',
    ACID: 'AXÍT',
    CLUSTER: 'CHÙM',
    VOID: 'HƯ KHÔNG',
  };

  let borderColor: number = C.WOOD_LIGHT;
  let bgColor: number = 0x0f172a;

  if (ammoType === 'STONE') borderColor = C.STONE as number;
  else if (ammoType === 'IRON') { borderColor = C.IRON as number; bgColor = 0x064e3b; }
  else if (ammoType === 'FIRE') { borderColor = 0xf97316; bgColor = 0x1e3a8a; }
  else if (ammoType === 'ACID') { borderColor = C.ACID as number; bgColor = 0x4c1d95; }
  else if (ammoType === 'CLUSTER') { borderColor = 0xfacc15; bgColor = 0x713f12; }
  else if (ammoType === 'VOID') { borderColor = C.VOID_GLOW as number; bgColor = 0x7f1d1d; }

  const bg = scene.add.graphics();
  bg.fillStyle(bgColor, 0.9);
  bg.fillRoundedRect(-30, -30, 60, 60, 16);
  bg.lineStyle(3, borderColor, 1);
  bg.strokeRoundedRect(-30, -30, 60, 60, 16);
  container.add(bg);

  if (ammoType === 'WOOD') container.add(drawWoodAmmoIcon(scene, 0, 0));
  else if (ammoType === 'STONE') container.add(drawStoneAmmoIcon(scene, 0, 0));
  else if (ammoType === 'IRON') container.add(drawIronAmmoIcon(scene, 0, 0));
  else if (ammoType === 'FIRE') container.add(drawFireAmmoIcon(scene, 0, 0));
  else if (ammoType === 'ACID') container.add(drawAcidAmmoIcon(scene, 0, 0));
  else if (ammoType === 'CLUSTER') container.add(drawClusterAmmoIcon(scene, 0, 0));
  else if (ammoType === 'VOID') container.add(drawVoidAmmoIcon(scene, 0, 0));

  const label = scene.add.text(0, 22, ammoLabelMap[ammoType] || ammoType, {
    fontSize: '8px', fontFamily: 'Arial Black', color: '#f8fafc',
  }).setOrigin(0.5);
  container.add(label);

  const countText = scene.add.text(22, -22, count > 99 ? '99+' : count.toString(), {
    fontSize: '10px', fontFamily: 'Arial Black', color: '#ffffff',
    backgroundColor: '#ef4444', padding: { x: 4, y: 2 }
  }).setOrigin(0.5).setDepth(110);

  const countBg = scene.add.graphics();
  countBg.fillStyle(0xef4444, 1);
  countBg.fillCircle(22, -22, 10);
  countBg.lineStyle(1, 0xffffff, 1);
  countBg.strokeCircle(22, -22, 10);

  container.add(countBg);
  container.add(countText);

  container.setSize(60, 60);
  container.setInteractive({ useHandCursor: true });
  container.setDepth(100);
  return container;
}

// ─── EARTHEN CASTLE (ENEMY WALL) ────────────────────────────────────────────
export interface CastleRefs {
  container: Phaser.GameObjects.Container;
  wallGfx: Phaser.GameObjects.Graphics;
  hpBarFill: Phaser.GameObjects.Graphics;
  hpText: Phaser.GameObjects.Text;
  wallWidth: number;
  wallHeight: number;
}

export function drawEarthenCastle(
  scene: Phaser.Scene, x: number, y: number,
  width: number, height: number,
  currentHp: number, maxHp: number,
): CastleRefs {
  const container = scene.add.container(x, y);
  const wallGfx = scene.add.graphics();
  wallGfx.fillStyle(0x000000, 0.22);
  wallGfx.fillEllipse(width / 2, height + 16, width * 0.9, 26);

  wallGfx.lineStyle(4, 0x431407, 1);
  wallGfx.fillStyle(C.BRICK_DARK, 1);
  wallGfx.fillRoundedRect(-10, 18, width + 20, height - 10, 12);

  wallGfx.fillStyle(C.BRICK, 1);
  wallGfx.fillRoundedRect(0, 0, width, height, 10);
  wallGfx.strokeRoundedRect(0, 0, width, height, 10);

  wallGfx.lineStyle(1, 0xfbbf24, 0.28);
  for (let row = 18; row < height - 28; row += 24) {
    for (let col = 8; col < width - 18; col += 42) {
      const offset = row % 48 === 18 ? 0 : 20;
      wallGfx.strokeRoundedRect(col + offset, row, 32, 13, 3);
    }
  }

  wallGfx.fillStyle(C.BRICK, 1);
  wallGfx.lineStyle(4, 0x431407, 1);
  const merlonW = width / 9;
  for (let i = 0; i < width; i += merlonW * 2) {
    wallGfx.fillRoundedRect(i, -merlonW * 0.62, merlonW, merlonW * 0.66, 5);
    wallGfx.strokeRoundedRect(i, -merlonW * 0.62, merlonW, merlonW * 0.66, 5);
  }

  wallGfx.fillStyle(C.GATE, 1);
  wallGfx.lineStyle(3, 0x1c1917, 1);
  const gateW = 44, gateH = 54;
  wallGfx.fillRoundedRect(width / 2 - gateW / 2, height - gateH, gateW, gateH, 12);
  wallGfx.strokeRoundedRect(width / 2 - gateW / 2, height - gateH, gateW, gateH, 12);
  wallGfx.fillStyle(C.IRON, 1);
  wallGfx.fillCircle(width / 2 - 10, height - gateH / 2, 3);
  wallGfx.fillCircle(width / 2 + 10, height - gateH / 2, 3);

  const hpBarW = width * 0.82;
  const hpBarX = (width - hpBarW) / 2;
  const hpBarY = -66;

  wallGfx.fillStyle(C.PANEL_BLUE, 0.86);
  wallGfx.fillRoundedRect(hpBarX - 12, hpBarY - 12, hpBarW + 24, 30, 12);
  wallGfx.lineStyle(3, 0xfde68a, 1);
  wallGfx.strokeRoundedRect(hpBarX - 12, hpBarY - 12, hpBarW + 24, 30, 12);
  wallGfx.fillStyle(C.HP_RED, 1);
  wallGfx.fillRoundedRect(hpBarX, hpBarY, hpBarW, 10, 5);

  const hpBarFill = scene.add.graphics();
  const pct = currentHp / maxHp;
  hpBarFill.fillStyle(C.HP_GREEN, 1);
  hpBarFill.fillRoundedRect(hpBarX, hpBarY, hpBarW * pct, 10, 5);

  const hpText = scene.add.text(width / 2, hpBarY - 15, `${Math.ceil(currentHp)} / ${maxHp}`, {
    fontSize: '11px', fontFamily: 'Arial Black', color: '#ffffff',
    stroke: '#172554', strokeThickness: 4,
  }).setOrigin(0.5, 0.5);

  container.add([wallGfx, hpBarFill, hpText]);
  return { container, wallGfx, hpBarFill, hpText, wallWidth: width, wallHeight: height };
}

export function updateCastleHpBar(refs: CastleRefs, currentHp: number, maxHp: number) {
  const hpBarW = refs.wallWidth * 0.82;
  const hpBarX = (refs.wallWidth - hpBarW) / 2;
  const hpBarY = -66;
  const pct = Math.max(0, currentHp / maxHp);

  refs.hpBarFill.clear();
  refs.hpBarFill.fillStyle(pct > 0.3 ? C.HP_GREEN : C.HP_RED, 1);
  refs.hpBarFill.fillRoundedRect(hpBarX, hpBarY, hpBarW * pct, 10, 5);
  refs.hpText.setText(`${Math.ceil(currentHp)} / ${maxHp}`);
}

export function drawEraUI(scene: Phaser.Scene, x: number, y: number, eraName: string) {
  const container = scene.add.container(x, y);
  const panel = scene.add.graphics();
  panel.fillStyle(0x0f172a, 0.85);
  panel.fillRoundedRect(0, 0, 160, 60, 12);
  panel.lineStyle(2, C.BRONZE, 1);
  panel.strokeRoundedRect(0, 0, 160, 60, 12);

  const label = scene.add.text(80, 18, 'ERA', {
    fontSize: '8px', color: '#cd7f32', fontFamily: 'Arial Black',
  }).setOrigin(0.5);

  const title = scene.add.text(80, 38, eraName, {
    fontSize: '16px', color: '#ffffff', fontFamily: 'Arial Black',
  }).setOrigin(0.5);

  container.add([panel, label, title]);
  container.setDepth(100);
  return container;
}

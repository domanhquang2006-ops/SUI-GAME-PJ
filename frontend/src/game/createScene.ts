import Phaser from 'phaser';
import {
  C, TEX, generateTextures,
  drawNative, drawCatapult, drawEarthenCastle, updateCastleHpBar,
  drawAmmoSelectorIcon, drawSoftCloud, drawDistantIsland, drawFloatingIsland, drawTurnBanner,
  type CastleRefs,
} from './drawEntities';

// ─── TYPES & INTERFACES ─────────────────────────────────────────────────────
export const GAME_WIDTH = 1024;
export const GAME_HEIGHT = 768;

export type AmmoType = 'WOOD' | 'STONE' | 'IRON' | 'FIRE' | 'ACID' | 'CLUSTER' | 'VOID';

export interface ShotVector { forceX: number; forceY: number; }

export interface MatchPayload {
  matchId: string;
  energyConsumed: number;
  shots: ShotVector[];
  totalDamageDealt: number;
  ammoUsed: Record<string, number>;
}

export interface MainSceneCallbacks {
  onWallDestroyed: (payload: MatchPayload) => void;
  onShootAttempt?: () => boolean;
  onAmmoConsumed: (type: AmmoType) => void;
  onAmmoRequest: () => void;
  initialAmmoType: AmmoType;
  initialAmmoCounts: Record<AmmoType, number>;
}

export type CreateMainSceneOptions = MainSceneCallbacks & {
  initialAmmoType?: AmmoType;
};

// ─── AMMO CONFIG ────────────────────────────────────────────────────────────
const AMMO_CONFIG: Record<AmmoType, {
  damage: number; gravityY: number; radius: number;
  color: number; powerMult: number; shakeOnHit: boolean;
}> = {
  WOOD: { damage: 1, gravityY: 400, radius: 6, color: C.WOOD_LIGHT, powerMult: 2.0, shakeOnHit: false },
  STONE: { damage: 3, gravityY: 800, radius: 10, color: C.STONE, powerMult: 1.6, shakeOnHit: true },
  IRON: { damage: 6, gravityY: 1000, radius: 10, color: C.IRON, powerMult: 1.2, shakeOnHit: true },
  FIRE: { damage: 2, gravityY: 600, radius: 8, color: 0xf97316, powerMult: 1.8, shakeOnHit: false },
  ACID: { damage: 1, gravityY: 600, radius: 8, color: C.ACID, powerMult: 1.8, shakeOnHit: false },
  CLUSTER: { damage: 2, gravityY: 700, radius: 10, color: C.STONE, powerMult: 1.6, shakeOnHit: false },
  VOID: { damage: 5, gravityY: 500, radius: 10, color: C.VOID, powerMult: 2.0, shakeOnHit: true },
};

const MACHINE_BASE_DAMAGE = 1;
const WALL_MAX_HP = 12;
const WALL_REGEN_MS = 5_000;
const WALL_REGEN_AMOUNT = 1;
const REPAIR_THRESHOLD = 0.8;
const MAX_DRAG_DISTANCE = 400;

const VICTORY_GOLD_REWARD = 500;

// ─── MAIN SCENE FACTORY ─────────────────────────────────────────────────────
export function createMainScene(options: CreateMainSceneOptions): Phaser.Types.Scenes.SceneType {
  return {
    key: 'MainScene',

    preload(this: Phaser.Scene) {
      generateTextures(this);
    },

    create(this: Phaser.Scene) {
      const { width, height } = this.scale;
      this.input.mouse?.disableContextMenu();

      // ── STATE ──
      let currentAmmo: AmmoType = options.initialAmmoType || 'WOOD';
      let wallHp = WALL_MAX_HP;
      let isDragging = false;
      let roundLocked = false;
      let startX = 0, startY = 0;

      const matchPayload: MatchPayload = {
        matchId: `M_${Date.now()}`,
        energyConsumed: 0,
        shots: [],
        totalDamageDealt: 0,
        ammoUsed: {},
      };

      // Fantasy sky and floating island backdrop.
      this.add.rectangle(width / 2, height / 2, width * 2, height * 2, C.SKY_TOP).setDepth(-30);
      this.add.rectangle(width / 2, height * 0.42, width * 2, height * 0.55, C.SKY_MID, 0.34).setDepth(-29);
      this.add.rectangle(width / 2, height * 0.86, width * 2, height * 0.38, C.SKY_DEEP, 0.28).setDepth(-28);

      const sun = this.add.graphics().setDepth(-24);
      sun.fillStyle(0xfde68a, 0.72);
      sun.fillCircle(width * 0.84, height * 0.16, 52);
      sun.fillStyle(0xffffff, 0.34);
      sun.fillCircle(width * 0.84, height * 0.16, 76);

      drawDistantIsland(this, width * 0.22, height * 0.34, 220, 0.8);
      drawDistantIsland(this, width * 0.58, height * 0.29, 170, 0.65);
      drawDistantIsland(this, width * 0.84, height * 0.38, 260, 0.82);

      const cloudA = drawSoftCloud(this, width * 0.14, height * 0.14, 1.05);
      const cloudB = drawSoftCloud(this, width * 0.48, height * 0.1, 0.72);
      const cloudC = drawSoftCloud(this, width * 0.76, height * 0.2, 1.25);
      [cloudA, cloudB, cloudC].forEach((cloud, index) => {
        this.tweens.add({
          targets: cloud,
          x: cloud.x + (index % 2 === 0 ? 34 : -28),
          duration: 7000 + index * 1600,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        });
      });

      // The visible islands are decorative; the invisible physics floor preserves gameplay.
      const groundHeight = Math.min(190, Math.max(88, height * 0.24));
      const groundY = height - groundHeight;
      drawFloatingIsland(this, width * 0.18, groundY + 14, Math.max(300, width * 0.38), 130, -2);
      drawFloatingIsland(this, width * 0.7, groundY + 12, Math.max(360, width * 0.42), 150, -2);

      const bridge = this.add.graphics().setDepth(-1);
      bridge.lineStyle(7, C.WOOD_DARK, 0.9);
      bridge.lineBetween(width * 0.33, groundY - 2, width * 0.54, groundY - 5);
      bridge.lineStyle(3, C.WOOD_LIGHT, 0.9);
      for (let i = 0; i < 8; i++) {
        const px = width * 0.34 + i * (width * 0.025);
        bridge.lineBetween(px, groundY - 15, px + 18, groundY + 8);
      }

      const ground = this.add.rectangle(width / 2, groundY, width * 2, groundHeight + 500, 0x000000, 0).setOrigin(0.5, 0);
      this.physics.add.existing(ground, true);
      const groundBody = ground.body as Phaser.Physics.Arcade.StaticBody;
      groundBody.setSize(width * 2, groundHeight + 500).setOffset(-width, 0);
      const bannerY = Math.min(124, Math.max(78, height * 0.32));
      drawTurnBanner(this, width / 2, bannerY, 'LƯỢT CỦA BẠN');

      // ── ENEMY CASTLE ──
      const castleW = Math.min(220, Math.max(160, width * 0.22));
      const castleH = Math.min(170, Math.max(112, height * 0.28));
      const castleX = Math.min(width - castleW - 40, width * 0.7);
      const castleY = groundY - 12;

      // Effect Queue States
      let burnTime = 0;
      let meltTime = 0;
      let voidTime = 0;

      // Reset Effect Particles
      let fireEmitter: Phaser.GameObjects.Particles.ParticleEmitter | null = null;
      let acidEmitter: Phaser.GameObjects.Particles.ParticleEmitter | null = null;
      let voidEmitter: Phaser.GameObjects.Particles.ParticleEmitter | null = null;

      const castleRefs: CastleRefs = drawEarthenCastle(
        this, castleX, castleY - castleH,
        castleW, castleH, wallHp, WALL_MAX_HP
      );

      castleRefs.container.setDepth(10);

      this.physics.add.existing(castleRefs.container, true);
      const castleBody = castleRefs.container.body as Phaser.Physics.Arcade.StaticBody;
      castleBody.setSize(castleW - 15, castleH + 20).setOffset(15, -10);

      // ── NATIVE X (DEFENDERS) ──
      const nativeYInside = castleY - castleH - 8;

      const hole1 = castleX + (castleW / 9) * 1.5;
      const hole2 = castleX + (castleW / 9) * 3.5;
      const hole3 = castleX + (castleW / 9) * 5.5;
      const hole4 = castleX + (castleW / 9) * 7.5;

      let wallNatives = [
        drawNative(this, hole1, nativeYInside, 'defender', 'IDLE').setDepth(9),
        drawNative(this, hole2, nativeYInside, 'defender', 'IDLE').setDepth(9),
        drawNative(this, hole3, nativeYInside, 'defender', 'IDLE').setDepth(9),
        drawNative(this, hole4, nativeYInside, 'defender', 'IDLE').setDepth(9),
      ];

      const nativeXRepair = drawNative(this, castleX + castleW / 2, castleY - 25, 'defender', 'REPAIRING').setDepth(11);
      nativeXRepair.setVisible(false);

      // ── PLAYER: CATAPULT + INTRO ──
      const playerFinalX = Math.max(120, width * 0.15);
      const playerY = groundY - 12;
      const playerStartX = -150;

      const { container: catapultCtr, arm: catapultArm } = drawCatapult(this, playerStartX, playerY);

      const nativeY1 = drawNative(this, playerStartX - 100, playerY + 2, 'attacker', 'PUSHING');
      const nativeY2 = drawNative(this, playerStartX - 70, playerY + 2, 'attacker', 'PUSHING');

      this.tweens.add({
        targets: [catapultCtr, nativeY1, nativeY2],
        x: `+=${playerFinalX - playerStartX}`,
        duration: 2000,
        ease: 'Power2',
        onComplete: () => {
          nativeY1.destroy();
          nativeY2.destroy();
          drawNative(this, playerFinalX - 140, playerY + 2, 'attacker', 'IDLE');
          drawNative(this, playerFinalX - 110, playerY + 2, 'attacker', 'IDLE');
        },
      });

      // ── AMMO SELECTOR & ENERGY ──
      const uiBaseX = playerFinalX - 50;

      let runtimeAmmoCounts = {
        ...options.initialAmmoCounts,
      };

      let ammoIcon: any;

      const redrawAmmoIcon = () => {

        if (ammoIcon) {
          ammoIcon.destroy();
        }

        const ammoCount =
          runtimeAmmoCounts[
          currentAmmo
          ] || 0;

        const ammoY = Math.min(height - 52, playerY + 125);

        ammoIcon =
          drawAmmoSelectorIcon(
            this,
            uiBaseX,
            ammoY,
            currentAmmo,
            ammoCount
          );

        ammoIcon.setAlpha(1);

        ammoIcon.on(
          'pointerdown',
          () => {
            options.onAmmoRequest?.();
          }
        );
      };

      // INITIAL DRAW
      redrawAmmoIcon();

      this.time.delayedCall(
        2200,
        () => {
          ammoIcon?.setAlpha(1);
        }
      );

      // drawEraUI(this, 16, 16, 'CATAPULT');

      const showEnergySpent = () => {
        const energyText = this.add.text(
          playerFinalX - 18,
          playerY + 54,
          '-1 ⚡',
          {
            fontSize: '18px',
            fontFamily: 'Arial Black',
            color: '#fde047',
            stroke: '#000000',
            strokeThickness: 5,
          }
        )
          .setOrigin(0.5)
          .setDepth(120);

        this.tweens.add({
          targets: energyText,
          y: playerY + 20,
          alpha: 0,
          duration: 550,
          ease: 'Cubic.easeOut',
          onComplete: () => {
            energyText.destroy();
          },
        });
      };

      // ── TRAJECTORY & POWER BAR ──
      const trajectoryGfx = this.add.graphics();
      const powerBarGfx = this.add.graphics();

      // ── WALL REGEN TIMER ──
      this.time.addEvent({
        delay: WALL_REGEN_MS,
        loop: true,
        callback: () => {
          if (wallHp > 0 && wallHp < WALL_MAX_HP) {
            if (voidTime > 0) return;
            let healAmount = WALL_REGEN_AMOUNT;
            if (burnTime > 0) healAmount *= 0.67;

            wallHp = Math.min(WALL_MAX_HP, wallHp + healAmount);
            updateCastleHpBar(castleRefs, wallHp, WALL_MAX_HP);

            const healEmitter = this.add.particles(castleX + castleW / 2, castleY - castleH / 2, TEX.PARTICLE_GLOW, {
              speed: { min: 40, max: 120 }, scale: { start: 0.8, end: 1.5 },
              alpha: { start: 0.8, end: 0 }, lifespan: 800, frequency: 80,
              blendMode: 'ADD', tint: 0x22c55e,
            });
            this.time.delayedCall(1000, () => healEmitter.stop());

            wallNatives.forEach(n => {
              this.tweens.add({
                targets: n, x: n.x + (Math.random() > 0.5 ? 15 : -15),
                duration: 400, yoyo: true, ease: 'Sine.easeInOut'
              });
            });
            nativeXRepair.setVisible(true);
            this.tweens.add({
              targets: nativeXRepair, x: castleX + (Math.random() * castleW),
              duration: 800, ease: 'Linear', onComplete: () => nativeXRepair.setVisible(false)
            });
          }
        },
      });

      // ── EFFECT QUEUE TICKER ──
      this.time.addEvent({
        delay: 1000,
        loop: true,
        callback: () => {
          if (wallHp <= 0) return;
          if (burnTime > 0) {
            burnTime -= 1000;
            const burnDmg = WALL_MAX_HP * 0.01;
            wallHp = Math.max(0, wallHp - burnDmg);
            updateCastleHpBar(castleRefs, wallHp, WALL_MAX_HP);
            if (burnTime <= 0 && fireEmitter) { fireEmitter.stop(); fireEmitter = null; }
          }
          if (meltTime > 0) {
            meltTime -= 1000;
            if (meltTime <= 0 && acidEmitter) { acidEmitter.stop(); acidEmitter = null; }
          }
          if (voidTime > 0) {
            voidTime -= 1000;
            if (voidTime <= 0 && voidEmitter) { voidEmitter.stop(); voidEmitter = null; }
          }
          if (wallHp <= 0 && !roundLocked) {
            roundLocked = true;
            setRepairState(false);
            if (healEmitter) { healEmitter.stop(); healEmitter = null; }
            this.time.delayedCall(1000, () => {
              this.cameras.main.fadeOut(1500, 255, 255, 255);
              this.cameras.main.once('camerafadeoutcomplete', () => {
                options.onWallDestroyed(matchPayload);
              });
            });
          }
        }
      });

      // ── HEAL PARTICLES ──
      let healEmitter: Phaser.GameObjects.Particles.ParticleEmitter | null = null;
      let repairTweens: Phaser.Tweens.Tween[] = [];

      const setRepairState = (active: boolean) => {
        nativeXRepair.setVisible(active);

        if (active && !healEmitter) {
          wallNatives.forEach(n => n.destroy());

          wallNatives = [
            drawNative(this, hole1, nativeYInside, 'defender', 'PANIC').setDepth(9),
            drawNative(this, hole2, nativeYInside, 'defender', 'PANIC').setDepth(9),
            drawNative(this, hole3, nativeYInside, 'defender', 'PANIC').setDepth(9),
            drawNative(this, hole4, nativeYInside, 'defender', 'PANIC').setDepth(9),
          ];

          wallNatives.forEach((n, i) => {
            const t = this.tweens.add({
              targets: n,
              x: `+=${i % 2 === 0 ? 20 : -20}`,
              duration: 150, yoyo: true, repeat: -1,
            });
            repairTweens.push(t);
          });

          const rt = this.tweens.add({
            targets: nativeXRepair,
            x: { value: `+=${castleW / 2 - 30}`, duration: 300, yoyo: true },
            y: { value: `-=10`, duration: 150, yoyo: true },
            repeat: -1,
          });
          repairTweens.push(rt);

          healEmitter = this.add.particles(
            castleX + castleW / 2, castleY - castleH / 2,
            TEX.HP_CROSS, {
            emitZone: { type: 'random', source: new Phaser.Geom.Rectangle(-castleW / 2.5, -castleH / 2, castleW * 0.8, castleH) } as any,
            speedY: { min: -60, max: -100 },
            scale: { start: 0.35, end: 0 },
            alpha: { start: 0.9, end: 0 },
            lifespan: 1000, frequency: 100,
          });
        } else if (!active && healEmitter) {
          healEmitter.stop();
          healEmitter = null;
          repairTweens.forEach(t => t.stop());
          repairTweens = [];

          wallNatives.forEach(n => n.destroy());
          wallNatives = [
            drawNative(this, hole1, nativeYInside, 'defender', 'IDLE').setDepth(9),
            drawNative(this, hole2, nativeYInside, 'defender', 'IDLE').setDepth(9),
            drawNative(this, hole3, nativeYInside, 'defender', 'IDLE').setDepth(9),
            drawNative(this, hole4, nativeYInside, 'defender', 'IDLE').setDepth(9),
          ];
        }
      };

      // ── LISTEN: AMMO_CHANGED ──

      (data: { type: AmmoType }) => {

        currentAmmo =
          data.type;

        redrawAmmoIcon();
      }


      this.game.events.on(
        'AMMO_COUNTS_UPDATED',
        (
          counts: Record<
            AmmoType,
            number
          >
        ) => {

          runtimeAmmoCounts = {
            ...counts,
          };

          redrawAmmoIcon();
        }
      );

      // UPDATE COUNTS REALTIME
      this.game.events.on(
        'AMMO_COUNTS_UPDATED',
        (
          counts: Record<
            AmmoType,
            number
          >
        ) => {

          runtimeAmmoCounts = {
            ...counts,
          };

          redrawAmmoIcon();
        }
      );

      // ── INPUT LOGIC ──
      this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
        if (roundLocked || p.rightButtonDown()) return;
        if (!(options.onShootAttempt?.() ?? true)) return;
        isDragging = true;
        startX = p.x; startY = p.y;
      });

      this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
        if (!isDragging || roundLocked) return;

        const cfg = AMMO_CONFIG[currentAmmo];
        const dist = Math.min(Phaser.Math.Distance.Between(startX, startY, p.x, p.y), MAX_DRAG_DISTANCE);
        const vx = (startX - p.x) * cfg.powerMult;
        const vy = (startY - p.y) * cfg.powerMult;

        catapultArm.rotation = Math.atan2(vy, vx) + Math.PI / 2;

        trajectoryGfx.clear();
        let tx = catapultCtr.x, ty = playerY - 45, tvy = vy;
        trajectoryGfx.fillStyle(C.WHITE, 0.5);
        for (let i = 0; i < 120; i++) {
          tvy += cfg.gravityY * (1 / 30);
          tx += vx * (1 / 30); ty += tvy * (1 / 30);
          trajectoryGfx.fillCircle(tx, ty, 2.5);
          if (ty > groundY - 12) break;
        }

        powerBarGfx.clear();
        powerBarGfx.fillStyle(C.BLACK, 0.5);
        powerBarGfx.fillRoundedRect(catapultCtr.x - 50, playerY - 75, 100, 7, 3);
        const barColor = dist > 300 ? 0xef4444 : dist > 150 ? 0xfacc15 : 0x22d3ee;
        powerBarGfx.fillStyle(barColor, 1);
        powerBarGfx.fillRoundedRect(catapultCtr.x - 50, playerY - 75, (dist / MAX_DRAG_DISTANCE) * 100, 7, 3);
      });

      // ── COLLISION SETUP HELPER ──
      const setupCollision = (proj: Phaser.GameObjects.Arc, projCfg: typeof AMMO_CONFIG[AmmoType]) => {
        this.physics.add.collider(proj, castleRefs.container, () => {
          const impactX = proj.x;
          const impactY = proj.y;

          proj.destroy();

          let totalDmg = MACHINE_BASE_DAMAGE + projCfg.damage;

          if (proj.getData('ammoType') === 'IRON') {
            totalDmg *= 2;
          }
          if (meltTime > 0) {
            totalDmg *= 1.5;
          }

          if (proj.getData('ammoType') === 'VOID') {
            totalDmg = MACHINE_BASE_DAMAGE + projCfg.damage;
            voidTime = 10000;
            if (!voidEmitter) {
              // 🌟 KHAI BÁO CHUẨN RANDOM ZONE ĐỂ HẾT GẠCH ĐỎ 🌟
              const zoneConfig: Phaser.Types.GameObjects.Particles.ParticleEmitterRandomZoneConfig = {
                type: 'random',
                source: new Phaser.Geom.Rectangle(-castleW / 2, -castleH / 2, castleW, castleH) as any
              };

              voidEmitter = this.add.particles(castleX + castleW / 2, castleY - castleH / 2, TEX.SMOKE, {
                tint: C.VOID_GLOW, speed: 20, scale: { start: 1, end: 0 }, alpha: 0.5, lifespan: 1500, frequency: 200, blendMode: 'ADD', emitZone: zoneConfig
              });
            }
          } else if (proj.getData('ammoType') === 'FIRE') {
            burnTime = 5000;
            if (!fireEmitter) {
              const zoneConfig: Phaser.Types.GameObjects.Particles.ParticleEmitterRandomZoneConfig = {
                type: 'random',
                source: new Phaser.Geom.Rectangle(-castleW / 2, -castleH / 2, castleW, castleH) as any
              };

              fireEmitter = this.add.particles(castleX + castleW / 2, castleY - castleH / 2, TEX.PARTICLE_SPARK, {
                tint: 0xf97316, speedY: { min: -50, max: -150 }, speedX: { min: -20, max: 20 }, scale: { start: 1, end: 0 }, lifespan: 800, frequency: 100, emitZone: zoneConfig
              });
            }
          } else if (proj.getData('ammoType') === 'ACID') {
            meltTime = 10000;
            if (!acidEmitter) {
              const zoneConfig: Phaser.Types.GameObjects.Particles.ParticleEmitterRandomZoneConfig = {
                type: 'random',
                source: new Phaser.Geom.Rectangle(-castleW / 2, -castleH / 2, castleW, castleH) as any
              };

              acidEmitter = this.add.particles(castleX + castleW / 2, castleY - castleH / 2, TEX.SMOKE, {
                tint: C.ACID, speedY: { min: -20, max: 20 }, scale: { start: 1.5, end: 0 }, alpha: 0.6, lifespan: 1200, frequency: 150, emitZone: zoneConfig
              });
            }
          }

          wallHp = Math.max(0, wallHp - totalDmg);
          matchPayload.totalDamageDealt += totalDmg;
          updateCastleHpBar(castleRefs, wallHp, WALL_MAX_HP);

          if (projCfg.shakeOnHit) this.cameras.main.shake(180, 0.012);

          this.add.particles(impactX, impactY, TEX.PARTICLE_SPARK, {
            speed: { min: 100, max: 250 }, angle: { min: 135, max: 225 },
            scale: { start: 0.8, end: 0 }, lifespan: 300, gravityY: 200,
          }).explode(projCfg.shakeOnHit ? 20 : 10);

          if (projCfg.shakeOnHit) {
            this.add.particles(impactX, impactY, TEX.DUST, {
              speed: { min: 30, max: 80 }, angle: { min: 150, max: 270 },
              scale: { start: 0.5, end: 0 }, lifespan: 600, gravityY: 60,
            }).explode(12);
          }

          wallNatives.forEach(n => n.setVisible(false));
          const panicNatives = [
            drawNative(this, hole1, nativeYInside, 'defender', 'PANIC').setDepth(9),
            drawNative(this, hole2, nativeYInside, 'defender', 'PANIC').setDepth(9),
            drawNative(this, hole3, nativeYInside, 'defender', 'PANIC').setDepth(9),
            drawNative(this, hole4, nativeYInside, 'defender', 'PANIC').setDepth(9),
          ];
          this.time.delayedCall(800, () => {
            panicNatives.forEach(n => n.destroy());
            wallNatives.forEach(n => n.setVisible(true));
          });

          if (wallHp > 0 && wallHp < WALL_MAX_HP * REPAIR_THRESHOLD) {
            setRepairState(true);
          }

          if (wallHp <= 0 && !roundLocked) {
            roundLocked = true;
            setRepairState(false);

            this.add.particles(castleX + castleW / 2, castleY - castleH, TEX.GOLD_COIN, {
              speedY: { min: -100, max: -300 }, speedX: { min: -100, max: 100 },
              scale: { start: 1, end: 0.5 }, lifespan: 1000, gravityY: 400, alpha: { start: 1, end: 0 },
            }).explode(20);

            const vicText = this.add.text(castleX + castleW / 2, castleY - castleH - 120, `CHIẾN THẮNG!\n+${VICTORY_GOLD_REWARD} VÀNG`, {
              fontSize: '28px', fontFamily: 'Arial Black', color: '#facc15',
              stroke: '#000000', strokeThickness: 6, align: 'center'
            }).setOrigin(0.5).setDepth(101);

            this.tweens.add({ targets: vicText, y: '-=50', alpha: 0, duration: 1500, ease: 'Linear' });

            this.cameras.main.shake(400, 0.02);
            this.tweens.add({
              targets: castleRefs.container,
              alpha: 0, scaleY: 0.5, y: castleY,
              duration: 600, ease: 'Power2',
              onComplete: () => {
                this.add.particles(castleX + castleW / 2, castleY - castleH / 3, TEX.SMOKE, {
                  speed: { min: 30, max: 80 }, angle: { min: 0, max: 360 },
                  scale: { start: 0.5, end: 0 }, lifespan: 1200, gravityY: -20,
                }).explode(25);

                this.time.delayedCall(500, () => {
                  options.onWallDestroyed({ ...matchPayload });
                });
              },
            });
          }
        });

        this.physics.add.collider(proj, ground, () => {
          proj.destroy();
          this.add.particles(proj.x, groundY - 12, TEX.DUST, {
            speed: { min: 10, max: 30 }, angle: { min: 240, max: 300 },
            scale: { start: 0.2, end: 0 }, lifespan: 400,
          }).explode(4);
        });
      };

      this.input.on('pointerup', (p: Phaser.Input.Pointer) => {
        if (!isDragging || roundLocked || p.button === 2) { isDragging = false; return; }
        isDragging = false;
        trajectoryGfx.clear(); powerBarGfx.clear();

        const cfg = AMMO_CONFIG[currentAmmo];
        const vx = (startX - p.x) * cfg.powerMult;
        const vy = (startY - p.y) * cfg.powerMult;

        if (Math.abs(vx) < 30) return;

        matchPayload.shots.push({ forceX: Math.round(vx), forceY: Math.round(vy) });
        matchPayload.energyConsumed++;

        matchPayload.ammoUsed[currentAmmo] =
          (matchPayload.ammoUsed[currentAmmo] || 0) + 1;

        // UPDATE UI LOCAL
        options.onAmmoConsumed?.(currentAmmo);
        showEnergySpent();

        // ─────────────────────────────
        // SYNC BACKEND ENERGY + AMMO
        // ─────────────────────────────

        try {

          const wallet =
            localStorage.getItem(
              'PLAYER_WALLET'
            );

          if (false && wallet) {

            fetch(
              'http://localhost:3000/api/use-ammo',
              {
                method: 'POST',

                headers: {
                  'Content-Type':
                    'application/json',
                },

                body: JSON.stringify({
                  playerAddress:
                    wallet,

                  ammoType:
                    currentAmmo,
                }),
              }
            ).catch(console.error);
          }

        } catch (err) {

          console.error(
            'USE_AMMO_SYNC_ERROR',
            err
          );
        }

        const bulletX = catapultCtr.x; const bulletY = playerY - 45;
        const bullet = this.add.circle(bulletX, bulletY, cfg.radius, cfg.color).setStrokeStyle(2, C.BLACK);
        this.physics.add.existing(bullet);

        bullet.setData('ammoType', currentAmmo);
        bullet.setData('scattered', false);

        const bulletBody = bullet.body as Phaser.Physics.Arcade.Body;
        bulletBody.setVelocity(vx, vy);
        bulletBody.setCircle(cfg.radius * 0.6, cfg.radius * 0.4, cfg.radius * 0.4);
        bulletBody.setGravityY(cfg.gravityY - 500);

        setupCollision(bullet, cfg);

        // Trail effect
        if (currentAmmo !== 'CLUSTER') {
          const trailEmitter = this.add.particles(0, 0, TEX.PARTICLE_GLOW, {
            follow: bullet,
            frequency: 40,
            lifespan: 300,
            scale: { start: 0.45, end: 0 },
            alpha: { start: 0.9, end: 0 },
            quantity: 1,
            blendMode: 'ADD',
          });

          bullet.setData('trailEmitter', trailEmitter);
        }

        // ── CLUSTER SPLIT LOGIC ──
        if (currentAmmo === 'CLUSTER') {
          const checkApex = () => {
            if (!bullet.active) return;
            const bBody = bullet.body as Phaser.Physics.Arcade.Body;
            if (bBody && bBody.velocity.y >= 0) {
              const px = bullet.x; const py = bullet.y;
              const bvx = bBody.velocity.x; const bvy = bBody.velocity.y;
              bullet.destroy();

              for (let i = -1; i <= 1; i++) {
                const subBullet = this.add.circle(px, py, 6, C.STONE).setStrokeStyle(1, C.BLACK);
                this.physics.add.existing(subBullet);
                subBullet.setData('ammoType', 'WOOD');
                const subBody = subBullet.body as Phaser.Physics.Arcade.Body;
                subBody.setCircle(4);
                subBody.setGravityY(200);
                subBody.setVelocity(bvx + (i * 150), bvy - 50);

                setupCollision(subBullet, AMMO_CONFIG['WOOD']);
              }
            } else {
              this.time.delayedCall(50, checkApex);
            }
          };
          checkApex();
        }
      });
    },
  };
}

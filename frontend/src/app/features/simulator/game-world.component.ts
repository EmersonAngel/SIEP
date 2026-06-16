import { CommonModule } from '@angular/common';
import { Component, ElementRef, NgZone, OnChanges, OnDestroy, SimpleChanges, ViewChild, input, output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import Phaser from 'phaser';
import { CollisionZoneState, MapObjectState, NpcConfig, RoomConfig, ScenarioConfig, SimulationWorldState } from '../../core/models/simulation.model';
import { backgroundImage } from './world-editor/room-edit.util';
import { KenneyCharFrames, KenneyDungeonFrames } from './kenney-frames.constants';
import {
  HOSPITAL_COLLISIONS,
  HOSPITAL_ZONES,
  isHospitalMap,
} from './hospital-map.config';
import {
  COMISARIA_COLLISIONS,
  COMISARIA_ZONES,
  isComisariaMap,
} from './comisaria-map.config';
import {
  applySceneDisplayLabels,
  buildSceneAmbientObject,
  getSceneAmbientZones,
  getSceneDisplayLabel,
} from './scene-map-display.util';
import {
  AVOIDANT_TRIGGER_RANGE, avoidantTarget, effectiveNpcBehavior, freeTileNear,
  MovementPattern, nextAnchorIndex, npcPause, npcSpeed, npcZone, pickWanderTarget,
  pickZoneTarget, reached, resolvePattern, stepToward,
} from './scene-motion.util';
import { SceneGuideEntry } from './scene-guide.config';
import { DEPTH, actorDepth, tiledLayerDepth } from './depth-sort.util';
import {
  AUTHORED_CLINICAL_COLLISIONS,
  AUTHORED_PLAYER_SPAWN,
  AUTHORED_ROOM_HEIGHT,
  AUTHORED_ROOM_WIDTH,
  authoredMarkerPosition,
} from './authored-clinical-room.util';
import { resolveSceneRenderer } from './scene-renderer.registry';
import { caseRoomCollisions } from './case-pdf-rooms.geometry';
import { SceneRenderMetadata } from './scene-layer.types';
import {
  NUDGE_SUBSTEPS,
  PLAYER_SPRITE_OFFSET_Y,
  PlayerDirection,
  PlayerMotionInput,
  computeNudgeStep,
  computePlayerStep,
  playerHitbox,
  rectsIntersect,
  resolveDirection,
} from './player-motion.util';
import {
  AVATAR_ANIM_KEYS,
  AVATAR_DISPLAY_SCALE,
  AVATAR_FRAME_HEIGHT,
  AVATAR_IDLE_FRAMES,
  AVATAR_TEXTURE_KEY,
  AvatarLayerSpec,
  avatarLayerSpecs,
  composeAvatarTexture,
  composeAvatarTextureAs,
  createAvatarAnimations,
  createAvatarAnimationsFor,
  modularAvatarFlipX,
  npcAvatarAnimKeys,
  npcAvatarTextureKey,
} from './phaser-avatar-renderer';
import {
  MAP_OBJECT_PRESETS,
  NPC_PRESET_RENDER,
  npcPresetConfig,
} from './npc-avatar-presets';
import { coerceAvatar, defaultAvatar, hairVariantPatch, parseAvatar } from '../character/avatar-config.util';
import { AVATAR_STORAGE_KEY } from '../character/avatar.store';
import { NpcAvatarPresetKey, NpcMotionConfig, NpcMovementZone } from '../../core/models/simulation.model';
import { AvatarConfig, CLOTHING_COLORS, GENDER_OPTIONS } from '../character/avatar.model';
import { AUTHORING_HAIR_VARIANTS, AUTHORING_NPC_TEMPLATES } from './authoring-catalog.config';

interface WorldCallbacks {
  onProximity:   (obj: MapObjectState | null) => void;
  onInteract:    (obj: MapObjectState) => void;
  onPosition:    (x: number, y: number) => void;
  onRoomExit:    (targetRoomKey: string, entryX: number, entryY: number) => void;
  onEnterRoom:   (targetNodeKey: string, entryX: number, entryY: number) => void;
  onNpcInteract: (npc: NpcConfig) => void;
  reduceMotion:  boolean;
  sfxMuted:       boolean;
}

interface AmbientMover {
  key: string;
  origin: { x: number; y: number };
  pattern: MovementPattern;
  target: { x: number; y: number } | null;
  retargetAt: number;
  patrolIdx: number;
}

interface NpcMover {
  key: string;
  cfg: NpcMotionConfig;
  zone: NpcMovementZone;
  target: { x: number; y: number } | null;
  anchorIdx: number;
  pauseUntil: number;
  lastPose: { direction: PlayerDirection | null; walking: boolean };
  /** null = sprite legacy (solo flip, sin animaciones modulares). */
  presetKey: string | null;
}

class DataDrivenWorldScene extends Phaser.Scene {
  private player?: Phaser.GameObjects.Container;
  private playerSprite?: Phaser.GameObjects.Sprite;
  private avatarSpecs: AvatarLayerSpec[] = [];
  private avatarReady = false;
  private readonly npcCompositesReady = new Set<string>();
  private lastDirection: PlayerDirection = 'down';
  /** Última pose aplicada — la animación solo cambia si dirección/caminar cambió. */
  private lastPose: { direction: PlayerDirection | null; walking: boolean } = { direction: null, walking: false };
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  private keys?: Record<string, Phaser.Input.Keyboard.Key>;
  private wallsLayer?: Phaser.Tilemaps.TilemapLayer;
  private scenarioConfig?: ScenarioConfig;
  private currentRoomKey = '';
  private authoredRoomActive = false;
  private dbDoorArmed = true;
  /** Histéresis de puertas BD: dispara al acercarse (≤30) pero solo re-arma al
   *  alejarse bien (≥72). Evita el rebote cuando el punto de entrada de una sala
   *  queda cerca de la puerta de regreso (el armado inmediato disparaba de vuelta). */
  private readonly doorTriggerDist = 30;
  private readonly doorRearmDist = 72;
  private readonly tiledExits   = new Map<string, { x: number; y: number; w: number; h: number }>();
  private readonly npcMarkers   = new Map<string, Phaser.GameObjects.Container>();
  private readonly markers    = new Map<string, Phaser.GameObjects.Container>();
  private readonly markerData = new Map<string, MapObjectState>();
  private readonly markerLabels = new Map<string, Phaser.GameObjects.Text>();
  private readonly doorHints  = new Map<string, Phaser.GameObjects.Container>();
  private readonly ambientMovers = new Map<string, AmbientMover>();
  private readonly npcMovers = new Map<string, NpcMover>();
  /** El mundo se congela con diálogo/journal/outcome abiertos (Fase 5/13). */
  private motionPaused = false;
  private readonly AMBIENT_SPEED = 22;        // px/sec — slow, clinical
  private readonly AMBIENT_RETARGET_MS = 2600;
  private guideEntry: SceneGuideEntry | null = null;
  private guideContainer?: Phaser.GameObjects.Container;
  private guideSprite?: Phaser.GameObjects.Sprite | Phaser.GameObjects.Arc;
  private guideBubble?: Phaser.GameObjects.Container;
  private guideTarget: { x: number; y: number } | null = null;
  private guideArrived = false;
  private readonly GUIDE_SPEED = 70;        // px/sec
  private readonly GUIDE_HINT_RANGE = 92;   // px
  private guideBubbleHeight = 0;
  private guideBubbleHalfW = 0;
  private world?: SimulationWorldState;
  private nearestKey: string | null = null;
  private selectedKey: string | null = null;
  private ready = false;
  private assetsLoaded = false;
  private firstSceneFadeDone = false;
  private stepTimer = 0;
  private readonly STEP_INTERVAL = 280; // ms — natural walking cadence (~215 steps/min)
  private interactionCooldown = 0;
  private readonly INTERACTION_COOLDOWN_MS = 260;

  constructor(private readonly callbacks: WorldCallbacks) {
    super('data-driven-world');
  }

  preload() {
    this.load.on('loaderror', (_file: Phaser.Loader.File) => {
      // Missing asset — fallback rendering used
    });

    // ── Plain images for Tiled tilemap layer rendering (all 3 Kenney packs) ──
    // tiny-dungeon: 12×11 = 132 tiles  (GID  1–132)
    // tiny-town:    12×11 = 132 tiles  (GID  133–264)
    // rpg-urban:    27×18 = 486 tiles  (GID  265–750)
    this.load.image('dungeon-img', '/assets/game/kenney/tiny-dungeon/Tilemap/tilemap_packed.png');
    this.load.image('town-img',   '/assets/game/kenney/tiny-town/Tilemap/tilemap_packed.png');
    this.load.image('rpg-img',    '/assets/game/kenney/rpg-urban-pack/Spritesheet/tilemap_packed.png');

    // Dungeon spritesheet (used for interactive object marker icons)
    this.load.spritesheet('dungeon-tiles',
      '/assets/game/kenney/tiny-dungeon/Tilemap/tilemap_packed.png',
      { frameWidth: 16, frameHeight: 16 });

    // Character spritesheet (player + NPCs)
    this.load.spritesheet('characters',
      '/assets/game/kenney/rpg-urban-pack/Spritesheet/tilemap_packed.png',
      { frameWidth: 16, frameHeight: 16 });

    // ── Avatar modular del estudiante (config del editor de personaje) ──────
    // Las capas se componen en create(); si faltan, el jugador cae al fallback.
    const avatarConfig = parseAvatar(
      typeof localStorage !== 'undefined' ? localStorage.getItem(AVATAR_STORAGE_KEY) : null,
    );
    this.avatarSpecs = avatarLayerSpecs(avatarConfig);
    for (const spec of this.avatarSpecs) {
      this.load.image(spec.textureKey, spec.assetPath);
    }

    // ── Capas modulares de los presets de NPC (mismas hojas que el avatar;
    //    claves idénticas se deduplican solas en el loader) ──────────────────
    for (const presetKey of Object.keys(NPC_PRESET_RENDER)) {
      const presetConfig = npcPresetConfig(presetKey);
      if (!presetConfig) continue;
      for (const spec of avatarLayerSpecs(presetConfig)) {
        this.load.image(spec.textureKey, spec.assetPath);
      }
    }
    for (const template of AUTHORING_NPC_TEMPLATES) {
      for (const spec of avatarLayerSpecs(template.avatar)) {
        this.load.image(spec.textureKey, spec.assetPath);
      }
    }
    for (const hair of AUTHORING_HAIR_VARIANTS) {
      for (const mouth of ['neutra', 'sonrisa', 'seria']) {
        for (const spec of avatarLayerSpecs({ ...defaultAvatar(), ...hairVariantPatch(hair.id), mouth })) {
          this.load.image(spec.textureKey, spec.assetPath);
        }
      }
    }
    for (const gender of GENDER_OPTIONS) {
      for (const clothingColor of CLOTHING_COLORS) {
        for (const spec of avatarLayerSpecs({ ...defaultAvatar(), gender: gender.id, clothingColor: clothingColor.id, hairStyle: 'ninguno' })) {
          this.load.image(spec.textureKey, spec.assetPath);
        }
      }
    }

    // Tiled JSON maps — all known scenario keys (missing ones fail silently)
    // Rename the Tiled object "name" field to match your backend object keys.
    const scenarioKeys = [
      'urgencias-crisis', 'ruta-proteccion', 'informe-integral',
      'valoracion-comisaria', 'proteccion-nna', 'cierre-seguimiento'
    ];
    for (const key of scenarioKeys) {
      this.load.tilemapTiledJSON(`map-${key}`, `/assets/game/maps/${key}.json`);
    }

    // Multi-room maps — comisaria-familia pilot + 5 remaining scenarios
    const roomMapKeys = [
      'comisaria-sala-espera',
      'comisaria-consultorio',
      'comisaria-supervisor',
      // single-room scenario halls
      'urgencias-sala',
      'ruta-sala',
      'informe-oficina',
      'nna-sala',
      'cierre-sala',
    ];
    for (const key of roomMapKeys) {
      this.load.tilemapTiledJSON(`map-${key}`, `/assets/game/maps/${key}.json`);
    }

    // ── Audio: Kenney Foley footsteps + Interface Sounds blip (CC0) ──────────
    // Missing files fail silently via the 'loaderror' handler above — no crash.
    this.load.audio('step0', '/assets/game/audio/footstep_concrete_000.ogg');
    this.load.audio('step1', '/assets/game/audio/footstep_concrete_001.ogg');
    this.load.audio('step2', '/assets/game/audio/footstep_concrete_002.ogg');
    this.load.audio('proximity-blip', '/assets/game/audio/blip_select.ogg');

    this.load.once('complete', () => { this.assetsLoaded = true; });
  }

  create() {
    this.ready = true;
    this.cursors = this.input.keyboard?.createCursorKeys();
    this.keys = this.input.keyboard?.addKeys('W,A,S,D,E,SPACE,ENTER') as Record<string, Phaser.Input.Keyboard.Key>;
    this.createAnimations();
    this.avatarReady = composeAvatarTexture(this, this.avatarSpecs);
    if (this.avatarReady) createAvatarAnimations(this);
    this.renderWorld();
  }

  override update(time: number, delta: number) {
    if (!this.player || !this.cursors || !this.keys || !this.world) return;
    const input: PlayerMotionInput = {
      left:  this.cursors.left.isDown  || this.keys['A'].isDown,
      right: this.cursors.right.isDown || this.keys['D'].isDown,
      up:    this.cursors.up.isDown    || this.keys['W'].isDown,
      down:  this.cursors.down.isDown  || this.keys['S'].isDown,
    };
    // Helper puro (player-motion.util): normaliza diagonal, limita delta y
    // resuelve dirección estable (sin parpadeo diagonal).
    const step = computePlayerStep(input, this.lastDirection, delta);

    if (step.moving) {
      const moved = this.movePlayer(step.dx, step.dy);
      this.lastDirection = step.direction;
      if (moved) {
        this.callbacks.onPosition(Math.round(this.player.x), Math.round(this.player.y));
        this.applyPlayerPose(step.direction, true);
        // ── Footstep audio: one random variant every STEP_INTERVAL ms ────────
        if (!this.callbacks.reduceMotion && !this.callbacks.sfxMuted) {
          this.stepTimer += delta;
          if (this.stepTimer >= this.STEP_INTERVAL) {
            this.stepTimer = 0;
            this.sound.play(`step${Phaser.Math.Between(0, 2)}`, { volume: 0.35 });
          }
        }
      } else {
        // Bloqueado del todo contra pared/mueble: sin avance real no debe
        // correr la animación de caminata (ni sonar pasos).
        this.applyPlayerPose(step.direction, false);
      }
    } else {
      this.stepTimer = this.STEP_INTERVAL; // prime timer: first step fires on frame 1 of movement, not after a full interval
      this.applyPlayerPose(this.lastDirection, false);
    }

    this.interactionCooldown = Math.max(0, this.interactionCooldown - delta);
    if (this.interactionCooldown <= 0 &&
        (Phaser.Input.Keyboard.JustDown(this.keys['E']) ||
         Phaser.Input.Keyboard.JustDown(this.keys['SPACE']) ||
         Phaser.Input.Keyboard.JustDown(this.keys['ENTER']))) {
      this.interactionCooldown = this.INTERACTION_COOLDOWN_MS;
      // Clinical marker takes priority over NPC when both are in range
      if (this.nearestKey) {
        this.interactNearest();
      } else {
        this.interactNearestNpc();
      }
    }
    this.updateNearestInteraction();
    this.updateNpcHints();
    this.updateAmbientMovers(time, delta);
    this.updateNpcMovers(time, delta);
    this.updateGuide(delta);
    // 2.5D: re-ordena por Y a los actores que se mueven
    if (this.player) this.ysort(this.player);
    if (this.guideContainer) this.ysort(this.guideContainer);
    for (const mover of this.ambientMovers.values()) {
      const marker = this.markers.get(mover.key);
      if (marker) this.ysort(marker);
    }
    for (const container of this.npcMarkers.values()) this.ysort(container);
    this.checkExitTriggers();
    this.checkDbDoorTriggers();
  }

  setWorld(world: SimulationWorldState) {
    // Cambio de mapa (decisión o puerta): la sala previa ya no aplica. Sin este
    // reset, keepPosition "conserva" la posición del render transicional y se
    // pierde la entrada (entryX/entryY) que enter_room persistió en world.player.
    if (this.world && this.world.map.key !== world.map.key) {
      this.currentRoomKey = '';
      // Recién entrado a una sala: desarmar hasta alejarse de la puerta de regreso
      // (la histéresis de checkDbDoorTriggers re-arma al superar doorRearmDist).
      this.dbDoorArmed = false;
    }
    this.world = world;
    this.nearestKey = null;
    this.callbacks.onProximity(null);
    if (this.ready) this.renderWorld();
  }

  setScenarioConfig(config: ScenarioConfig | null) {
    this.scenarioConfig = config ?? undefined;
    if (this.ready && this.world) this.renderWorld();
  }

  /** Pausa el movimiento del mundo (NPCs y ambient) sin congelar al jugador. */
  setMotionPaused(paused: boolean) { this.motionPaused = paused; }

  setReduceMotion(reduced: boolean) { this.callbacks.reduceMotion = reduced; }

  setSfxMuted(muted: boolean) {
    this.callbacks.sfxMuted = muted;
    this.sound.mute = muted;
  }

  /**
   * Called by Angular when the player steps through an exit.
   * Fades out, loads the new room, fades back in.
   */
  transitionToRoom(targetRoomKey: string, entryX: number, entryY: number) {
    if (!this.scenarioConfig) return;
    const roomConfig = this.scenarioConfig.rooms.find(r => r.key === targetRoomKey);
    if (!roomConfig) return;
    this.cameras.main.fadeOut(180, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.renderRoom(roomConfig, entryX, entryY);
      this.cameras.main.fadeIn(180, 0, 0, 0);
    });
  }

  setSelected(key: string | null) {
    this.selectedKey = key;
    this.refreshMarkerStates();
  }

  setGuide(entry: SceneGuideEntry | null) {
    this.guideEntry = entry;
    if (this.ready && this.world) this.buildGuide();
  }

  /** Builds (or rebuilds) the guide NPC for the current node + markers. */
  private buildGuide() {
    this.guideContainer?.destroy();
    this.guideContainer = undefined;
    this.guideBubble = undefined;
    this.guideSprite = undefined;
    this.guideTarget = null;
    this.guideArrived = false;

    const entry = this.guideEntry;
    if (!entry) return;

    // Resolve the target tool's on-screen position from its marker (already
    // merged with any Tiled position); fall back to the raw object data.
    const targetMarker = this.markers.get(entry.targetKey);
    const targetData = this.markerData.get(entry.targetKey);
    const targetPos = targetMarker
      ? { x: targetMarker.x, y: targetMarker.y }
      : targetData ? { x: targetData.x, y: targetData.y } : null;

    // En la sala autoría los actores Kenney van a 2.4 (spawnNpcs); el guía debe
    // verse del mismo mundo que los demás NPCs.
    const guideScale = this.authoredRoomActive ? 2.4 : 1.5;
    const guideFeetY = this.authoredRoomActive ? 20 : 13;
    const shadow = this.add.ellipse(0, guideFeetY, 15, 5, 0x000000, 0.2);
    let sprite: Phaser.GameObjects.Sprite | Phaser.GameObjects.Arc;
    if (this.assetsLoaded && this.textures.exists('characters')) {
      sprite = this.add.sprite(0, 0, 'characters', KenneyCharFrames.NPC_SUPERVISOR_IDLE).setScale(guideScale);
    } else {
      sprite = this.add.circle(0, -6, 9, 0x8a6cff, 1).setStrokeStyle(2, 0xffffff, 0.9);
    }
    const name = this.add.text(0, -26, entry.guideName, {
      fontFamily: 'Arial, sans-serif', fontSize: '9px', color: '#cdd9ff',
      backgroundColor: 'rgba(8,12,18,.72)', padding: { x: 3, y: 2 }, align: 'center',
    }).setOrigin(0.5, 1);

    this.guideContainer = this.add.container(entry.spawnX, entry.spawnY, [shadow, sprite, name]);
    this.setFeetOffset(this.guideContainer, guideFeetY);
    this.guideSprite = sprite;
    this.guideBubble = this.buildGuideBubble(entry.hint);

    this.guideTarget = targetPos
      ? freeTileNear(targetPos, (x, y) => this.wouldCollide(x, y), 26, 3)
      : null;

    if (this.callbacks.reduceMotion) {
      // No walking — place beside the target and show the hint statically.
      if (this.guideTarget) this.guideContainer.setPosition(this.guideTarget.x, this.guideTarget.y);
      this.guideArrived = true;
      this.showGuideBubble(true);
    }
  }

  private buildGuideBubble(hint: string): Phaser.GameObjects.Container {
    const text = this.add.text(0, 0, hint, {
      fontFamily: 'Arial, sans-serif', fontSize: '10px', color: '#eef3ff',
      align: 'center', wordWrap: { width: 168 }, padding: { x: 8, y: 6 },
    }).setOrigin(0.5, 1);
    const b = text.getBounds();
    const bg = this.add.rectangle(0, 0, b.width + 16, b.height + 12, 0x141b2e, 0.94)
      .setStrokeStyle(1, 0x6f7cff, 0.6).setOrigin(0.5, 1);
    this.guideBubbleHeight = b.height + 12;
    this.guideBubbleHalfW = (b.width + 16) / 2;
    return this.add.container(0, 0, [bg, text]).setDepth(DEPTH.UI).setVisible(false);
  }

  private showGuideBubble(show: boolean) {
    if (!this.guideBubble || !this.guideContainer) return;
    if (!show) { this.guideBubble.setVisible(false); return; }
    // The bubble is bottom-anchored at (x, y); keep the whole bubble inside the
    // camera's visible world rect so it never clips at an edge.
    const view = this.cameras.main.worldView;
    const margin = 6;
    const x = Phaser.Math.Clamp(
      this.guideContainer.x,
      view.left + this.guideBubbleHalfW + margin,
      view.right - this.guideBubbleHalfW - margin,
    );
    const bottomY = Phaser.Math.Clamp(
      this.guideContainer.y - 30,
      view.top + margin + this.guideBubbleHeight,
      view.bottom - margin,
    );
    this.guideBubble.setPosition(x, bottomY).setVisible(true);
  }

  private updateGuide(delta: number) {
    if (!this.guideContainer || !this.guideEntry) return;

    if (!this.callbacks.reduceMotion && !this.guideArrived && this.guideTarget) {
      const step = this.GUIDE_SPEED * (delta / 1000);
      const next = stepToward(this.guideContainer, this.guideTarget, step);
      const goingLeft = next.x < this.guideContainer.x;
      // Straight-line move with collision slide (consistent with player movement).
      if (!this.wouldCollide(next.x, next.y)) {
        this.guideContainer.setPosition(next.x, next.y);
      } else if (!this.wouldCollide(next.x, this.guideContainer.y)) {
        this.guideContainer.setPosition(next.x, this.guideContainer.y);
      } else if (!this.wouldCollide(this.guideContainer.x, next.y)) {
        this.guideContainer.setPosition(this.guideContainer.x, next.y);
      } else {
        this.guideArrived = true;   // fully blocked — stop at the nearest free spot
      }
      if (this.guideSprite instanceof Phaser.GameObjects.Sprite) {
        this.guideSprite.setFlipX(goingLeft);
      }
      if (reached(this.guideContainer, this.guideTarget, 3)) this.guideArrived = true;
    }

    if (this.player && !this.callbacks.reduceMotion) {
      const d = Phaser.Math.Distance.Between(
        this.player.x, this.player.y, this.guideContainer.x, this.guideContainer.y,
      );
      this.showGuideBubble(d <= this.GUIDE_HINT_RANGE);
    }
  }

  nudge(direction: 'up' | 'down' | 'left' | 'right') {
    if (!this.player) return;
    // Mismo contrato que WASD (player-motion.util): sub-pasos con colisión y
    // sliding, pose/dirección estables, sin caminar en el sitio contra paredes.
    let moved = false;
    for (let i = 0; i < NUDGE_SUBSTEPS; i++) {
      const step = computeNudgeStep(direction, this.lastDirection);
      if (!this.movePlayer(step.dx, step.dy)) break;
      moved = true;
    }
    this.lastDirection = direction;
    this.applyPlayerPose(direction, moved); // el update() del frame siguiente vuelve a idle
    if (moved) {
      this.callbacks.onPosition(Math.round(this.player.x), Math.round(this.player.y));
      this.ysort(this.player);
    }
    this.updateNearestInteraction();
  }

  interactNearest() {
    if (!this.nearestKey) return;
    const obj = this.markerData.get(this.nearestKey);
    if (obj) this.callbacks.onInteract(obj);
  }

  focus(key: string) {
    const m = this.markers.get(key);
    if (!m || this.callbacks.reduceMotion) return;
    this.tweens.add({ targets: m, scale: 1.16, duration: 140, yoyo: true, repeat: 2, ease: 'Sine.easeInOut' });
  }

  private createAnimations() {
    if (!this.assetsLoaded) return;
    const anims: Array<{ key: string; frames: readonly number[] }> = [
      { key: 'walk-down',  frames: KenneyCharFrames.PLAYER_WALK_DOWN },
      { key: 'walk-left',  frames: KenneyCharFrames.PLAYER_WALK_LEFT },
      { key: 'walk-right', frames: KenneyCharFrames.PLAYER_WALK_RIGHT },
      { key: 'walk-up',    frames: KenneyCharFrames.PLAYER_WALK_UP },
    ];
    for (const a of anims) {
      // Always destroy stale anim before recreating — the Phaser anim manager
      // is global and persists across renderWorld() / scene reloads.
      if (this.anims.exists(a.key)) this.anims.remove(a.key);
      this.anims.create({
        key: a.key,
        frames: this.anims.generateFrameNumbers('characters', { frames: [...a.frames] }),
        frameRate: 6, repeat: -1
      });
    }
  }

  /** Fase 4: draws the authored per-room background image (world.map.ambient.backgroundImage)
   *  over the procedural floor. No-op if none; safe on load failure (procedural floor remains). */
  private applyAuthoredBackground(mapW: number, mapH: number): void {
    const url = backgroundImage(this.world?.map.ambient);
    if (!url) return;
    const key = `authored-bg-${url}`;
    const place = () => {
      if (!this.textures.exists(key)) return;
      this.add.image(0, 0, key).setOrigin(0, 0).setDisplaySize(mapW, mapH).setDepth(1);
    };
    if (this.textures.exists(key)) { place(); return; }
    this.load.image(key, url);
    this.load.once(Phaser.Loader.Events.COMPLETE, place);
    this.load.start();
  }

  /**
   * Crea las capas de tiles de un Tilemap aplicando las bandas 2.5D
   * (floor, props_back, walls_back/walls, props_front, lighting, overlay).
   * La capa de paredes alimenta `this.wallsLayer` para colisión.
   * Retrocompatible: mapas con solo `Floor`/`Walls` se comportan igual que antes.
   */
  private buildTiledLayers(
    tilemap: Phaser.Tilemaps.Tilemap,
    tilesets: Phaser.Tilemaps.Tileset[],
  ): void {
    for (const layerData of tilemap.layers) {
      const depth = tiledLayerDepth(layerData.name);
      if (depth === null) continue;
      const layer = tilemap.createLayer(layerData.name, tilesets);
      if (!layer) continue;
      layer.setDepth(depth);
      // La capa de paredes (legacy `Walls` o `walls_back`/`collision`) es la sólida.
      const norm = layerData.name.trim().toLowerCase().replace(/^\d+[_-]?/, '');
      if (norm === 'walls' || norm === 'walls_back' || norm === 'collision') {
        this.wallsLayer = layer;
      }
    }
  }

  private renderWorld() {
    if (!this.world) return;

    // Multi-room mode: delegate to renderRoom() when a ScenarioConfig is loaded
    if (this.scenarioConfig) {
      const room = this.roomForCurrentWorld()
        ?? this.scenarioConfig.rooms.find(r => r.key === this.scenarioConfig!.startRoomKey)
        ?? this.scenarioConfig.rooms[0];
      this.renderRoom(room, room.spawnX, room.spawnY);
      return;
    }

    this.cameras.main.stopFollow();   // clear stale follow target before destroying children
    this.children.removeAll(true);
    this.markers.clear();
    this.markerData.clear();
    this.markerLabels.clear();
    this.doorHints.clear();
    this.npcMarkers.clear();
    this.ambientMovers.clear();
    this.npcMovers.clear();
    this.tiledExits.clear();
    this.wallsLayer = undefined;
    this.authoredRoomActive = false;
    this.currentRoomKey = '';

    const mapKey  = this.world.map.key;
    const { width: mapW, height: mapH } = this.world.map;
    this.cameras.main.setBackgroundColor('#0e141a');

    // ── Fase C: registry de renderers también en modo sala única ───────────
    // Si hay renderer para este mapa, él pinta todas las capas visuales y aquí
    // solo queda el gameplay (markers remapeados, jugador, cámara, guía).
    const sceneRenderer = resolveSceneRenderer(mapKey);
    if (sceneRenderer) {
      this.authoredRoomActive = true;
      const metadata = sceneRenderer.render(this, {
        width: mapW,
        height: mapH,
        reduceMotion: this.callbacks.reduceMotion,
        ambientTone: this.ambientTone(),
      });
      this.renderableWorldObjects()
        .map(obj => {
          const authored = authoredMarkerPosition(obj.key);
          return authored ? { ...obj, x: authored.x, y: authored.y } : obj;
        })
        .forEach(obj => this.createMarker(obj));
      // Posición persistida solo si sigue siendo jugable en la sala autoría.
      const persisted = { x: this.world.player.x, y: this.world.player.y };
      const spawn = this.wouldCollide(persisted.x, persisted.y) ? AUTHORED_PLAYER_SPAWN : persisted;
      this.createPlayer(spawn.x, spawn.y);
      const cam = this.cameras.main;
      cam.setZoom(1);
      cam.setBounds(0, 0, metadata.bounds.width, metadata.bounds.height);
      cam.centerOn(metadata.bounds.width / 2, metadata.bounds.height / 2);
      this.refreshMarkerStates();
      this.updateNearestInteraction(true);
      this.buildGuide();
      this.playIntroFade();
      return;
    }

    // ── Layer 0-1: procedural dark floor + grid (always — permanent base) ──
    // Tiled floor tiles sit on top; GID 0 cells (empty) let this base show through.
    this.add.rectangle(mapW/2, mapH/2, mapW-40, mapH-42, 0x131c28, 1).setDepth(0);
    const g = this.add.graphics().setDepth(1);
    g.lineStyle(1, 0x1c2d3e, 0.65);
    for (let x = 56; x <= mapW-56; x += 32) g.lineBetween(x, 44, x, mapH-44);
    for (let y = 56; y <= mapH-56; y += 32) g.lineBetween(44, y, mapW-44, y);

    // ── Fase 4: authored per-room background image (over the procedural floor) ──
    this.applyAuthoredBackground(mapW, mapH);

    // ── Layer 2-3: Tiled tile layers (Floor + Walls) if map available ─────
    // Floor layer starts empty (all GID 0 = transparent).
    // Open any map in Tiled editor, paint tiles on the Floor layer, save → renders here.
    let tiledObjects: Phaser.Types.Tilemaps.TiledObject[] = [];
    let hasTiledMap = false;

    if (this.assetsLoaded) {
      try {
        const tilemap    = this.make.tilemap({ key: `map-${mapKey}` });
        // Register all 3 tilesets — only those present in the map JSON are used
        const ts1 = tilemap.addTilesetImage('tiny-dungeon', 'dungeon-img');
        const ts2 = tilemap.addTilesetImage('tiny-town',    'town-img');
        const ts3 = tilemap.addTilesetImage('rpg-urban',    'rpg-img');
        const tilesets = [ts1, ts2, ts3].filter((t): t is Phaser.Tilemaps.Tileset => t !== null);
        if (tilesets.length > 0) {
          this.buildTiledLayers(tilemap, tilesets);
        }
        tiledObjects = tilemap.getObjectLayer('Objects')?.objects ?? [];
        hasTiledMap  = true;
      } catch {
        hasTiledMap = false;
      }
    }

    // Collision-zone panels only when no Tiled layout is available
    if (!hasTiledMap) {
      this.world.collisions.forEach(zone => this.renderCollisionZone(zone));
    }
    // ─────────────────────────────────────────────────────────────────────

    // Room border (depth 5) + title (depth 6) — always above tile layers (depth 2-3)
    this.add.rectangle(mapW/2, mapH/2, mapW-36, mapH-38)
      .setStrokeStyle(3, 0x4f7cac, .3).setFillStyle(0x000000, 0).setDepth(5);
    this.add.text(16, 12, this.world.map.title, {
      fontFamily: 'Arial, sans-serif', fontSize: '16px', color: '#9dc0e8', fontStyle: 'bold'
    }).setDepth(6).setScrollFactor(0);   // pin to screen — stays top-left as camera scrolls
    if (isHospitalMap(mapKey)) {
      this.add.text(56, 66, 'Hospital — Urgencia vital y crisis', {
        fontFamily: 'Arial, sans-serif', fontSize: '11px', color: 'rgba(157,192,232,.72)',
      }).setDepth(6);
    }
    if (isComisariaMap(mapKey)) {
      this.add.text(56, 66, 'Comisaría — Restablecimiento de derechos', {
        fontFamily: 'Arial, sans-serif', fontSize: '11px', color: 'rgba(157,192,232,.72)',
      }).setDepth(6);
    }

    if (isHospitalMap(mapKey)) {
      this.renderHospitalEnvironment();
    }
    if (isComisariaMap(mapKey)) {
      this.renderComisariaEnvironment();
    }

    // Merge Tiled object positions with backend objects.
    // Tiled object "name" must match the backend MapObjectState "key".
    let mergedObjects = this.renderableWorldObjects().map(obj => {
      const t = tiledObjects.find(o => o.name === obj.key);
      return (t?.x != null && t?.y != null) ? { ...obj, x: t.x, y: t.y } : obj;
    });
    if (isHospitalMap(mapKey) || isComisariaMap(mapKey)) {
      mergedObjects = applySceneDisplayLabels(mergedObjects, mapKey);
    }

    mergedObjects.forEach(obj => this.createMarker(obj));
    this.spawnAmbientDust(mapW, mapH);
    this.createPlayer(this.world.player.x, this.world.player.y);

    // ── Camera: 2× zoom, smooth follow, clamp to map bounds ────────────────
    const cam = this.cameras.main;
    const az = Number((this.world.map.ambient as { cameraZoom?: unknown })?.cameraZoom);
    cam.setZoom(Number.isFinite(az) && az > 0 ? az : 2);
    cam.setBounds(0, 0, mapW, mapH);
    cam.startFollow(this.player!, true, 0.12, 0.12);
    // startFollow args: target, roundPixels=true, lerpX=0.12, lerpY=0.12
    // roundPixels prevents sub-pixel shimmer on pixel art.
    // lerp 0.12 = Undertale-style "slightly behind" smooth follow.

    this.refreshMarkerStates();
    this.updateNearestInteraction(true); // suppress blip on initial spawn
    this.buildGuide();
    this.applyLightingOverlay();
    this.playIntroFade();
  }

  /**
   * Renders a single room from the ScenarioConfig.
   * Called by renderWorld() in multi-room mode and by transitionToRoom().
   */
  private renderRoom(roomConfig: RoomConfig, spawnX: number, spawnY: number) {
    // Si el mundo se refresca sin cambiar de sala (p. ej. al persistir la
    // posición del jugador), conserva la posición actual: el re-render no debe
    // teletransportar al jugador de vuelta al spawn.
    const keepPosition = this.currentRoomKey === roomConfig.key && this.player
      ? { x: this.player.x, y: this.player.y }
      : null;

    this.cameras.main.stopFollow();
    this.children.removeAll(true);
    this.markers.clear();
    this.markerData.clear();
    this.markerLabels.clear();
    this.doorHints.clear();
    this.npcMarkers.clear();
    this.ambientMovers.clear();
    this.npcMovers.clear();
    this.tiledExits.clear();
    this.wallsLayer = undefined;
    this.interactionCooldown = 0;
    this.cameras.main.setBackgroundColor('#0e141a');
    this.currentRoomKey = roomConfig.key;

    let actualMapW = AUTHORED_ROOM_WIDTH, actualMapH = AUTHORED_ROOM_HEIGHT;
    let tiledObjects: Phaser.Types.Tilemaps.TiledObject[] = [];
    // Fase C: el registry decide qué renderer pinta la sala; sin renderer se
    // usa el flujo Tiled/procedural existente.
    const sceneRenderer = resolveSceneRenderer(roomConfig.tiledMapKey);
    const authoredClinicalRoom = sceneRenderer !== null;
    this.authoredRoomActive = authoredClinicalRoom;

    if (!authoredClinicalRoom) {
      // Title pinned to screen (la sala autoría no lleva título pegado al mapa;
      // la ubicación ya vive en la top bar del HUD)
      this.add.text(16, 12, roomConfig.displayName, {
        fontFamily: 'Arial, sans-serif', fontSize: '16px', color: '#9dc0e8', fontStyle: 'bold'
      }).setDepth(6).setScrollFactor(0);
    }

    if (this.assetsLoaded && !authoredClinicalRoom) {
      try {
        const tilemap = this.make.tilemap({ key: roomConfig.tiledMapKey });
        const ts1 = tilemap.addTilesetImage('tiny-dungeon', 'dungeon-img');
        const ts2 = tilemap.addTilesetImage('tiny-town',    'town-img');
        const ts3 = tilemap.addTilesetImage('rpg-urban',    'rpg-img');
        const tilesets = [ts1, ts2, ts3].filter((t): t is Phaser.Tilemaps.Tileset => t !== null);

        if (tilesets.length > 0) {
          this.buildTiledLayers(tilemap, tilesets);
        }

        actualMapW = tilemap.widthInPixels;
        actualMapH = tilemap.heightInPixels;

        // Register EXIT objects for transition detection
        tiledObjects = tilemap.getObjectLayer('Objects')?.objects ?? [];
        for (const exit of roomConfig.exits) {
          const obj = tiledObjects.find(o => o.name === exit.objectName);
          if (obj?.x != null && obj?.y != null) {
            this.tiledExits.set(exit.objectName, {
              x: obj.x, y: obj.y,
              w: obj.width ?? 32, h: obj.height ?? 48
            });
          }
        }
      } catch {
        // Map not found — render empty room with fallback dimensions
      }
    }

    const cam = this.cameras.main;
    cam.setZoom(authoredClinicalRoom ? 1 : 2);
    cam.setBounds(0, 0, actualMapW, actualMapH);

    let sceneMetadata: SceneRenderMetadata | null = null;
    if (sceneRenderer) {
      // Sala premium: el renderer pinta TODAS las capas visuales (background,
      // floor, props, lighting). Sin grilla genérica ni borde de editor.
      sceneMetadata = sceneRenderer.render(this, {
        width: actualMapW,
        height: actualMapH,
        reduceMotion: this.callbacks.reduceMotion,
        ambientTone: this.ambientTone(),
      });
    } else {
      // ── Dark procedural floor + subtle grid (mirrors renderWorld style) ─────
      // Floor tile layer uses GID 0 (transparent) everywhere, so this dark rect IS the floor.
      this.add.rectangle(actualMapW / 2, actualMapH / 2, actualMapW - 40, actualMapH - 42, 0x131c28, 1).setDepth(0);
      const gfx = this.add.graphics().setDepth(1);
      gfx.lineStyle(1, 0x1c2d3e, 0.55);
      for (let gx = 16; gx < actualMapW; gx += 32) gfx.lineBetween(gx, 0, gx, actualMapH);
      for (let gy = 16; gy < actualMapH; gy += 32) gfx.lineBetween(0, gy, actualMapW, gy);

      // Room border
      this.add.rectangle(actualMapW / 2, actualMapH / 2, actualMapW - 36, actualMapH - 38)
        .setStrokeStyle(3, 0x4f7cac, .3).setFillStyle(0x000000, 0).setDepth(5);
    }

    // Backend interactive objects (markers) — merge Tiled Objects-layer positions
    // (Tiled object "name" must match the backend MapObjectState "key").
    // En la sala autoría las posiciones del seed pertenecen al tilemap viejo,
    // así que se remapean a los puntos jugables de la sala.
    if (this.world) {
      const mergedObjects = this.renderableWorldObjects().map(obj => {
        if (authoredClinicalRoom) {
          const authored = authoredMarkerPosition(obj.key);
          if (authored) return { ...obj, x: authored.x, y: authored.y };
        }
        const t = tiledObjects.find(o => o.name === obj.key);
        return (t?.x != null && t?.y != null) ? { ...obj, x: t.x, y: t.y } : obj;
      });
      mergedObjects.forEach(obj => this.createMarker(obj));
    }

    // Los JSON de escenario traen coords de la sala autoría; spawnNpcs tiene la
    // red de seguridad (freeTileNear) si alguna cayera en colisión.
    this.spawnNpcs(roomConfig.npcs);
    // Fase 10: enter_room persiste entryX/entryY en world.player — la posición
    // del backend manda si es jugable; si no (coords del seed viejo), spawn autoría.
    const persisted = this.world ? { x: this.world.player.x, y: this.world.player.y } : null;
    const spawn = keepPosition ?? (authoredClinicalRoom
      ? (persisted && !this.wouldCollide(persisted.x, persisted.y)
          ? persisted
          : { x: AUTHORED_PLAYER_SPAWN.x, y: AUTHORED_PLAYER_SPAWN.y })
      : { x: spawnX, y: spawnY });
    this.createPlayer(spawn.x, spawn.y);
    if (authoredClinicalRoom) {
      cam.centerOn(actualMapW / 2, actualMapH / 2);
    } else {
      cam.startFollow(this.player!, true, 0.12, 0.12);
    }
    this.refreshMarkerStates();
    this.updateNearestInteraction(true);
    this.buildGuide();
    // Evitar doble lighting: si el renderer ya pintó su capa de luz, la viñeta
    // genérica solo ensuciaría/oscurecería la escena premium.
    if (!sceneMetadata?.paintedLayers.includes('lighting')) this.applyLightingOverlay();
    this.playIntroFade();
  }

  /** Fade-in breve al entrar a la simulación (solo la primera escena). */
  private playIntroFade(): void {
    if (this.firstSceneFadeDone) return;
    this.firstSceneFadeDone = true;
    if (!this.callbacks.reduceMotion) this.cameras.main.fadeIn(300, 7, 10, 20);
  }

  private checkExitTriggers() {
    if (!this.player || !this.scenarioConfig) return;
    const roomConfig = this.scenarioConfig.rooms.find(r => r.key === this.currentRoomKey);
    if (!roomConfig) return;
    const px = this.player.x, py = this.player.y;
    for (const exit of roomConfig.exits) {
      const zone = this.tiledExits.get(exit.objectName);
      if (!zone) continue;
      if (px >= zone.x && px <= zone.x + zone.w && py >= zone.y && py <= zone.y + zone.h) {
        this.tiledExits.delete(exit.objectName); // one-shot until room reloads
        this.callbacks.onRoomExit(exit.targetRoomKey, exit.entryX, exit.entryY);
        return;
      }
    }
  }

  /** Fase 5: DB-driven spatial doors — when the player reaches an EXIT object whose
   *  metadata carries a targetNodeKey, fire onEnterRoom once (re-armed when away). */
  private checkDbDoorTriggers() {
    if (!this.player || !this.world || this.scenarioConfig) return;
    const px = this.player.x, py = this.player.y;
    // Resolver la puerta MÁS CERCANA (no la primera del arreglo): si dos puertas
    // caen en rango, se cruza la que el jugador realmente tiene encima.
    let nearest: { target: string; entryX: number; entryY: number } | null = null;
    let nearestDist = Infinity;
    for (const obj of this.world.objects) {
      if ((obj.type || '').toUpperCase() !== 'EXIT') continue;
      const meta = obj.metadata as { targetNodeKey?: string; entryX?: number; entryY?: number } | undefined;
      const target = meta?.targetNodeKey;
      if (!target) continue;
      const d = Phaser.Math.Distance.Between(px, py, obj.x, obj.y);
      if (d < nearestDist) {
        nearestDist = d;
        nearest = { target, entryX: Number(meta?.entryX ?? obj.x), entryY: Number(meta?.entryY ?? obj.y) };
      }
    }
    // Dispara solo si está armado y el jugador está sobre la puerta.
    if (nearest && this.dbDoorArmed && nearestDist <= this.doorTriggerDist) {
      this.dbDoorArmed = false;
      this.callbacks.onEnterRoom(nearest.target, nearest.entryX, nearest.entryY);
      return;
    }
    // Re-arma SOLO cuando se aleja claramente de toda puerta (histéresis): así, al
    // entrar a una sala junto a la puerta de regreso, no se dispara de inmediato.
    if (nearestDist >= this.doorRearmDist) this.dbDoorArmed = true;
  }

  /** Compone (una vez) textura+anims del preset modular. false → fallback Kenney. */
  private ensureNpcComposite(presetKey: NpcAvatarPresetKey): boolean {
    if (this.npcCompositesReady.has(presetKey)) return true;
    const config = npcPresetConfig(presetKey);
    if (!config) return false;
    const ok = composeAvatarTextureAs(this, npcAvatarTextureKey(presetKey), avatarLayerSpecs(config));
    if (!ok) return false;
    createAvatarAnimationsFor(this, npcAvatarTextureKey(presetKey), npcAvatarAnimKeys(presetKey));
    this.npcCompositesReady.add(presetKey);
    return true;
  }

  private roomForCurrentWorld(): RoomConfig | null {
    if (!this.world || !this.scenarioConfig) return null;
    const mapKey = this.world.map.key;
    const baseKey = mapKey.replace(/-(accion|cierre|marco)$/i, '');
    const candidates = new Set([mapKey, `map-${mapKey}`, baseKey, `map-${baseKey}`]);
    const direct = this.scenarioConfig.rooms.find(room =>
      candidates.has(room.key) || candidates.has(room.tiledMapKey)
    );
    if (direct) return direct;
    return this.scenarioConfig.rooms.find(room => room.key === this.currentRoomKey) ?? null;
  }

  private renderableWorldObjects(): MapObjectState[] {
    const inventory = new Set(this.world?.inventory ?? []);
    return (this.world?.objects ?? []).filter(object =>
      !(object.type === 'TOOL' && object.toolCode && inventory.has(object.toolCode))
    );
  }

  private objectAvatarTextureKey(objectKey: string): string {
    return `object-avatar-${objectKey}`;
  }

  private objectAvatarConfig(object: MapObjectState): AvatarConfig | null {
    const meta = object.metadata as { avatar?: unknown } | undefined;
    if (!meta?.avatar) return null;
    return coerceAvatar(meta.avatar);
  }

  private ensureObjectAvatarComposite(object: MapObjectState): boolean {
    const key = this.objectAvatarTextureKey(object.key);
    if (this.npcCompositesReady.has(key)) return true;
    const config = this.objectAvatarConfig(object);
    if (!config) return false;
    const ok = composeAvatarTextureAs(this, key, avatarLayerSpecs(config));
    if (!ok) return false;
    this.npcCompositesReady.add(key);
    return true;
  }

  /** Registra el mover del NPC (si trae motion) con su posición real de spawn. */
  private registerNpcMover(npc: NpcConfig, pos: { x: number; y: number }, presetKey: string | null): void {
    if (!npc.motion) return;
    this.npcMovers.set(npc.key, {
      key: npc.key,
      cfg: npc.motion,
      zone: npcZone(npc.motion, pos),
      target: null,
      anchorIdx: 0,
      pauseUntil: this.time.now + (npc.motion.startDelayMs ?? 600),
      lastPose: { direction: (npc.facing ?? 'down') as PlayerDirection, walking: false },
      presetKey,
    });
  }

  /** Pose del NPC (dirección + walking) solo si cambió — como el jugador. */
  private applyNpcPose(mover: NpcMover, container: Phaser.GameObjects.Container, direction: PlayerDirection, walking: boolean): void {
    if (mover.lastPose.direction === direction && mover.lastPose.walking === walking) return;
    mover.lastPose = { direction, walking };
    const sprite = (container as unknown as Record<string, unknown>)['__npcSprite'] as Phaser.GameObjects.Sprite | undefined;
    if (!sprite) return;
    if (!mover.presetKey) { sprite.setFlipX(direction === 'left'); return; }  // legacy: solo flip
    if (walking && !this.callbacks.reduceMotion) {
      sprite.setFlipX(modularAvatarFlipX(direction));
      const keys = npcAvatarAnimKeys(mover.presetKey);
      sprite.play(direction === 'down' ? keys.down : direction === 'up' ? keys.up : keys.side, true);
      return;
    }
    this.applyNpcFacing(container, direction);
  }

  private updateNpcMovers(time: number, delta: number) {
    if (this.motionPaused || this.npcMovers.size === 0) return;
    for (const mover of this.npcMovers.values()) {
      const container = this.npcMarkers.get(mover.key);
      if (!container) continue;
      const behavior = effectiveNpcBehavior(mover.cfg.behavior, this.callbacks.reduceMotion);
      const lastDir = mover.lastPose.direction ?? 'down';

      if (behavior === 'idle') { this.applyNpcPose(mover, container, lastDir, false); continue; }

      if (behavior === 'attentive') {
        // Gira hacia el jugador cuando está cerca; nunca se traslada.
        if (this.player) {
          const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, container.x, container.y);
          if (d <= 110) {
            const dir = resolveDirection(this.player.x - container.x, this.player.y - container.y, lastDir);
            this.applyNpcPose(mover, container, dir, false);
          }
        }
        continue;
      }

      if (time < mover.pauseUntil) { this.applyNpcPose(mover, container, lastDir, false); continue; }

      if (!mover.target) {
        mover.target = this.nextNpcTarget(mover, container);
        if (!mover.target) { mover.pauseUntil = time + 600; continue; }
      }

      const next = stepToward(container, mover.target, npcSpeed(mover.cfg) * (delta / 1000));
      const dir = resolveDirection(next.x - container.x, next.y - container.y, lastDir);
      if (!this.wouldCollide(next.x, next.y)) {
        container.setPosition(next.x, next.y);
        this.applyNpcPose(mover, container, dir, true);
      } else if (!this.wouldCollide(next.x, container.y)) {
        container.setPosition(next.x, container.y);
        this.applyNpcPose(mover, container, dir, true);
      } else if (!this.wouldCollide(container.x, next.y)) {
        container.setPosition(container.x, next.y);
        this.applyNpcPose(mover, container, dir, true);
      } else {
        // Bloqueado del todo: nuevo objetivo después, nunca caminar en el sitio.
        mover.target = null;
        mover.pauseUntil = time + 900;
        this.applyNpcPose(mover, container, dir, false);
        continue;
      }

      if (reached(container, mover.target, 2)) {
        const anchors = mover.cfg.anchors ?? [];
        const anchor = anchors.length ? anchors[mover.anchorIdx] : null;
        this.applyNpcPose(mover, container, (anchor?.face as PlayerDirection | undefined) ?? dir, false);
        mover.pauseUntil = time + npcPause(mover.cfg, anchor);
        if ((mover.cfg.behavior === 'pace' || mover.cfg.behavior === 'patrol') && anchors.length) {
          mover.anchorIdx = nextAnchorIndex(mover.anchorIdx, anchors.length);
        }
        mover.target = null;
      }
    }
  }

  private nextNpcTarget(mover: NpcMover, container: Phaser.GameObjects.Container): { x: number; y: number } | null {
    const behavior = mover.cfg.behavior;
    if (behavior === 'subtle-wander') {
      const candidate = pickZoneTarget(mover.zone, Math.random);
      return this.wouldCollide(candidate.x, candidate.y) ? null : candidate;
    }
    if ((behavior === 'pace' || behavior === 'patrol') && mover.cfg.anchors?.length) {
      const anchor = mover.cfg.anchors[mover.anchorIdx];
      return { x: anchor.x, y: anchor.y };
    }
    if (behavior === 'avoidant') {
      if (!this.player) return null;
      const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, container.x, container.y);
      if (d > AVOIDANT_TRIGGER_RANGE) return null;
      const candidate = avoidantTarget(mover.zone, container, this.player, Math.random);
      return this.wouldCollide(candidate.x, candidate.y) ? null : candidate;
    }
    return null;
  }

  /** Frame de reposo del NPC modular según dirección. */
  private applyNpcFacing(container: Phaser.GameObjects.Container, direction: 'down' | 'up' | 'left' | 'right'): void {
    const sprite = (container as unknown as Record<string, unknown>)['__npcSprite'] as Phaser.GameObjects.Sprite | undefined;
    if (!sprite) return;
    sprite.stop();
    const frame = direction === 'up' ? AVATAR_IDLE_FRAMES.up
      : direction === 'down' ? AVATAR_IDLE_FRAMES.down
      : AVATAR_IDLE_FRAMES.side;
    sprite.setFrame(frame);
    sprite.setFlipX(modularAvatarFlipX(direction));
  }

  private spawnNpcs(npcs: NpcConfig[]) {
    // En la sala autoría los muebles son grandes: los NPCs Kenney legacy suben
    // de escala para mantener proporción con el avatar modular (~38×58 px).
    const npcScale = this.authoredRoomActive ? 2.4 : 1.5;
    // Sombra de contacto en dos pasos, proporcional a la escala del sprite:
    // asienta al NPC en el piso (no debe verse como sticker pegado).
    const shY = this.authoredRoomActive ? 19 : 12;
    const shW = this.authoredRoomActive ? 32 : 20;
    for (const npc of npcs) {
      // Red de seguridad: si la coord del JSON cae en colisión, buscar piso libre.
      const pos = this.wouldCollide(npc.x, npc.y)
        ? freeTileNear({ x: npc.x, y: npc.y }, (x, y) => this.wouldCollide(x, y), 18, 3)
        : { x: npc.x, y: npc.y };

      // ── Rama modular: mismo universo visual que el avatar del jugador ──────
      const presetKey = npc.avatarPresetKey;
      if (presetKey && this.assetsLoaded && this.ensureNpcComposite(presetKey)) {
        const render = NPC_PRESET_RENDER[presetKey];
        const scale = npc.scale ?? render.scale;
        // Contrato de pies: (x,y) del contenedor = pies; el frame trae los pies
        // en y≈90 ⇒ centro del sprite a -42*scale (mismo cálculo que el jugador).
        const spriteOffsetY = -Math.round(42 * scale);
        const shadowSoft = this.add.ellipse(0, 0, 42 * scale, 13 * scale, 0x000000, .15);
        const shadow = this.add.ellipse(0, 0, 28 * scale, 9 * scale, 0x000000, .27);
        const npcSprite = this.add.sprite(0, spriteOffsetY, npcAvatarTextureKey(presetKey), AVATAR_IDLE_FRAMES.down)
          .setScale(scale);
        const baseTint = render.tint ?? null;
        if (baseTint != null) npcSprite.setTint(baseTint);

        const headY = spriteOffsetY - Math.round((AVATAR_FRAME_HEIGHT / 2) * scale);
        const label = this.add.text(0, headY - 4, npc.displayName, {
          fontFamily: 'Arial, sans-serif', fontSize: '9px', color: '#e8f0f4',
          backgroundColor: 'rgba(8,12,18,.72)', padding: { x: 3, y: 2 }, align: 'center',
        }).setOrigin(0.5, 1).setAlpha(0);
        const hint = this.add.text(0, headY - 18, '▲ E', {
          fontFamily: 'Arial, sans-serif', fontSize: '8px', color: '#4fa3a5', align: 'center',
        }).setOrigin(0.5, 1).setAlpha(0);

        const container = this.add.container(pos.x, pos.y, [shadowSoft, shadow, npcSprite, label, hint]);
        this.setFeetOffset(container, 0);   // pies = origen del contenedor
        this.npcMarkers.set(npc.key, container);
        const bag = container as unknown as Record<string, unknown>;
        bag['__npcConfig'] = npc;
        bag['__hintSprite'] = hint;
        bag['__labelSprite'] = label;
        bag['__npcSprite'] = npcSprite;
        bag['__npcPreset'] = presetKey;
        bag['__npcBaseTint'] = baseTint;
        this.applyNpcFacing(container, npc.facing ?? 'down');
        this.registerNpcMover(npc, pos, presetKey);
        continue;
      }

      // ── Fallback legacy Kenney (sin preset o assets ausentes) ──────────────
      const shadowSoft = this.add.ellipse(0, shY, shW, shW * 0.3, 0x000000, .14);
      const shadow = this.add.ellipse(0, shY, shW * 0.66, shW * 0.2, 0x000000, .24);

      let sprite: Phaser.GameObjects.GameObject;
      if (this.assetsLoaded && this.textures.exists('characters')) {
        const npcSprite = this.add.sprite(0, 0, 'characters', npc.frameIndex).setScale(npcScale);
        // Lavado lavanda muy sutil: unifica los Kenney con la paleta de la sala
        // premium. Los paciente-* quedan libres para el tint de estado clínico.
        if (this.authoredRoomActive && !npc.key.startsWith('paciente-')) {
          npcSprite.setTint(0xe9e2f6);
        }
        sprite = npcSprite;
      } else {
        sprite = this.add.circle(0, -8, 10, 0x4fa3a5, 1);
      }

      // Nombre oculto hasta estar en rango: la escena no debe leerse como un
      // diagrama etiquetado (updateNpcHints lo muestra junto al hint E).
      const label = this.add.text(0, -28, npc.displayName, {
        fontFamily: 'Arial, sans-serif', fontSize: '9px', color: '#e8f0f4',
        backgroundColor: 'rgba(8,12,18,.72)', padding: { x: 3, y: 2 }, align: 'center',
      }).setOrigin(0.5, 1).setAlpha(0);

      const hint = this.add.text(0, -42, '▲ E', {
        fontFamily: 'Arial, sans-serif', fontSize: '8px', color: '#4fa3a5', align: 'center',
      }).setOrigin(0.5, 1).setAlpha(0);

      const container = this.add.container(pos.x, pos.y, [shadowSoft, shadow, sprite, label, hint]);
      this.setFeetOffset(container, shY);   // la sombra marca los pies del NPC
      this.npcMarkers.set(npc.key, container);
      const bag = container as unknown as Record<string, unknown>;
      bag['__npcConfig'] = npc;
      bag['__hintSprite'] = hint;
      bag['__labelSprite'] = label;
      if (sprite instanceof Phaser.GameObjects.Sprite) bag['__npcSprite'] = sprite;
      this.registerNpcMover(npc, pos, null);
    }
  }

  private readonly NPC_INTERACT_RANGE = 60;

  private updateNpcHints() {
    if (!this.player) return;
    for (const container of this.npcMarkers.values()) {
      const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, container.x, container.y);
      const near = dist <= this.NPC_INTERACT_RANGE;
      const hint = (container as unknown as Record<string, unknown>)['__hintSprite'] as Phaser.GameObjects.Text;
      const label = (container as unknown as Record<string, unknown>)['__labelSprite'] as Phaser.GameObjects.Text;
      if (hint) hint.setAlpha(near ? 1 : 0);
      if (label) label.setAlpha(near ? 1 : 0);
    }
  }

  /** true si algún NPC está a distancia de diálogo del jugador. */
  private isAnyNpcInRange(): boolean {
    if (!this.player) return false;
    for (const container of this.npcMarkers.values()) {
      const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, container.x, container.y);
      if (d <= this.NPC_INTERACT_RANGE) return true;
    }
    return false;
  }

  private interactNearestNpc() {
    if (!this.player) return;
    let closestDist = this.NPC_INTERACT_RANGE;
    let closestNpc: NpcConfig | null = null;
    for (const container of this.npcMarkers.values()) {
      const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, container.x, container.y);
      if (dist < closestDist) {
        closestDist = dist;
        closestNpc = (container as unknown as Record<string, unknown>)['__npcConfig'] as NpcConfig;
      }
    }
    if (closestNpc) this.callbacks.onNpcInteract(closestNpc);
  }

  /**
   * Called by Angular after a decision affects patient state.
   * Updates the patient NPC's tint and shake based on crisis/trust levels.
   */
  updatePatientVisualState(state: import('../../core/models/simulation.model').PatientState) {
    const targets: Array<{ sprite: Phaser.GameObjects.Sprite; container: Phaser.GameObjects.Container; baseTint: number | null }> = [];
    for (const [key, container] of this.npcMarkers) {
      if (!key.startsWith('paciente-')) continue;
      const bag = container as unknown as Record<string, unknown>;
      const sprite = (bag['__npcSprite'] as Phaser.GameObjects.Sprite | undefined)
        ?? container.list.find((c): c is Phaser.GameObjects.Sprite => c instanceof Phaser.GameObjects.Sprite);
      if (sprite) targets.push({ sprite, container, baseTint: (bag['__npcBaseTint'] as number | null) ?? null });
    }
    // La paciente real del caso es un marker PERSON del backend (escucha-segura).
    for (const [key, preset] of Object.entries(MAP_OBJECT_PRESETS)) {
      if (preset !== 'paciente-vbg') continue;
      const marker = this.markers.get(key);
      const sprite = marker?.list.find((c): c is Phaser.GameObjects.Sprite => c instanceof Phaser.GameObjects.Sprite);
      if (marker && sprite) {
        const baseTint = ((sprite as unknown as Record<string, unknown>)['__personBaseTint'] as number | null) ?? null;
        targets.push({ sprite, container: marker, baseTint });
      }
    }
    for (const { sprite, container, baseTint } of targets) {
      if (state.crisisLevel >= 70) {
        sprite.setTint(0xff8888);
        if (!this.callbacks.reduceMotion) {
          this.tweens.add({
            targets: container, x: container.x + 2, duration: 60,
            yoyo: true, repeat: 3, ease: 'Sine.easeInOut'
          });
        }
      } else if (state.trustLevel >= 60 && state.emotionalState >= 60) {
        sprite.setTint(0xaaffcc);
      } else if (state.emotionalState <= 25) {
        sprite.setTint(0x8888ff);
      } else if (baseTint != null) {
        sprite.setTint(baseTint);
      } else {
        sprite.clearTint();
      }
    }
  }

  private renderHospitalEnvironment() {
    const g = this.add.graphics().setDepth(3.5);

    HOSPITAL_ZONES.forEach(zone => {
      const cx = zone.x + zone.width / 2;
      const cy = zone.y + zone.height / 2;
      this.add.rectangle(cx, cy, zone.width, zone.height, zone.tint, zone.alpha)
        .setStrokeStyle(1, 0x4f7cac, 0.35)
        .setDepth(3.5);
      this.add.text(zone.x + 8, zone.y + 6, zone.label, {
        fontFamily: 'Arial, sans-serif',
        fontSize: '9px',
        color: 'rgba(157,192,232,.75)',
        backgroundColor: 'rgba(8,12,18,.5)',
        padding: { x: 4, y: 2 },
      }).setDepth(4).setAlpha(0.85);
    });

    // Internal partitions
    g.lineStyle(2, 0x4f7cac, 0.45);
    g.lineBetween(604, 44, 604, 324);
    g.lineBetween(604, 360, 604, 496);
    g.lineBetween(334, 280, 334, 496);
    g.lineBetween(620, 44, 910, 44);
    g.lineBetween(620, 200, 910, 200);
    // Restricted-area barrier
    g.lineStyle(2, 0xa85062, 0.65);
    g.strokeRect(620, 48, 290, 160);

    // Entrance signage
    this.add.text(72, 392, 'URGENCIAS', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '13px',
      color: '#e8f0f4',
      fontStyle: 'bold',
      backgroundColor: 'rgba(168,80,98,.82)',
      padding: { x: 8, y: 4 },
    }).setDepth(6);

    if (this.assetsLoaded && this.textures.exists('characters')) {
      // Family NPCs near escucha-segura zone
      this.add.sprite(150, 248, 'characters', KenneyCharFrames.NPC_PATIENT_IDLE)
        .setScale(2).setDepth(8).setTint(0xffc8b0);
      this.add.text(150, 276, 'Abuela', {
        fontFamily: 'Arial, sans-serif', fontSize: '9px', color: '#e8c4b8',
        backgroundColor: 'rgba(8,12,18,.72)', padding: { x: 3, y: 2 },
      }).setOrigin(0.5, 0).setDepth(8);

      this.add.sprite(230, 268, 'characters', KenneyCharFrames.NPC_PATIENT_IDLE)
        .setScale(1.85).setDepth(8).setTint(0xb8d4ff);
      this.add.text(230, 294, 'Hermano', {
        fontFamily: 'Arial, sans-serif', fontSize: '9px', color: '#b8d4ff',
        backgroundColor: 'rgba(8,12,18,.72)', padding: { x: 3, y: 2 },
      }).setOrigin(0.5, 0).setDepth(8);

      // Security at entrance
      this.add.sprite(110, 430, 'characters', KenneyCharFrames.NPC_SUPERVISOR_IDLE)
        .setScale(2).setDepth(8);
      this.add.text(110, 458, 'Seguridad', {
        fontFamily: 'Arial, sans-serif', fontSize: '9px', color: '#9dc0e8',
        backgroundColor: 'rgba(8,12,18,.72)', padding: { x: 3, y: 2 },
      }).setOrigin(0.5, 0).setDepth(8);
    }

    if (this.assetsLoaded && this.textures.exists('dungeon-tiles')) {
      // Waiting-room chairs and reception desk
      [[380, 340], [420, 340], [380, 380], [420, 380]].forEach(([x, y]) => {
        this.add.image(x, y, 'dungeon-tiles', KenneyDungeonFrames.CHAIR).setScale(2).setDepth(7);
      });
      this.add.image(560, 160, 'dungeon-tiles', KenneyDungeonFrames.DESK).setScale(2.2).setDepth(7);
      this.add.image(700, 100, 'dungeon-tiles', KenneyDungeonFrames.CABINET).setScale(2).setDepth(7);
    }
  }

  private renderComisariaEnvironment() {
    const g = this.add.graphics().setDepth(3.5);

    COMISARIA_ZONES.forEach(zone => {
      const cx = zone.x + zone.width / 2;
      const cy = zone.y + zone.height / 2;
      this.add.rectangle(cx, cy, zone.width, zone.height, zone.tint, zone.alpha)
        .setStrokeStyle(1, 0x5b4f8f, 0.38)
        .setDepth(3.5);
      this.add.text(zone.x + 8, zone.y + 6, zone.label, {
        fontFamily: 'Arial, sans-serif',
        fontSize: '9px',
        color: 'rgba(184,168,232,.75)',
        backgroundColor: 'rgba(8,12,18,.5)',
        padding: { x: 4, y: 2 },
      }).setDepth(4).setAlpha(0.85);
    });

    g.lineStyle(2, 0x5b4f8f, 0.45);
    g.lineBetween(364, 44, 364, 496);
    g.lineBetween(624, 44, 624, 496);
    g.lineBetween(640, 190, 910, 190);
    g.lineBetween(640, 330, 910, 330);
    g.lineStyle(2, 0xa85062, 0.55);
    g.strokeRect(640, 48, 270, 140);

    this.add.text(72, 392, 'COMISARÍA DE FAMILIA', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '12px',
      color: '#e8f0f4',
      fontStyle: 'bold',
      backgroundColor: 'rgba(91,79,143,.82)',
      padding: { x: 8, y: 4 },
    }).setDepth(6);

    if (this.assetsLoaded && this.textures.exists('characters')) {
      this.add.sprite(180, 220, 'characters', KenneyCharFrames.NPC_PATIENT_IDLE)
        .setScale(2).setDepth(8).setTint(0xffd4c0);
      this.add.text(180, 248, 'Sobreviviente', {
        fontFamily: 'Arial, sans-serif', fontSize: '9px', color: '#ffd4c0',
        backgroundColor: 'rgba(8,12,18,.72)', padding: { x: 3, y: 2 },
      }).setOrigin(0.5, 0).setDepth(8);

      this.add.sprite(280, 200, 'characters', KenneyCharFrames.PLAYER_IDLE)
        .setScale(1.9).setDepth(8).setTint(0xa8c8ff);
      this.add.text(280, 228, 'Psicóloga social', {
        fontFamily: 'Arial, sans-serif', fontSize: '9px', color: '#a8c8ff',
        backgroundColor: 'rgba(8,12,18,.72)', padding: { x: 3, y: 2 },
      }).setOrigin(0.5, 0).setDepth(8);

      this.add.sprite(760, 90, 'characters', KenneyCharFrames.NPC_SUPERVISOR_IDLE)
        .setScale(2).setDepth(8);
      this.add.text(760, 118, 'Funcionario de derechos', {
        fontFamily: 'Arial, sans-serif', fontSize: '9px', color: '#9dc0e8',
        backgroundColor: 'rgba(8,12,18,.72)', padding: { x: 3, y: 2 },
      }).setOrigin(0.5, 0).setDepth(8);

      this.add.sprite(760, 400, 'characters', KenneyCharFrames.NPC_PATIENT_IDLE)
        .setScale(1.85).setDepth(8).setTint(0xb8e8c8);
      this.add.text(760, 428, 'Trabajadora social', {
        fontFamily: 'Arial, sans-serif', fontSize: '9px', color: '#b8e8c8',
        backgroundColor: 'rgba(8,12,18,.72)', padding: { x: 3, y: 2 },
      }).setOrigin(0.5, 0).setDepth(8);
    }

    if (this.assetsLoaded && this.textures.exists('dungeon-tiles')) {
      [[120, 400], [160, 400]].forEach(([x, y]) => {
        this.add.image(x, y, 'dungeon-tiles', KenneyDungeonFrames.DESK).setScale(2).setDepth(7);
      });
      [[200, 320], [240, 320]].forEach(([x, y]) => {
        this.add.image(x, y, 'dungeon-tiles', KenneyDungeonFrames.CHAIR).setScale(2).setDepth(7);
      });
      this.add.image(500, 280, 'dungeon-tiles', KenneyDungeonFrames.CABINET).setScale(2).setDepth(7);
    }
  }

  /**
   * Viñeta de iluminación procedural (sin assets). Pineada a cámara, estática
   * (segura con prefers-reduced-motion). El tinte sigue `ambient.ambientTone`.
   */
  /** Tono ambiental autorado del mapa actual (calm | clinical | warm | tense). */
  private ambientTone(): string {
    return String(
      (this.world?.map.ambient as { ambientTone?: unknown })?.ambientTone ?? 'calm',
    ).toLowerCase();
  }

  private applyLightingOverlay(): void {
    const tone = this.ambientTone();
    const tint =
      tone === 'warm' ? 0x3a2a1a :
      tone === 'clinical' ? 0x1a2433 :
      tone === 'tense' ? 0x2a1420 :
      0x141a2e; // calm (default)
    const cam = this.cameras.main;
    const w = cam.width, h = cam.height;
    const g = this.add.graphics().setScrollFactor(0).setDepth(DEPTH.LIGHTING);
    // Borde oscuro suave en los 4 lados — viñeta barata sin shaders.
    // Banda corta y alpha bajo: enmarca sin leerse como overlay técnico.
    const band = Math.round(Math.min(w, h) * 0.12);
    for (let i = 0; i < band; i++) {
      const a = 0.3 * (1 - i / band) ** 2;
      g.lineStyle(1, tint, a);
      g.strokeRect(i, i, w - i * 2, h - i * 2);
    }
  }

  private renderCollisionZone(zone: CollisionZoneState) {
    const cx = zone.x + zone.width/2;
    const cy = zone.y + zone.height/2;
    const isDoor = /puerta|door/i.test(zone.label ?? '');
    // Walls: solid dark panels; doors get a subtle teal accent
    const themeClr = this.borderFor(this.world!.map.theme);
    this.add.rectangle(cx, cy, zone.width, zone.height,
      isDoor ? 0x0c1926 : 0x090d14, isDoor ? .92 : 1)
      .setStrokeStyle(isDoor ? 2 : 1, isDoor ? themeClr : 0x18263a, isDoor ? .8 : .45)
      .setDepth(4);
    if (zone.label) {
      this.add.text(zone.x+5, zone.y+3, zone.label, {
        fontFamily: 'Arial, sans-serif', fontSize: '11px', color: '#9dc0e8',
        backgroundColor: 'rgba(8,12,18,.72)', padding: { x:4, y:2 }
      }).setDepth(5);
    }
  }

  private createPlayer(x: number, y: number) {
    this.lastPose = { direction: null, walking: false };
    if (this.avatarReady && this.textures.exists(AVATAR_TEXTURE_KEY)) {
      // Contrato de pies (player-motion.util): (x, y) del contenedor = punto de
      // pies. Sombra centrada en los pies; el sprite sube PLAYER_SPRITE_OFFSET_Y.
      // Sombra en dos pasos: borde suave + núcleo — asienta sin parecer sticker.
      const shadowSoft = this.add.ellipse(0, 0, 42, 13, 0x000000, .15);
      const shadow = this.add.ellipse(0, 0, 28, 9, 0x000000, .27);
      const sprite = this.add.sprite(0, PLAYER_SPRITE_OFFSET_Y, AVATAR_TEXTURE_KEY, AVATAR_IDLE_FRAMES.down)
        .setScale(AVATAR_DISPLAY_SCALE);
      this.player = this.add.container(x, y, [shadowSoft, shadow, sprite]).setDepth(actorDepth(y));
      this.playerSprite = sprite;
      return;
    }
    // Fallback Kenney: mismo contrato de pies (sprite 16px × 1.5 → centro -11).
    const shadow = this.add.ellipse(0, 0, 16, 5, 0x000000, .22);
    if (this.assetsLoaded && this.textures.exists('characters')) {
      const sprite = this.add.sprite(0, -11, 'characters', KenneyCharFrames.PLAYER_IDLE).setScale(1.5);
      // scale 1.5: at zoom=2 → sprite is 48px on screen ≈ 1.5 tiles wide — correct RPG proportion.
      this.player = this.add.container(x, y, [shadow, sprite]).setDepth(actorDepth(y));
      this.playerSprite = sprite;
    } else {
      const body  = this.add.rectangle(0, -14, 24, 32, 0x4f7cac, 1).setStrokeStyle(2, 0xffffff, .9);
      const head  = this.add.circle(0, -36, 12, 0xf4c6a8, 1).setStrokeStyle(2, 0xffffff, .85);
      const badge = this.add.rectangle(0, -10, 12,  7, 0xffffff, .9);
      this.player = this.add.container(x, y, [shadow, body, head, badge]).setDepth(actorDepth(y));
    }
  }

  /**
   * Aplica la pose (dirección + caminando/idle) SOLO si cambió desde el último
   * frame: la animación no se reinicia en cada update y el idle es inmediato
   * al soltar teclas o quedar bloqueado contra una pared.
   */
  private applyPlayerPose(direction: PlayerDirection, walking: boolean): void {
    if (this.lastPose.direction === direction && this.lastPose.walking === walking) return;
    this.lastPose = { direction, walking };
    if (walking) this.playWalkAnimation(direction);
    else this.setIdleFrame(direction);
  }

  /**
   * Caminata del jugador. El avatar modular usa filas down/side/up (la fila
   * lateral mira a la DERECHA → flip para la izquierda); Kenney usa sus
   * animaciones `walk-*` (fila lateral mira a la DERECHA → flip para izquierda).
   */
  private playWalkAnimation(direction: PlayerDirection): void {
    if (!this.playerSprite) return;
    if (this.avatarReady) {
      this.playerSprite.setFlipX(modularAvatarFlipX(direction));
      if (this.callbacks.reduceMotion) { this.setIdleFrame(direction); return; }
      const anim = direction === 'down' ? AVATAR_ANIM_KEYS.down
        : direction === 'up' ? AVATAR_ANIM_KEYS.up
        : AVATAR_ANIM_KEYS.side;
      this.playerSprite.play(anim, true);
      return;
    }
    this.playerSprite.setFlipX(direction === 'left');
    if (!this.callbacks.reduceMotion) this.playerSprite.play(`walk-${direction}`, true);
  }

  /** Frame de reposo limpio según la última dirección. */
  private setIdleFrame(direction: PlayerDirection): void {
    if (!this.playerSprite) return;
    this.playerSprite.stop();
    if (this.avatarReady) {
      const frame = direction === 'up' ? AVATAR_IDLE_FRAMES.up
        : direction === 'down' ? AVATAR_IDLE_FRAMES.down
        : AVATAR_IDLE_FRAMES.side;
      this.playerSprite.setFrame(frame);
      this.playerSprite.setFlipX(modularAvatarFlipX(direction));
      return;
    }
    const idleFrame =
      direction === 'up'   ? KenneyCharFrames.PLAYER_WALK_UP[0]   :
      direction === 'down' ? KenneyCharFrames.PLAYER_WALK_DOWN[0] :
                             KenneyCharFrames.PLAYER_WALK_RIGHT[0];
    this.playerSprite.setFrame(idleFrame);
    this.playerSprite.setFlipX(direction === 'left');
  }

  private createMarker(object: MapObjectState) {
    const isExit = object.type === 'EXIT';
    const color  = Number.parseInt(object.color.replace('#', ''), 16) || 0x4fa3a5;
    const displayLabel = getSceneDisplayLabel(object, this.world?.map.key);
    // El label nace oculto: la escena se lee por iconos/rings y el texto solo
    // aparece para la interacción cercana o seleccionada (refreshMarkerStates).
    // Los EXIT no llevan label propio — su door hint ya nombra el destino.
    const label  = this.add.text(0, 28, displayLabel, {
      fontFamily: 'Arial, sans-serif', fontSize: '11px', color: '#e8f0f4',
      backgroundColor: 'rgba(8,12,18,.72)', padding: { x:5, y:3 }, align: 'center', wordWrap: { width: 140 }
    }).setOrigin(.5, 0).setAlpha(0);

    let main: Phaser.GameObjects.GameObject;

    if (this.assetsLoaded) {
      if (isExit && this.authoredRoomActive) {
        // Puerta dibujada (la sala premium no mezcla tiles Kenney): marco + hoja + pomo.
        const doorFrame = this.add.rectangle(0, -10, 34, 46, 0x1a1530, 0.92).setStrokeStyle(2, 0xb69cff, 0.8);
        const doorPanel = this.add.rectangle(0, -10, 24, 36, 0x2a2348, 1);
        const doorKnob = this.add.circle(7, -8, 2.5, 0xb69cff, 1);
        main = this.add.container(0, 0, [doorFrame, doorPanel, doorKnob]);
      } else if (isExit && this.textures.exists('dungeon-tiles')) {
        main = this.add.image(0, 0, 'dungeon-tiles', KenneyDungeonFrames.DOOR).setScale(2.5);
      } else if (object.type === 'TOOL') {
        main = this.buildToolMarker(color, object.shortCode || object.toolCode || object.label);
      } else if (object.type === 'PERSON' && this.objectAvatarConfig(object)
          && this.ensureObjectAvatarComposite(object)) {
        const scale = Number((object.metadata as { scale?: unknown } | undefined)?.scale ?? 0.82);
        const personSprite = this.add.sprite(0, -Math.round(42 * scale) + 16,
          this.objectAvatarTextureKey(object.key), AVATAR_IDLE_FRAMES.down).setScale(scale);
        main = personSprite;
      } else if (object.type === 'PERSON' && MAP_OBJECT_PRESETS[object.key]
          && this.ensureNpcComposite(MAP_OBJECT_PRESETS[object.key])) {
        // Persona del caso con preset modular (p. ej. la consultante): mismo
        // universo visual que el avatar. El +16 alinea los pies del arte con la
        // sombra del marker (que vive en y=16).
        const presetKey = MAP_OBJECT_PRESETS[object.key];
        const render = NPC_PRESET_RENDER[presetKey];
        const personSprite = this.add.sprite(0, -Math.round(42 * render.scale) + 16,
          npcAvatarTextureKey(presetKey), AVATAR_IDLE_FRAMES.down).setScale(render.scale);
        if (render.tint != null) personSprite.setTint(render.tint);
        (personSprite as unknown as Record<string, unknown>)['__personBaseTint'] = render.tint ?? null;
        main = personSprite;
      } else if (object.type === 'PERSON' && this.textures.exists('characters')) {
        main = this.add.sprite(0, 0, 'characters', KenneyCharFrames.NPC_PATIENT_IDLE)
          .setScale(this.authoredRoomActive ? 2.4 : 2);
      } else if (this.textures.exists('dungeon-tiles')) {
        main = this.add.image(0, 0, 'dungeon-tiles', this.frameForType(object.type)).setScale(2);
      } else {
        main = this.buildGeomMarker(color);
      }
    } else {
      main = this.buildGeomMarker(color);
    }

    const pulse = this.add.circle(0, 0, 22, color, .1);
    if (!this.callbacks.reduceMotion) {
      this.tweens.add({ targets: pulse, scale: 1.3, alpha: .05, duration: 1100, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }

    // Sombra de contacto: el icono queda asentado en el piso, no flotando.
    const markerShadow = this.add.ellipse(0, 16, 26, 8, 0x000000, .2);
    const marker = this.add.container(object.x, object.y, [markerShadow, pulse, main, label]);
    this.setFeetOffset(marker, 16);   // la sombra marca el contacto con el piso
    this.markers.set(object.key, marker);
    this.markerData.set(object.key, object);
    if (!isExit) this.markerLabels.set(object.key, label);
    this.applyAmbientLife(marker, object);

    if (isExit) {
      const hintBg = this.add.rectangle(0, 0, 88, 22, 0x0e141a, .88).setStrokeStyle(1, 0x4fa3a5, .5);
      const hintTx = this.add.text(0, 0, `E  ${object.label} →`, {
        fontFamily: 'Arial, sans-serif', fontSize: '11px', color: '#4fa3a5', fontStyle: 'bold'
      }).setOrigin(.5);
      const hint = this.add.container(object.x, object.y - 50, [hintBg, hintTx]).setDepth(DEPTH.UI).setVisible(false);
      this.doorHints.set(object.key, hint);
    }
  }

  private isInteractive(o: MapObjectState): boolean {
    return o.type === 'EXIT' || o.type === 'TOOL' || o.type === 'ROUTE'
      || o.decisionOptionId != null
      || (o.toolCode != null && o.toolCode !== '')
      || o.dialogue != null;
  }

  /**
   * Per-object ambient behavior (B1). Interactive markers get a gentle float
   * (they must stay put for interaction); non-interactive actors wander/patrol
   * via the motion helpers, collision-aware. Static when reduced motion.
   */
  private applyAmbientLife(marker: Phaser.GameObjects.Container, object: MapObjectState) {
    if (this.callbacks.reduceMotion) return;

    if (this.isInteractive(object)) {
      // Interactable juice: subtle float on top of the existing glow pulse.
      this.tweens.add({
        targets: marker, y: object.y - 3, duration: 1400,
        yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
      });
      return;
    }

    const pattern = resolvePattern(object);
    if (pattern.type === 'idle') {
      this.tweens.add({
        targets: marker, y: object.y - 2, duration: 1700,
        yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
      });
      return;
    }
    this.ambientMovers.set(object.key, {
      key: object.key,
      origin: { x: object.x, y: object.y },
      pattern,
      target: null,
      retargetAt: 0,
      patrolIdx: 0,
    });
  }

  private updateAmbientMovers(time: number, delta: number) {
    if (this.motionPaused || this.callbacks.reduceMotion || this.ambientMovers.size === 0) return;
    const step = this.AMBIENT_SPEED * (delta / 1000);
    for (const mover of this.ambientMovers.values()) {
      const marker = this.markers.get(mover.key);
      if (!marker) continue;
      if (!mover.target || reached(marker, mover.target, 2) || time >= mover.retargetAt) {
        mover.target = this.nextAmbientTarget(mover);
        mover.retargetAt = time + this.AMBIENT_RETARGET_MS;
      }
      if (!mover.target) continue;
      const next = stepToward(marker, mover.target, step);
      if (!this.wouldCollide(next.x, next.y)) {
        marker.setPosition(next.x, next.y);
      } else {
        mover.target = null;   // blocked → re-pick next frame
      }
    }
  }

  private nextAmbientTarget(mover: AmbientMover): { x: number; y: number } | null {
    if (mover.pattern.type === 'wander') {
      return pickWanderTarget(mover.origin, mover.pattern.radius, Math.random);
    }
    if (mover.pattern.type === 'patrol' && mover.pattern.points.length) {
      mover.patrolIdx = (mover.patrolIdx + 1) % mover.pattern.points.length;
      const [x, y] = mover.pattern.points[mover.patrolIdx];
      return { x, y };
    }
    return null;
  }

  /** One tasteful scene-level effect: faint, slow-rising dust motes. */
  private spawnAmbientDust(w: number, h: number) {
    if (this.callbacks.reduceMotion) return;
    for (let i = 0; i < 5; i++) {
      const mote = this.add.circle(
        Phaser.Math.Between(60, w - 60), Phaser.Math.Between(80, h - 120),
        1.5, 0x9dc0e8, 0.18,
      ).setDepth(2.5);
      this.tweens.add({
        targets: mote,
        y: mote.y - Phaser.Math.Between(20, 48),
        x: mote.x + Phaser.Math.Between(-16, 16),
        alpha: 0,
        duration: Phaser.Math.Between(4200, 7200),
        delay: Phaser.Math.Between(0, 2600),
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }
  }

  private buildGeomMarker(color: number): Phaser.GameObjects.Container {
    const glow = this.add.circle(0, 0, 34, color, .16);
    const base = this.add.circle(0, 0, 24, color, .9).setStrokeStyle(3, 0xffffff, .95);
    if (!this.callbacks.reduceMotion) {
      this.tweens.add({ targets: glow, scale: 1.2, alpha: .08, duration: 1100, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }
    return this.add.container(0, 0, [glow, base]);
  }

  private buildToolMarker(color: number, label: string): Phaser.GameObjects.Container {
    const glow = this.add.circle(0, 0, 30, color, .14);
    const base = this.add.rectangle(0, 0, 42, 28, color, .9)
      .setStrokeStyle(3, 0xffffff, .92);
    const shine = this.add.rectangle(-7, -7, 22, 3, 0xffffff, .28);
    const text = this.add.text(0, 0, label.slice(0, 4).toUpperCase(), {
      fontFamily: 'Arial, sans-serif',
      fontSize: '10px',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(.5);
    if (!this.callbacks.reduceMotion) {
      this.tweens.add({ targets: glow, scale: 1.15, alpha: .07, duration: 1100, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }
    return this.add.container(0, 0, [glow, base, shine, text]);
  }

  private frameForType(type: string): number {
    const map: Record<string, number> = {
      PERSON: KenneyDungeonFrames.DESK, OBJECT: KenneyDungeonFrames.CABINET,
      ROUTE: KenneyDungeonFrames.PLANT, TOOL: KenneyDungeonFrames.CABINET,
      WARNING: KenneyDungeonFrames.DESK
    };
    return map[type] ?? KenneyDungeonFrames.DESK;
  }

  /**
   * Ordena un actor por la Y de sus PIES (2.5D: más abajo = más al frente).
   * El jugador ya está anclado a pies (offset 0); NPCs/markers/guía guardan en
   * `__feetOffset` la distancia centro→pies para comparar al mismo nivel.
   */
  private ysort(obj: Phaser.GameObjects.Container): void {
    const feetOffset = Number((obj as unknown as Record<string, unknown>)['__feetOffset'] ?? 0);
    obj.setDepth(actorDepth(obj.y + feetOffset));
  }

  /** Registra la distancia centro→pies de un actor y lo ordena ya mismo. */
  private setFeetOffset(obj: Phaser.GameObjects.Container, offset: number): void {
    (obj as unknown as Record<string, unknown>)['__feetOffset'] = offset;
    this.ysort(obj);
  }

  /** Mueve con sliding contra paredes. Devuelve true si hubo avance real. */
  private movePlayer(dx: number, dy: number): boolean {
    if (!this.player) return false;
    const nx = this.player.x + dx;
    const ny = this.player.y + dy;
    // Try full movement
    if (!this.wouldCollide(nx, ny)) { this.player.setPosition(nx, ny); return true; }
    // Slide along walls: try horizontal-only
    if (dx !== 0 && !this.wouldCollide(nx, this.player.y)) { this.player.setPosition(nx, this.player.y); return true; }
    // Slide along walls: try vertical-only
    if (dy !== 0 && !this.wouldCollide(this.player.x, ny)) { this.player.setPosition(this.player.x, ny); return true; }
    // Fully blocked
    return false;
  }

  /**
   * true si poner los PIES del jugador en (x, y) chocaría. Usa el hitbox de
   * pies (player-motion.util): muebles y paredes bloquean pies; la cabeza y el
   * pelo pueden solapar visualmente sin chocar. Con wallsLayer (Tiled) prueba
   * las 4 esquinas del hitbox; si no, las zonas AABB de la sala/backend.
   */
  private wouldCollide(x: number, y: number): boolean {
    const hb = playerHitbox(x, y);
    if (this.wallsLayer) {
      const corners = [
        { x: hb.x, y: hb.y }, { x: hb.x + hb.width, y: hb.y },
        { x: hb.x, y: hb.y + hb.height }, { x: hb.x + hb.width, y: hb.y + hb.height },
      ];
      return corners.some(pt => {
        const tile = this.wallsLayer!.getTileAtWorldXY(pt.x, pt.y);
        return tile !== null && tile.index > 0;
      });
    }
    // Legacy fallback: backend AABB zones
    if (!this.world) return false;
    const mapKey = this.world.map.key;
    // Salas del caso PDF: geometría propia por sala (espejo del seed backend).
    const caseZones = caseRoomCollisions(mapKey);
    const zones = caseZones
      ? caseZones
      : this.authoredRoomActive
        ? AUTHORED_CLINICAL_COLLISIONS
        : isHospitalMap(mapKey)
          ? HOSPITAL_COLLISIONS
          : isComisariaMap(mapKey)
            ? COMISARIA_COLLISIONS
            : this.world.collisions.map(z => ({ x: z.x, y: z.y, width: z.width, height: z.height }));
    return zones.some(z => rectsIntersect(hb, z));
  }

  private updateNearestInteraction(suppressSound = false) {
    if (!this.player || !this.world) return;

    const mapKey = this.world.map.key;
    const objects = (isHospitalMap(mapKey) || isComisariaMap(mapKey))
      ? applySceneDisplayLabels(this.renderableWorldObjects(), mapKey)
      : this.renderableWorldObjects();

    let nearest: MapObjectState | null = null;
    let nearestD = Infinity;
    for (const obj of objects) {
      const marker = this.markers.get(obj.key);
      if (!marker && obj.type === 'TOOL') continue;
      const ox = marker?.x ?? obj.x;
      const oy = marker?.y ?? obj.y;
      const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, ox, oy);
      if (d < nearestD) { nearest = { ...obj, x: ox, y: oy }; nearestD = d; }
    }

    // Las zonas ambientales son sabor de último recurso: un NPC en rango de
    // diálogo SIEMPRE gana (si no, la zona se roba la E junto a la enfermera).
    const ambientZones = getSceneAmbientZones(mapKey);
    if (ambientZones.length && !this.isAnyNpcInRange() && (!nearest || nearestD > 74)) {
      for (const zone of ambientZones) {
        const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, zone.x, zone.y);
        if (d <= zone.radius && d < nearestD) {
          nearest = buildSceneAmbientObject(zone, mapKey);
          nearestD = d;
        }
      }
    }

    const nextKey = nearest && nearestD <= 74 ? nearest.key : null;
    if (nextKey !== this.nearestKey) {
      this.nearestKey = nextKey;
      this.callbacks.onProximity(nextKey ? nearest : null);
      this.refreshMarkerStates();
      // Play blip only when *entering* range (nextKey goes null → key), not on every frame.
      // suppressSound=true on spawn/world-switch to avoid a false-positive blip on load.
      if (nextKey && !this.callbacks.reduceMotion && !this.callbacks.sfxMuted && !suppressSound) {
        this.sound.play('proximity-blip', { volume: 0.45 });
      }
    }
  }

  private refreshMarkerStates() {
    this.markers.forEach((m, key) => {
      const sel = key === this.selectedKey, near = key === this.nearestKey;
      m.setScale(sel ? 1.12 : near ? 1.08 : 1);
      m.setAlpha(sel || near ? 1 : .88);
      const label = this.markerLabels.get(key);
      if (label) label.setAlpha(sel || near ? 1 : 0);
    });
    this.doorHints.forEach((h, key) => h.setVisible(key === this.nearestKey));
  }

  private borderFor(theme: string): number {
    const m: Record<string, number> = {
      'protection-route':0x2f7476,'technical-record':0x2f5f8f,
      'risk-assessment':0x5b4f8f,'child-protection':0x5d9278,'follow-up':0x2f5f8f
    };
    return m[theme] ?? 0x4f7cac;
  }
}

@Component({
  selector: 'app-game-world',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    <div #gameHost class="phaser-host" role="application"
      aria-label="Mapa explorable de la simulación. Usa WASD o flechas para moverte, E para interactuar.">
    </div>
    <div class="touch-controls" aria-label="Controles táctiles">
      <button type="button" class="psy-icon-button touch-btn" aria-label="Mover arriba"    (click)="nudge('up')"><mat-icon>keyboard_arrow_up</mat-icon></button>
      <button type="button" class="psy-icon-button touch-btn" aria-label="Mover izquierda" (click)="nudge('left')"><mat-icon>keyboard_arrow_left</mat-icon></button>
      <button type="button" class="psy-button psy-button--glass touch-interact"            (click)="interactNearest()"><mat-icon>touch_app</mat-icon>Interactuar</button>
      <button type="button" class="psy-icon-button touch-btn" aria-label="Mover derecha"   (click)="nudge('right')"><mat-icon>keyboard_arrow_right</mat-icon></button>
      <button type="button" class="psy-icon-button touch-btn" aria-label="Mover abajo"     (click)="nudge('down')"><mat-icon>keyboard_arrow_down</mat-icon></button>
    </div>
  `,
  styles: [`
    :host { display: block; width: 100%; height: 100%; }
    .phaser-host { width: 100%; height: 100%; }
    /* El tamaño del canvas lo gobierna Phaser Scale.FIT (aspect 16:9 intacto,
       letterbox sobre el fondo oscuro). Forzar 100% aquí deformaba el juego y
       desbordaba el viewport en mobile. */
    :host ::ng-deep .phaser-host canvas { display: block; max-width: 100%; max-height: 100%; }
    .touch-controls {
      display: none;
      position: absolute;
      bottom: 92px;
      left: 50%;
      transform: translateX(-50%);
      grid-template-columns: repeat(5, minmax(44px, auto));
      justify-content: center;
      gap: 8px;
      z-index: 48;
    }
    .touch-btn { background: rgba(8,12,18,.7); border-color: rgba(79,163,165,.3); color: #4fa3a5; }
    .touch-interact { font-size: .82rem; }
    @media (max-width: 900px) { .touch-controls { display: grid; } }
  `]
})
export class GameWorldComponent implements OnChanges, OnDestroy {
  readonly world = input<SimulationWorldState | null>(null);
  readonly scenarioConfig = input<ScenarioConfig | null>(null);
  readonly selectedInteractionKey = input<string | null>(null);
  readonly nearbyInteraction = input<MapObjectState | null>(null);
  readonly guide = input<SceneGuideEntry | null>(null);
  /** true mientras hay diálogo/journal/outcome: congela NPCs y ambient. */
  readonly motionPaused = input(false);
  readonly sfxMuted = input(false);
  readonly reduceMotion = input<boolean | null>(null);
  readonly proximity = output<MapObjectState | null>();
  readonly interact = output<MapObjectState>();
  readonly positionChange = output<{ x: number; y: number }>();
  readonly roomExit = output<{ targetRoomKey: string; entryX: number; entryY: number }>();
  readonly enterRoom = output<{ targetNodeKey: string; entryX: number; entryY: number }>();
  readonly npcInteract = output<NpcConfig>();
  private scene?: DataDrivenWorldScene;
  private phaserGame?: Phaser.Game;
  private gameHost?: ElementRef<HTMLDivElement>;
  private hostResizeObserver?: ResizeObserver;

  constructor(private readonly zone: NgZone) {}

  @ViewChild('gameHost')
  set host(value: ElementRef<HTMLDivElement> | undefined) {
    this.gameHost = value;
    if (value) this.boot();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['scenarioConfig']) this.scene?.setScenarioConfig(this.scenarioConfig());
    if (changes['world'] && this.world()) this.scene?.setWorld(this.world()!);
    if (changes['selectedInteractionKey']) this.scene?.setSelected(this.selectedInteractionKey());
    if (changes['guide']) this.scene?.setGuide(this.guide());
    if (changes['motionPaused']) this.scene?.setMotionPaused(this.motionPaused());
    if (changes['sfxMuted']) this.scene?.setSfxMuted(this.sfxMuted());
    if (changes['reduceMotion']) this.scene?.setReduceMotion(this.effectiveReduceMotion());
  }

  ngOnDestroy() {
    this.hostResizeObserver?.disconnect();
    this.phaserGame?.destroy(true);
  }

  nudge(direction: 'up' | 'down' | 'left' | 'right') { this.scene?.nudge(direction); }
  interactNearest() { this.scene?.interactNearest(); }
  focus(key: string) { this.scene?.focus(key); }
  setScenarioConfig(config: ScenarioConfig | null) { this.scene?.setScenarioConfig(config); }
  transitionToRoom(targetRoomKey: string, entryX: number, entryY: number) {
    this.scene?.transitionToRoom(targetRoomKey, entryX, entryY);
  }
  updatePatientVisualState(state: import('../../core/models/simulation.model').PatientState) {
    this.scene?.updatePatientVisualState(state);
  }

  private boot() {
    if (!this.gameHost || this.phaserGame) return;
    const reduceMotion = this.effectiveReduceMotion();
    this.zone.runOutsideAngular(() => {
      this.scene = new DataDrivenWorldScene({
        reduceMotion,
        onProximity:   i => this.zone.run(() => this.proximity.emit(i)),
        onInteract:    i => this.zone.run(() => this.interact.emit(i)),
        onPosition:    (x, y) => this.zone.run(() => this.positionChange.emit({ x, y })),
        onRoomExit:    (targetRoomKey, entryX, entryY) =>
          this.zone.run(() => this.roomExit.emit({ targetRoomKey, entryX, entryY })),
        onEnterRoom:   (targetNodeKey, entryX, entryY) =>
          this.zone.run(() => this.enterRoom.emit({ targetNodeKey, entryX, entryY })),
        onNpcInteract: npc => this.zone.run(() => this.npcInteract.emit(npc)),
        sfxMuted: this.sfxMuted(),
      });
      this.phaserGame = new Phaser.Game({
        type: Phaser.AUTO,
        parent: this.gameHost!.nativeElement,
        width: 960, height: 540,
        backgroundColor: '#0e141a',
        pixelArt: true,    // nearest-neighbour scaling — keeps pixel art sharp
        roundPixels: true, // 2.5D: evita shimmer sub-pixel al hacer y-sort + follow
        scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH, width: 960, height: 540 },
        scene: this.scene
      });
      // Scale.FIT solo escucha resize de window; el contenedor también cambia
      // de tamaño cuando el layout muta (panel derecho, rotación, bottom sheet).
      if (typeof ResizeObserver !== 'undefined') {
        this.hostResizeObserver = new ResizeObserver(() => this.phaserGame?.scale.refresh());
        this.hostResizeObserver.observe(this.gameHost!.nativeElement);
      }
    });
    window.setTimeout(() => {
      this.scene?.setScenarioConfig(this.scenarioConfig());
      if (this.world()) this.scene?.setWorld(this.world()!);
      this.scene?.setGuide(this.guide());
      this.scene?.setMotionPaused(this.motionPaused());
      this.scene?.setSfxMuted(this.sfxMuted());
      this.scene?.setReduceMotion(this.effectiveReduceMotion());
    }, 0);
  }

  private effectiveReduceMotion(): boolean {
    return this.reduceMotion() ?? (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false);
  }
}

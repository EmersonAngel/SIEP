import { Injectable } from '@angular/core';
import { Howl, Howler } from 'howler';

export type MusicLayer = 'ambient' | 'tension' | 'resolution' | 'crisis';
export type SoundEffect =
  | 'footstep_tile'
  | 'footstep_wood'
  | 'door_open'
  | 'ui_select'
  | 'ui_confirm'
  | 'ui_cancel'
  | 'dialogue_advance'
  | 'stress_high'
  | 'crisis_start'
  | 'session_complete';

interface StemTrack {
  howl: Howl;
  volume: number;
  targetVolume: number;
}

@Injectable({ providedIn: 'root' })
export class AudioDirectorService {
  private stems = new Map<MusicLayer, StemTrack>();
  private sfx = new Map<SoundEffect, Howl>();
  private masterVolume = 1.0;
  private musicVolume = 0.7;
  private sfxVolume = 0.8;
  private fadeInterval?: number;
  private reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  private initialized = false;

  init(): void {
    if (this.initialized) return;
    this.initialized = true;

    const stemFiles: Record<MusicLayer, string> = {
      ambient:    'assets/audio/music/siep_ambient.ogg',
      tension:    'assets/audio/music/siep_tension.ogg',
      resolution: 'assets/audio/music/siep_resolution.ogg',
      crisis:     'assets/audio/music/siep_crisis.ogg',
    };

    for (const [layer, src] of Object.entries(stemFiles) as [MusicLayer, string][]) {
      const howl = new Howl({
        src: [src],
        loop: true,
        volume: 0,
        preload: true,
        onloaderror: (_: number, err: unknown) => console.warn(`[AudioDirector] No se pudo cargar ${src}:`, err),
      });
      this.stems.set(layer, { howl, volume: 0, targetVolume: 0 });
    }

    const sfxFiles: Record<SoundEffect, string> = {
      footstep_tile:    'assets/audio/sfx/footstep_tile.ogg',
      footstep_wood:    'assets/audio/sfx/footstep_wood.ogg',
      door_open:        'assets/audio/sfx/door_open.ogg',
      ui_select:        'assets/audio/sfx/ui_select.ogg',
      ui_confirm:       'assets/audio/sfx/ui_confirm.ogg',
      ui_cancel:        'assets/audio/sfx/ui_cancel.ogg',
      dialogue_advance: 'assets/audio/sfx/dialogue_advance.ogg',
      stress_high:      'assets/audio/sfx/stress_high.ogg',
      crisis_start:     'assets/audio/sfx/crisis_start.ogg',
      session_complete: 'assets/audio/sfx/session_complete.ogg',
    };

    for (const [key, src] of Object.entries(sfxFiles) as [SoundEffect, string][]) {
      this.sfx.set(key, new Howl({
        src: [src],
        volume: this.sfxVolume,
        preload: true,
        onloaderror: (_: number, err: unknown) => console.warn(`[AudioDirector] SFX error ${src}:`, err),
      }));
    }

    this.startFadeLoop();
  }

  setStressLevel(stress: number): void {
    if (!this.initialized) return;

    if (stress <= 30) {
      this.setTargetVolume('ambient', 1.0);
      this.setTargetVolume('tension', 0);
      this.setTargetVolume('resolution', 0);
      this.setTargetVolume('crisis', 0);
    } else if (stress <= 60) {
      const t = (stress - 30) / 30;
      this.setTargetVolume('ambient', 1.0 - t * 0.5);
      this.setTargetVolume('tension', t);
      this.setTargetVolume('resolution', 0);
      this.setTargetVolume('crisis', 0);
    } else if (stress <= 85) {
      this.setTargetVolume('ambient', 0.2);
      this.setTargetVolume('tension', 1.0);
      this.setTargetVolume('resolution', 0);
      this.setTargetVolume('crisis', 0);
    } else {
      this.setTargetVolume('ambient', 0);
      this.setTargetVolume('tension', 0.3);
      this.setTargetVolume('resolution', 0);
      this.setTargetVolume('crisis', 1.0);
    }

    this.stems.forEach(stem => {
      if (!stem.howl.playing()) stem.howl.play();
    });
  }

  playResolution(): void {
    if (!this.initialized) return;
    const res = this.stems.get('resolution');
    if (res?.howl.playing()) return; // evita restart en llamadas múltiples
    this.setTargetVolume('ambient', 0.3);
    this.setTargetVolume('tension', 0);
    this.setTargetVolume('resolution', 1.0);
    this.setTargetVolume('crisis', 0);
    this.stems.get('resolution')?.howl.play();
  }

  playSfx(effect: SoundEffect): void {
    if (!this.initialized) return;
    if (this.reducedMotion && (effect === 'footstep_tile' || effect === 'footstep_wood')) return;
    this.sfx.get(effect)?.play();
  }

  setMasterVolume(v: number): void {
    this.masterVolume = Math.max(0, Math.min(1, v));
    Howler.volume(this.masterVolume);
  }

  pause(): void { this.stems.forEach(s => s.howl.pause()); }

  resume(): void {
    this.stems.forEach(s => { if (!s.howl.playing()) s.howl.play(); });
  }

  stopAll(): void {
    this.stems.forEach(s => s.howl.stop());
    if (this.fadeInterval) clearInterval(this.fadeInterval);
  }

  dispose(): void {
    this.stopAll();
    this.stems.forEach(s => s.howl.unload());
    this.sfx.forEach(h => h.unload());
    this.stems.clear();
    this.sfx.clear();
    this.initialized = false;
  }

  private setTargetVolume(layer: MusicLayer, vol: number): void {
    const stem = this.stems.get(layer);
    if (stem) stem.targetVolume = vol * this.musicVolume;
  }

  private startFadeLoop(): void {
    const FADE_SPEED = 0.02;
    this.fadeInterval = window.setInterval(() => {
      this.stems.forEach(stem => {
        const diff = stem.targetVolume - stem.volume;
        if (Math.abs(diff) > 0.001) {
          stem.volume += diff * FADE_SPEED;
          stem.howl.volume(Math.max(0, Math.min(1, stem.volume)));
        }
      });
    }, 33);
  }
}

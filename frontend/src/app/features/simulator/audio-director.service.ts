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
  private introLament?: Howl;
  private masterVolume = 1.0;
  private musicVolume = 0.42;
  private musicMuted = false;
  private sfxMuted = false;
  // Bajo a propósito: los SFX de UI acompañan, no protagonizan.
  private sfxVolume = 0.5;
  private fadeInterval?: number;
  private reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  private initialized = false;

  init(): void {
    if (this.initialized) return;
    this.initialized = true;

    // Música adaptativa: el proyecto aún NO tiene stems propios (siep_*.ogg).
    // No se hace ninguna request hasta que existan los assets — los métodos de
    // música degradan a no-op cuando `stems` está vacío (sin 404 en consola).
    const stemFiles: Partial<Record<MusicLayer, string>> = {
      ambient: 'assets/game/audio/Musica_PsicoGame.mp3',
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

    // SFX mapeados a assets reales del pack Kenney UI Audio (CC0) ya presente.
    const base = 'assets/game/kenney/ui-audio/Audio';
    const sfxFiles: Record<SoundEffect, string> = {
      footstep_tile:    'assets/game/audio/footstep_concrete_000.ogg',
      footstep_wood:    'assets/game/audio/footstep_concrete_001.ogg',
      door_open:        `${base}/switch3.ogg`,
      ui_select:        `${base}/rollover1.ogg`,
      ui_confirm:       `${base}/click1.ogg`,
      ui_cancel:        `${base}/mouserelease1.ogg`,
      dialogue_advance: `${base}/click2.ogg`,
      stress_high:      `${base}/switch13.ogg`,
      crisis_start:     `${base}/switch13.ogg`,
      session_complete: `${base}/click5.ogg`,
    };

    for (const [key, src] of Object.entries(sfxFiles) as [SoundEffect, string][]) {
      this.sfx.set(key, new Howl({
        src: [src],
        volume: this.sfxVolume,
        mute: this.sfxMuted,
        preload: true,
        onloaderror: (_: number, err: unknown) => console.warn(`[AudioDirector] SFX error ${src}:`, err),
      }));
    }

    this.startFadeLoop();
  }

  playIntroLament(): void {
    if (!this.initialized || this.musicMuted) return;
    this.stems.forEach(stem => {
      stem.targetVolume = 0;
      stem.volume = 0;
      stem.howl.volume(0);
      stem.howl.pause();
    });
    if (!this.introLament) {
      this.introLament = new Howl({
        src: ['assets/game/audio/PsicoLament.mp3'],
        loop: true,
        volume: this.musicVolume,
        preload: true,
        onloaderror: (_: number, err: unknown) => console.warn('[AudioDirector] No se pudo cargar PsicoLament:', err),
      });
    }
    this.introLament.volume(this.musicMuted ? 0 : this.musicVolume);
    if (!this.introLament.playing()) this.introLament.play();
  }

  stopIntroLament(): void {
    this.introLament?.stop();
  }

  setStressLevel(stress: number): void {
    if (!this.initialized || this.stems.size === 0) return;

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
    if (!this.initialized || this.stems.size === 0) return;
    const res = this.stems.get('resolution');
    if (res?.howl.playing()) return; // evita restart en llamadas múltiples
    this.setTargetVolume('ambient', 0.3);
    this.setTargetVolume('tension', 0);
    this.setTargetVolume('resolution', 1.0);
    this.setTargetVolume('crisis', 0);
    this.stems.get('resolution')?.howl.play();
  }

  playSfx(effect: SoundEffect): void {
    if (!this.initialized || this.sfxMuted) return;
    if (this.reducedMotion && (effect === 'footstep_tile' || effect === 'footstep_wood')) return;
    this.sfx.get(effect)?.play();
  }

  setMasterVolume(v: number): void {
    this.masterVolume = Math.max(0, Math.min(1, v));
    Howler.volume(this.masterVolume);
  }

  isMusicMuted(): boolean { return this.musicMuted; }

  isSfxMuted(): boolean { return this.sfxMuted; }

  toggleMusicMuted(): boolean {
    this.setMusicMuted(!this.musicMuted);
    return this.musicMuted;
  }

  toggleSfxMuted(): boolean {
    this.setSfxMuted(!this.sfxMuted);
    return this.sfxMuted;
  }

  setMusicMuted(muted: boolean): void {
    this.musicMuted = muted;
    if (muted) {
      this.stems.forEach(stem => {
        stem.targetVolume = 0;
        stem.volume = 0;
        stem.howl.volume(0);
      });
    }
  }

  setSfxMuted(muted: boolean): void {
    this.sfxMuted = muted;
    this.sfx.forEach(howl => howl.mute(muted));
  }

  pause(): void { this.stems.forEach(s => s.howl.pause()); }

  resume(): void {
    this.stems.forEach(s => { if (!s.howl.playing()) s.howl.play(); });
  }

  stopAll(): void {
    this.introLament?.stop();
    this.stems.forEach(s => s.howl.stop());
    if (this.fadeInterval) clearInterval(this.fadeInterval);
  }

  dispose(): void {
    this.stopAll();
    this.introLament?.unload();
    this.introLament = undefined;
    this.stems.forEach(s => s.howl.unload());
    this.sfx.forEach(h => h.unload());
    this.stems.clear();
    this.sfx.clear();
    this.initialized = false;
  }

  private setTargetVolume(layer: MusicLayer, vol: number): void {
    const stem = this.stems.get(layer);
    if (stem) stem.targetVolume = this.musicMuted ? 0 : vol * this.musicVolume;
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

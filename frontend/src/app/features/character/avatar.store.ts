import { Injectable, signal } from '@angular/core';
import { AvatarConfig } from './avatar.model';
import { defaultAvatar, parseAvatar, serializeAvatar } from './avatar-config.util';

const KEY = 'psychosim_avatar';

@Injectable({ providedIn: 'root' })
export class AvatarStore {
  private readonly store: Storage | null;
  private readonly _avatar = signal<AvatarConfig>(defaultAvatar());
  readonly avatar = this._avatar.asReadonly();

  /** `storage` is injectable for tests; runtime falls back to window.localStorage. */
  constructor(storage?: Storage) {
    this.store = storage ?? (typeof localStorage !== 'undefined' ? localStorage : null);
    this.loadSaved();
  }

  loadSaved(): void {
    this._avatar.set(parseAvatar(this.safeGet()));
  }

  update(patch: Partial<AvatarConfig>): void {
    this._avatar.update(a => ({ ...a, ...patch }));
  }

  save(): void {
    try { this.store?.setItem(KEY, serializeAvatar(this._avatar())); } catch { /* cuota/privado: no-op */ }
  }

  reset(): void {
    this._avatar.set(defaultAvatar());
  }

  private safeGet(): string | null {
    try { return this.store?.getItem(KEY) ?? null; } catch { return null; }
  }
}

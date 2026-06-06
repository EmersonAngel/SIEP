import { AvatarStore } from './avatar.store';
import { defaultAvatar } from './avatar-config.util';

function mockStorage(): Storage {
  const m = new Map<string, string>();
  return {
    getItem: (k: string) => m.has(k) ? m.get(k)! : null,
    setItem: (k: string, v: string) => void m.set(k, v),
    removeItem: (k: string) => void m.delete(k),
    clear: () => m.clear(),
    key: (i: number) => [...m.keys()][i] ?? null,
    get length() { return m.size; },
  } as Storage;
}

describe('AvatarStore', () => {
  it('starts from default when storage empty', () => {
    const s = new AvatarStore(mockStorage());
    expect(s.avatar()).toEqual(defaultAvatar());
  });

  it('update merges without persisting until save', () => {
    const store = mockStorage();
    const s = new AvatarStore(store);
    s.update({ uniform: 'con-bata' });
    expect(s.avatar().uniform).toBe('con-bata');
    expect(store.getItem('psychosim_avatar')).toBeNull();
    s.save();
    expect(store.getItem('psychosim_avatar')).toContain('con-bata');
  });

  it('reset returns to default but keeps saved until next save', () => {
    const store = mockStorage();
    const s = new AvatarStore(store);
    s.update({ hairStyle: 'largo' }); s.save();
    s.reset();
    expect(s.avatar()).toEqual(defaultAvatar());
    expect(store.getItem('psychosim_avatar')).toContain('largo');
  });

  it('loadSaved re-reads persisted value', () => {
    const store = mockStorage();
    store.setItem('psychosim_avatar', JSON.stringify({ ...defaultAvatar(), hairColor: 'rubio' }));
    const s = new AvatarStore(store);
    s.loadSaved();
    expect(s.avatar().hairColor).toBe('rubio');
  });
});

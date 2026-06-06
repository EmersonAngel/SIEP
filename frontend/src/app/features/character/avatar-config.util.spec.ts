import { defaultAvatar, isValidAvatar, coerceAvatar, serializeAvatar, parseAvatar } from './avatar-config.util';

describe('avatar-config', () => {
  it('defaultAvatar is valid', () => {
    expect(isValidAvatar(defaultAvatar())).toBe(true);
  });

  it('coerceAvatar fixes invalid ids but keeps valid ones', () => {
    const out = coerceAvatar({ ...defaultAvatar(), skinTone: 'inexistente', hairColor: 'rubio' });
    expect(out.skinTone).toBe(defaultAvatar().skinTone);
    expect(out.hairColor).toBe('rubio');
  });

  it('coerceAvatar fills missing fields from default', () => {
    const out = coerceAvatar({ uniform: 'con-bata' });
    expect(out.uniform).toBe('con-bata');
    expect(out.eyes).toBe(defaultAvatar().eyes);
  });

  it('parseAvatar tolerates null and corrupt JSON', () => {
    expect(parseAvatar(null)).toEqual(defaultAvatar());
    expect(parseAvatar('{not json')).toEqual(defaultAvatar());
  });

  it('serialize -> parse roundtrips', () => {
    const a = { ...defaultAvatar(), hairStyle: 'largo', uniform: 'con-bata' as const };
    expect(parseAvatar(serializeAvatar(a))).toEqual(a);
  });
});

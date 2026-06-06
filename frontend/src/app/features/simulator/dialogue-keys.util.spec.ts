import { digitIndex } from './dialogue-keys.util';

describe('digitIndex', () => {
  it('maps 1..9 to 0..8', () => {
    expect(digitIndex('1')).toBe(0);
    expect(digitIndex('3')).toBe(2);
    expect(digitIndex('9')).toBe(8);
  });
  it('returns null for 0, letters, empty, multi-char', () => {
    expect(digitIndex('0')).toBeNull();
    expect(digitIndex('a')).toBeNull();
    expect(digitIndex('')).toBeNull();
    expect(digitIndex('12')).toBeNull();
  });
});

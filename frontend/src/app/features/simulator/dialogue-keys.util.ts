/** Mapea una tecla de dígito '1'..'9' a un índice 0..8; cualquier otra → null. */
export function digitIndex(key: string): number | null {
  if (key.length !== 1) return null;
  const n = key.charCodeAt(0) - 48; // '0' = 48
  return n >= 1 && n <= 9 ? n - 1 : null;
}

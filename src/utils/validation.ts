export function required(s: string): boolean {
  return String(s ?? '').trim().length > 0;
}

export function isPositiveNumberStr(s: string): boolean {
  if (s == null) return false;
  const n = Number(s);
  return Number.isFinite(n) && n > 0;
}

export function clampInt(n: number, lo: number, hi: number): number {
  if (!Number.isFinite(n)) return lo;
  return Math.max(lo, Math.min(hi, Math.trunc(n)));
}

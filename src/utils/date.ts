export function monthStartEnd(d: Date) {
  const start = new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0);
  const end = new Date(d.getFullYear(), d.getMonth() + 1, 1, 0, 0, 0, 0);
  return { startMs: start.getTime(), endMs: end.getTime() };
}

export function formatMoney(n: number, currency: string = 'AED') {
  return new Intl.NumberFormat('en-AE', { style: 'currency', currency }).format(n || 0);
}

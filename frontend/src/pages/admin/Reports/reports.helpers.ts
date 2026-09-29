export function clampRange(
  from: string,
  to: string,
  changed: 'from' | 'to',
  value: string,
): { from: string; to: string } {
  if (changed === 'from') {
    return value > to ? { from: value, to: value } : { from: value, to };
  }
  return value < from ? { from: value, to: value } : { from, to: value };
}

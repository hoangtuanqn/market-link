/**
 * The two date inputs on the Reports page (FR-075) only carry `min`/`max` on the browser side, which a keyboard-typed
 * value can still violate — pasting or typing a `from` past the current `to` (or a `to` before the current `from`)
 * would otherwise send an inverted range to `AdminReportApi`. Call this from each input's `onChange` instead of setting
 * the changed bound directly: it pulls the _other_ bound along when the new value would invert the range, so `from` is
 * never after `to`.
 */
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

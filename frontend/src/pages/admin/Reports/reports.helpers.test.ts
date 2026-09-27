import { describe, expect, it } from 'vitest';
import { clampRange } from './reports.helpers';

describe('clampRange', () => {
  it('keeps the other bound when the new value does not invert the range', () => {
    expect(clampRange('2026-09-01', '2026-09-30', 'from', '2026-09-10')).toEqual({
      from: '2026-09-10',
      to: '2026-09-30',
    });
    expect(clampRange('2026-09-01', '2026-09-30', 'to', '2026-09-15')).toEqual({
      from: '2026-09-01',
      to: '2026-09-15',
    });
  });

  it('pulls `to` up to a `from` typed past it', () => {
    expect(clampRange('2026-09-01', '2026-09-10', 'from', '2026-09-20')).toEqual({
      from: '2026-09-20',
      to: '2026-09-20',
    });
  });

  it('pulls `from` back to a `to` typed before it', () => {
    expect(clampRange('2026-09-10', '2026-09-20', 'to', '2026-09-05')).toEqual({
      from: '2026-09-05',
      to: '2026-09-05',
    });
  });
});

import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import BanDurationPicker, { type BanDuration } from './BanDurationPicker';

describe('BanDurationPicker', () => {
  it('starts permanent and switches to temporary with a future default', () => {
    const onChange = vi.fn();
    render(<BanDurationPicker value={{ kind: 'permanent' }} onChange={onChange} />);

    fireEvent.click(screen.getByRole('radio', { name: /temporary/i }));

    const [[next]] = onChange.mock.calls as [BanDuration][];
    expect(next.kind).toBe('temporary');
    if (next.kind === 'temporary') {
      expect(new Date(next.until).getTime()).toBeGreaterThan(Date.now());
    }
  });

  it('quick-duration buttons compute an absolute future timestamp', () => {
    const onChange = vi.fn();
    render(<BanDurationPicker value={{ kind: 'temporary', until: new Date().toISOString() }} onChange={onChange} />);

    fireEvent.click(screen.getByRole('button', { name: /7 days/i }));

    const [[next]] = onChange.mock.calls as [BanDuration][];
    expect(next.kind).toBe('temporary');
    if (next.kind === 'temporary') {
      const days = (new Date(next.until).getTime() - Date.now()) / 86_400_000;
      expect(days).toBeGreaterThan(6.9);
      expect(days).toBeLessThan(7.1);
    }
  });
});

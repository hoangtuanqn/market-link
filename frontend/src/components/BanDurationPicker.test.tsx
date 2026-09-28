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

  it('the specific-time field shows and round-trips the local wall-clock time, not UTC', () => {
    const until = new Date(Date.now() + 3 * 86_400_000).toISOString();
    const onChange = vi.fn();
    render(<BanDurationPicker value={{ kind: 'temporary', until }} onChange={onChange} />);

    const input = screen.getByLabelText(/exact end time/i) as HTMLInputElement;
    // datetime-local always reads/writes the *local* wall clock — converting `until` back from the
    // displayed value must reproduce the same instant, which only holds if the display used the
    // browser's offset instead of assuming UTC.
    const displayedAsLocal = new Date(`${input.value}:00`);
    const expectedLocal = new Date(until);
    expect(Math.abs(displayedAsLocal.getTime() - expectedLocal.getTime())).toBeLessThan(60_000);
  });

  it('clearing the specific-time field does not throw', () => {
    const onChange = vi.fn();
    render(
      <BanDurationPicker
        value={{ kind: 'temporary', until: new Date(Date.now() + 86_400_000).toISOString() }}
        onChange={onChange}
      />,
    );
    const input = screen.getByLabelText(/exact end time/i) as HTMLInputElement;

    expect(() => fireEvent.change(input, { target: { value: '' } })).not.toThrow();
    expect(onChange).not.toHaveBeenCalled();
  });
});

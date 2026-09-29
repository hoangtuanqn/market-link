import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import Rating from './Rating';

describe('Rating (FR-080)', () => {
  it('is allowed to wrap and to shrink below its content', () => {
    render(<Rating value={4} count={1} />);

    const row = screen.getByText('4.0').parentElement!;
    expect(row.className).toContain('flex-wrap');
    expect(row.className).toContain('min-w-0');
  });

  it('still shows the score and spells the rating out for a screen reader', () => {
    render(<Rating value={4} count={1} />);

    expect(screen.getByText('4.0')).toBeInTheDocument();
    expect(screen.getByText(/out of 5 stars/)).toBeInTheDocument();
  });
});

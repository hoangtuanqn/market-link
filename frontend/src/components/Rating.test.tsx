import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import Rating from './Rating';

describe('Rating (FR-080)', () => {
  /**
   * The rating sits inside a stall card, which on the home page is one column of a three-column grid. At 768px that
   * column is about 224px wide and the row — five stars, the score and "(1 review)" — is wider. Without permission to
   * wrap or shrink it pushed the whole page sideways by 28px.
   */
  it('is allowed to wrap and to shrink below its content', () => {
    render(<Rating value={4} count={1} />);

    const row = screen.getByText('4.0').parentElement!;
    expect(row.className).toContain('flex-wrap');
    expect(row.className).toContain('min-w-0');
  });

  it('still shows the score and spells the rating out for a screen reader', () => {
    render(<Rating value={4} count={1} />);

    expect(screen.getByText('4.0')).toBeInTheDocument();
    // The visible "(1 review)" and the screen-reader sentence both carry the count, so match the
    // sentence, which only the screen-reader copy has.
    expect(screen.getByText(/out of 5 stars/)).toBeInTheDocument();
  });
});

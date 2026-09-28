import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import DirectionsButton from './DirectionsButton';

describe('DirectionsButton (FR-013)', () => {
  /**
   * A link rather than a button behind a dialog: Google already starts from the device's location, so there is nothing
   * to ask first.
   */
  it('is a link that opens Google Maps directions in a new tab', () => {
    render(<DirectionsButton to={{ lat: 10.7769, lng: 106.7009 }} name="Bến Thành" />);

    const link = screen.getByRole('link', { name: /Directions/ });
    expect(link.getAttribute('href')).toMatch(/^https:\/\/www\.google\.com\/maps\/dir\/\?api=1&destination=10\.7769/);
    expect(link).toHaveAttribute('target', '_blank');
    expect(link.getAttribute('rel')).toContain('noopener');
  });

  it('names the place it routes to, for a screen reader', () => {
    render(<DirectionsButton to={{ lat: 10.7769, lng: 106.7009 }} name="Bến Thành" />);

    expect(screen.getByRole('link', { name: 'Directions to Bến Thành' })).toBeInTheDocument();
  });
});

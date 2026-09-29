import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import BestBeforeLine from './BestBeforeLine';

describe('BestBeforeLine', () => {
  it('names the last good day and how the line is kept', () => {
    render(<BestBeforeLine bestBefore="2026-10-04" storageMode="chilled" />);
    expect(screen.getByText('Good until end of Sun 04/10 · Fridge 0–5 °C')).toBeInTheDocument();
  });

  it('shows nothing for a line placed before the promise existed', () => {
    const { container } = render(<BestBeforeLine bestBefore={null} storageMode={null} />);
    expect(container).toBeEmptyDOMElement();
  });
});

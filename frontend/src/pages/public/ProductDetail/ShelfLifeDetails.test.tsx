import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import ShelfLifeDetails from './ShelfLifeDetails';

describe('ShelfLifeDetails', () => {
  it('says how it is kept and for how long', () => {
    render(
      <ShelfLifeDetails
        shelfLife={{
          guideId: 12,
          groupName: 'Leafy greens',
          storageMode: 'chilled',
          days: 3,
          suggestedDays: 3,
          extended: false,
        }}
        fallbackDays={3}
      />,
    );
    expect(screen.getByText('Fridge 0–5 °C · good for 3 days from pickup')).toBeInTheDocument();
    expect(screen.queryByText(/The stall promises/)).not.toBeInTheDocument();
  });

  it("names the stall's own promise when it went longer", () => {
    render(
      <ShelfLifeDetails
        shelfLife={{
          guideId: 12,
          groupName: 'Leafy greens',
          storageMode: 'chilled',
          days: 5,
          suggestedDays: 3,
          extended: true,
        }}
        fallbackDays={5}
      />,
    );
    expect(screen.getByText('The stall promises 5 days (usually 3).')).toBeInTheDocument();
  });

  it('falls back to room temperature and the listed days without a block', () => {
    render(<ShelfLifeDetails shelfLife={null} fallbackDays={2} />);
    expect(screen.getByText('Room temperature · good for 2 days from pickup')).toBeInTheDocument();
  });
});

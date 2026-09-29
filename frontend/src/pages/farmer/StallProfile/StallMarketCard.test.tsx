import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import StallMarketCard from './StallMarketCard';

describe('StallMarketCard', () => {
  it('caps the stall code at the length the server accepts', () => {
    render(
      <StallMarketCard
        sm={{ farmerMarketId: 1, marketId: 1, marketName: 'Chợ Bà Chiểu', stallCode: 'A-12', operatingDays: [] }}
        market={undefined}
        settings={{ code: 'A-12', days: [6], start: '07:00', end: '11:00', lat: 10.8, lng: 106.7 }}
        withMap={false}
        onUpdate={vi.fn()}
      />,
    );

    expect(screen.getByLabelText(/^Stall code or spot/)).toHaveAttribute('maxLength', '30');
  });
});

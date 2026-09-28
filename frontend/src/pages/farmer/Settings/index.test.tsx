import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import FarmerSettingsPage from './index';

vi.mock('@/api-requests/settings.requests', () => ({
  default: { get: vi.fn(), save: vi.fn() },
}));
vi.mock('@/components/notifications/NotificationSettingsCard', () => ({ default: () => null }));

describe('FarmerSettingsPage', () => {
  /**
   * The Selling defaults were saved but nothing read them: the order cutoff lives on Stall & pickup and Generate slots
   * asks for its own length and capacity, so the page must not offer defaults that change nothing.
   */
  it('offers no selling defaults and says where the stall settings live', () => {
    render(<FarmerSettingsPage />);

    expect(screen.getByRole('heading', { level: 1, name: 'Settings' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Selling defaults' })).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Order cutoff')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Slot length')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Orders per slot')).not.toBeInTheDocument();
    expect(screen.getByText(/Stall & pickup/)).toBeInTheDocument();
  });
});

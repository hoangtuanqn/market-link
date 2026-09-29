import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import NotificationApi from '@/api-requests/notification.requests';
import NotificationSettingsCard from './NotificationSettingsCard';

vi.mock('@/api-requests/notification.requests', () => ({
  default: { getPreferences: vi.fn(), savePreferences: vi.fn(), sendTest: vi.fn() },
}));

describe('NotificationSettingsCard', () => {
  /** FR-042: the server sends a customer / farmer the order and favorite categories too; none may show a raw key. */
  it('names every category the server returns for a customer or farmer', async () => {
    const categories = ['messages', 'announcements', 'account', 'orders', 'favorites'].map((category) => ({
      category,
      inApp: true,
      browser: true,
    }));
    vi.mocked(NotificationApi.getPreferences).mockResolvedValue({
      data: { categories, sound: true, quietOn: false, quietFrom: '22:00', quietTo: '07:00' },
    } as Awaited<ReturnType<typeof NotificationApi.getPreferences>>);

    render(<NotificationSettingsCard />);

    expect(await screen.findByText('Orders')).toBeInTheDocument();
    expect(screen.getByText('Favorites')).toBeInTheDocument();
    expect(screen.queryByText(/notify\.settings\.groups/)).not.toBeInTheDocument();
  });
});

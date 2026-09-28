import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import NotificationSettingsCard from './NotificationSettingsCard';
import NotificationApi from '@/api-requests/notification.requests';
import type { NotificationCategoryCode } from '@/types/notification.types';

vi.mock('@/api-requests/notification.requests', () => ({
  default: { getPreferences: vi.fn(), savePreferences: vi.fn(), sendTest: vi.fn() },
}));

const ok = <T,>(data: T) => ({ success: true, message: 'OK', data, timestamp: '' }) as never;

/** Every group NotificationCategory on the server can send, across the three roles. */
const everyGroup: NotificationCategoryCode[] = [
  'messages',
  'announcements',
  'account',
  'orders',
  'favorites',
  'farmerApplications',
  'feedback',
  'qualityReports',
];

describe('NotificationSettingsCard', () => {
  /** A group without a label showed its raw i18n key ("notify.settings.groups.orders.title") in Settings. */
  it('labels every group the server sends', async () => {
    vi.mocked(NotificationApi.getPreferences).mockResolvedValue(
      ok({
        categories: everyGroup.map((category) => ({ category, inApp: true, browser: true })),
        sound: true,
        quietOn: false,
        quietFrom: '22:00',
        quietTo: '07:00',
      }),
    );

    render(<NotificationSettingsCard />);

    expect(await screen.findByText('Orders')).toBeInTheDocument();
    expect(screen.getByText('Favorites')).toBeInTheDocument();
    expect(screen.getByText('Feedback')).toBeInTheDocument();
    expect(screen.queryByText(/notify\.settings\.groups\./)).not.toBeInTheDocument();
  });
});

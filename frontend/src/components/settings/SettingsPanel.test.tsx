import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import SettingsApi from '@/api-requests/settings.requests';
import SettingsStore from '@/lib/settings';
import SettingsPanel from './SettingsPanel';

vi.mock('@/api-requests/settings.requests', () => ({
  default: { get: vi.fn(), save: vi.fn() },
}));
vi.mock('@/components/notifications/NotificationSettingsCard', () => ({ default: () => null }));
vi.mock('@/utils/notification', () => ({
  default: { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() },
}));

describe('SettingsPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /** FR-084: a save that changes neither language nor format does not remount the page, so the button must reset. */
  it('re-enables the save button after a successful save', async () => {
    const current = SettingsStore.get();
    vi.mocked(SettingsApi.save).mockResolvedValue({ data: current } as Awaited<ReturnType<typeof SettingsApi.save>>);
    render(<SettingsPanel role="customer" />);

    await userEvent.click(screen.getByRole('button', { name: 'Save settings' }));

    await waitFor(() => expect(screen.getByRole('button', { name: 'Save settings' })).toBeEnabled());
    expect(SettingsApi.save).toHaveBeenCalledTimes(1);
  });

  it('re-enables the save button after a failed save', async () => {
    vi.mocked(SettingsApi.save).mockRejectedValue(new Error('offline'));
    render(<SettingsPanel role="customer" />);

    await userEvent.click(screen.getByRole('button', { name: 'Save settings' }));

    await waitFor(() => expect(screen.getByRole('button', { name: 'Save settings' })).toBeEnabled());
  });
});

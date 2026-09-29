import { render, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import SettingsApi from '@/api-requests/settings.requests';
import i18n from '@/i18n';
import SettingsStore from '@/lib/settings';
import SettingsSync from './SettingsSync';

vi.mock('@/api-requests/settings.requests', () => ({
  default: { get: vi.fn(), save: vi.fn() },
}));
vi.mock('@/hooks/useSession', () => ({
  default: () => ({ user: { id: 7 }, isLoggedIn: true }),
}));

type GetResult = Awaited<ReturnType<typeof SettingsApi.get>>;

describe('SettingsSync', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(SettingsApi.save).mockResolvedValue({ data: null } as unknown as Awaited<
      ReturnType<typeof SettingsApi.save>
    >);
    SettingsStore.set({ language: 'vi', theme: 'dark' });
  });

  afterEach(async () => {
    SettingsStore.set({ language: 'en', theme: 'light' });
    await i18n.changeLanguage('en');
  });

  /** FR-003: an account that never saved settings keeps the visitor's language and theme after signing in. */
  it('keeps the choices on the device when the account has none saved', async () => {
    vi.mocked(SettingsApi.get).mockResolvedValue({ data: null } as GetResult);
    render(<SettingsSync>page</SettingsSync>);

    await waitFor(() => expect(SettingsApi.save).toHaveBeenCalledTimes(1));
    expect(vi.mocked(SettingsApi.save).mock.calls[0][0]).toMatchObject({ language: 'vi', theme: 'dark' });
    expect(SettingsStore.get()).toMatchObject({ language: 'vi', theme: 'dark' });
  });

  it('applies the saved account settings over the device copy', async () => {
    vi.mocked(SettingsApi.get).mockResolvedValue({
      data: { ...SettingsStore.get(), language: 'fr', theme: 'light' },
    } as GetResult);
    render(<SettingsSync>page</SettingsSync>);

    await waitFor(() => expect(SettingsStore.get().language).toBe('fr'));
    expect(SettingsStore.get().theme).toBe('light');
    expect(SettingsApi.save).not.toHaveBeenCalled();
  });
});

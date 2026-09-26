import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import DashboardShell from './DashboardShell';

const renderShellAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <DashboardShell
        badge="Admin"
        navLabel="Admin navigation"
        homeLabel="MarketLink admin home"
        home="/admin"
        nav={[]}
        context={{ mono: 'M', name: 'MarketLink', sub: 'Platform' }}
        user={{ mono: 'AD', email: 'admin@marketlink.vn', line: 'Administrator' }}
        searchId="admin-appq"
        searchPlaceholder="Search"
        accountTo="/admin/account"
      />
    </MemoryRouter>,
  );

describe('DashboardShell logo', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  /** QA E2E v2 BUG-008: on the panel home the logo looked dead. */
  it('scrolls back to the top when already on the panel home', () => {
    const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
    renderShellAt('/admin');

    fireEvent.click(screen.getByRole('link', { name: 'MarketLink admin home' }));

    expect(scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' });
  });

  it('just navigates from any other page', () => {
    const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
    renderShellAt('/admin/markets');

    fireEvent.click(screen.getByRole('link', { name: 'MarketLink admin home' }));

    expect(scrollTo).not.toHaveBeenCalled();
  });
});

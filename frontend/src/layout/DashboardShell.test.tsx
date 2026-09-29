import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import DashboardShell from './DashboardShell';
import { getGreetingPeriod } from './greeting';

const renderShellAt = (path: string, userOverrides?: { name?: string }) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <DashboardShell
        badge="Admin"
        navLabel="Admin navigation"
        homeLabel="MarketLink admin home"
        home="/admin"
        nav={[]}
        context={{ mono: 'M', name: 'MarketLink', sub: 'Platform' }}
        user={{ mono: 'AD', email: 'admin@marketlink.vn', line: 'Administrator', ...userOverrides }}
        accountTo="/admin/account"
      />
    </MemoryRouter>,
  );

describe('DashboardShell logo', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

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

  it('toggles sidebar fold state when fold button is clicked', () => {
    renderShellAt('/admin');

    const toggleBtn = screen.getByTitle(/collapse/i);
    expect(toggleBtn).toBeInTheDocument();

    fireEvent.click(toggleBtn);
    expect(screen.getByTitle(/expand/i)).toBeInTheDocument();
  });
});

describe('DashboardShell controls', () => {
  it('offers no control without an action behind it', () => {
    renderShellAt('/admin');

    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /change which market/i })).not.toBeInTheDocument();
  });
});

describe('DashboardShell header greeting', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('calculates greeting period correctly across different hours', () => {
    const dateAtHour = (h: number) => new Date(2026, 8, 28, h, 30, 0);

    expect(getGreetingPeriod(dateAtHour(5))).toBe('morning');
    expect(getGreetingPeriod(dateAtHour(8))).toBe('morning');
    expect(getGreetingPeriod(dateAtHour(11))).toBe('morning');

    expect(getGreetingPeriod(dateAtHour(12))).toBe('afternoon');
    expect(getGreetingPeriod(dateAtHour(15))).toBe('afternoon');
    expect(getGreetingPeriod(dateAtHour(17))).toBe('afternoon');

    expect(getGreetingPeriod(dateAtHour(18))).toBe('evening');
    expect(getGreetingPeriod(dateAtHour(22))).toBe('evening');
    expect(getGreetingPeriod(dateAtHour(0))).toBe('evening');
    expect(getGreetingPeriod(dateAtHour(4))).toBe('evening');
  });

  it('renders time-based greeting with user name in header', () => {
    vi.setSystemTime(new Date(2026, 8, 28, 9, 0, 0));

    renderShellAt('/admin', { name: 'Hoang Tuan' });

    expect(screen.getByText(/good morning/i)).toBeInTheDocument();
    expect(screen.getByText(/, Hoang Tuan/i)).toBeInTheDocument();
  });

  it('renders evening greeting when local time is evening', () => {
    vi.setSystemTime(new Date(2026, 8, 28, 20, 0, 0));

    renderShellAt('/admin', { name: 'Admin User' });

    expect(screen.getByText(/good evening/i)).toBeInTheDocument();
    expect(screen.getByText(/, Admin User/i)).toBeInTheDocument();
  });
});

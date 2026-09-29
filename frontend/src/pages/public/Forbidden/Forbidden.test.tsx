import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it } from 'vitest';
import { USER_ROLE } from '@/constants/enums';
import Session from '@/utils/session';
import ForbiddenPage from './index';

describe('ForbiddenPage', () => {
  afterEach(() => {
    Session.clear();
  });

  it('renders forbidden copy and default home link for guests', () => {
    render(
      <MemoryRouter>
        <ForbiddenPage />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
    expect(screen.getAllByText('Back to home page').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Sign in as administrator')).toBeInTheDocument();
  });

  it('renders link to dashboard when signed in as customer', () => {
    Session.save({
      accessToken: 'token',
      user: { id: 1, email: 'customer@marketlink.vn', fullName: 'Customer', role: USER_ROLE.CUSTOMER },
    });

    render(
      <MemoryRouter>
        <ForbiddenPage />
      </MemoryRouter>,
    );

    expect(screen.getByText('Back to dashboard')).toBeInTheDocument();
  });

  it('renders link to farmer portal when signed in as farmer', () => {
    Session.save({
      accessToken: 'token',
      user: { id: 2, email: 'farmer@marketlink.vn', fullName: 'Farmer', role: USER_ROLE.FARMER },
    });

    render(
      <MemoryRouter>
        <ForbiddenPage />
      </MemoryRouter>,
    );

    expect(screen.getByText('Back to farmer portal')).toBeInTheDocument();
  });
});

import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Session from '@/utils/session';
import ChangePasswordPage from './index';

vi.mock('@/utils/session', () => ({
  default: {
    getUser: vi.fn(),
    clear: vi.fn(),
  },
}));

describe('ChangePasswordPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(Session.getUser).mockReturnValue({
      id: 1,
      email: 'customer@example.com',
      fullName: 'Customer Test',
      role: 'CUSTOMER',
    } as unknown as ReturnType<typeof Session.getUser>);
  });

  it('renders change password card with fields and actions', () => {
    render(
      <MemoryRouter>
        <ChangePasswordPage />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
    expect(screen.getByLabelText(/^current/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^new password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^repeat/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /change password/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
  });
});

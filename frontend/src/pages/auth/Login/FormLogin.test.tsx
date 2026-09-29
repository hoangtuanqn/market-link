import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AxiosError, AxiosHeaders } from 'axios';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import AuthApi from '@/api-requests/auth.requests';
import FormAdminLogin from '@/pages/admin/Login/FormAdminLogin';
import Notification from '@/utils/notification';
import FormLogin from './FormLogin';

vi.mock('@/api-requests/auth.requests', () => ({ default: { login: vi.fn() } }));
vi.mock('@/utils/notification', () => ({
  default: { error: vi.fn(), success: vi.fn(), info: vi.fn(), warning: vi.fn() },
}));

const locked = (retryAfter: string) =>
  new AxiosError('failed', '429', undefined, undefined, {
    status: 429,
    statusText: '',
    headers: { 'retry-after': retryAfter },
    config: { headers: new AxiosHeaders() },
    data: { success: false, message: 'server text', data: null, error: { code: 'LOGIN_LOCKED', details: [] } },
  });

const submit = async (passwordLabel: RegExp) => {
  await userEvent.type(screen.getByLabelText(/email/i), 'lan@example.com');
  await userEvent.type(screen.getByLabelText(passwordLabel), 'wrong-pass');
  await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));
};

beforeEach(() => {
  vi.mocked(AuthApi.login).mockReset();
  vi.mocked(Notification.error).mockReset();
});
afterEach(cleanup);

describe('sign-in lock', () => {
  it('the Customer/Farmer form says how many minutes to wait', async () => {
    vi.mocked(AuthApi.login).mockRejectedValue(locked('840'));
    render(
      <MemoryRouter>
        <FormLogin />
      </MemoryRouter>,
    );

    await submit(/^password/i);

    expect(Notification.error).toHaveBeenCalledWith({
      text: 'Too many failed sign-in attempts. Try again in 14 minutes.',
    });
  });

  it('the admin form says how many minutes to wait', async () => {
    vi.mocked(AuthApi.login).mockRejectedValue(locked('30'));
    render(
      <MemoryRouter>
        <FormAdminLogin />
      </MemoryRouter>,
    );

    await submit(/^password/i);

    expect(Notification.error).toHaveBeenCalledWith({
      text: 'Too many failed sign-in attempts. Try again in 1 minute.',
    });
  });
});

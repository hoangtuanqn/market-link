import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import MfaApi from '@/api-requests/mfa.requests';
import Session from '@/utils/session';
import AdminSetup2FAPage from './index';

vi.mock('@/api-requests/mfa.requests', () => ({
  default: { status: vi.fn(), setup: vi.fn(), enable: vi.fn() },
}));
vi.mock('@/utils/notification', () => ({ default: { error: vi.fn(), success: vi.fn(), info: vi.fn() } }));
vi.mock('@/hooks/useLogout', () => ({ default: () => vi.fn() }));
vi.mock('@/components/QrCode', () => ({ default: () => null }));

const admin = { id: 1, email: 'admin@marketlink.vn', fullName: 'Admin', role: 'admin' } as never;

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  Session.save({ accessToken: 'password-only-token', user: admin }, false);
  vi.mocked(MfaApi.status).mockResolvedValue({
    data: { enabled: false, setupRequired: true, recoveryCodesLeft: 0 },
  } as never);
  vi.mocked(MfaApi.setup).mockResolvedValue({
    data: { secret: 'JBSWY3DPEHPK3PXP', otpauthUri: 'otpauth://totp/x' },
  } as never);
});
afterEach(cleanup);

describe('Setup2FA', () => {
  it('keeps the session going on the token the enable call returns', async () => {
    vi.mocked(MfaApi.enable).mockResolvedValue({
      data: { codes: ['aaaa-bbbb-cccc'], accessToken: 'token-after-2fa' },
    } as never);
    render(
      <MemoryRouter>
        <AdminSetup2FAPage />
      </MemoryRouter>,
    );

    await userEvent.type(await screen.findByLabelText('Six-digit code'), '123456');
    await userEvent.click(screen.getByRole('button', { name: 'Confirm' }));

    expect(await screen.findByText('aaaa-bbbb-cccc')).toBeInTheDocument();
    expect(Session.getAccessToken()).toBe('token-after-2fa');
    expect(sessionStorage.getItem('access_token')).toBe('token-after-2fa');
  });
});

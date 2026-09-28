import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AxiosError, AxiosHeaders } from 'axios';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import AuthApi from '@/api-requests/auth.requests';
import SignupStore from '@/lib/signup';
import Session from '@/utils/session';
import VerifyEmailPage from './index';

vi.mock('@/api-requests/auth.requests', () => ({
  default: { verifySignup: vi.fn(), resendSignupCode: vi.fn() },
}));
vi.mock('@/utils/session', () => ({ default: { save: vi.fn() } }));

const apiError = (status: number, code: string, details: { field: string; message: string }[] = [], headers = {}) =>
  new AxiosError('failed', String(status), undefined, undefined, {
    status,
    statusText: '',
    headers,
    config: { headers: new AxiosHeaders() },
    data: { success: false, message: 'x', data: null, error: { code, details } },
  });

const park = (resendInMs = 60_000) =>
  SignupStore.setPending({
    email: 'lan@example.com',
    token: 'tok-1',
    codeExpiresAt: Date.now() + 600_000,
    resendAt: Date.now() + resendInMs,
  });

const renderAt = () =>
  render(
    <MemoryRouter initialEntries={['/register/verify']}>
      <Routes>
        <Route path="/register/verify" element={<VerifyEmailPage />} />
        <Route path="/register/customer" element={<p>the form</p>} />
        <Route path="/" element={<p>home</p>} />
      </Routes>
    </MemoryRouter>,
  );

beforeEach(() => {
  sessionStorage.clear();
  vi.mocked(AuthApi.verifySignup).mockReset();
  vi.mocked(AuthApi.resendSignupCode).mockReset();
  vi.mocked(Session.save).mockReset();
});
afterEach(cleanup);

describe('VerifyEmail', () => {
  /** Review Focus #5. */
  it('redirects to the form when nothing is pending', () => {
    renderAt();
    expect(screen.getByText('the form')).toBeInTheDocument();
  });

  /** Review Focus #5. */
  it('survives a reload: the address comes back from this tab', () => {
    park();
    renderAt();
    expect(screen.getByText('lan@example.com')).toBeInTheDocument();
  });

  it('the right code signs in and goes home', async () => {
    park();
    vi.mocked(AuthApi.verifySignup).mockResolvedValue({
      success: true,
      message: 'Account created.',
      data: { accessToken: 'a', user: { id: 1 } },
    } as never);
    renderAt();

    await userEvent.type(screen.getByLabelText('Six-digit code'), '482917');

    expect(AuthApi.verifySignup).toHaveBeenCalledWith({
      email: 'lan@example.com',
      code: '482917',
      signupToken: 'tok-1',
    });
    expect(Session.save).toHaveBeenCalled();
    expect(await screen.findByText('home')).toBeInTheDocument();
    expect(SignupStore.getPending()).toBeNull();
  });

  it('a wrong code says how many tries are left and clears the boxes', async () => {
    park();
    // Answer after a moment, like a real request: the boxes are disabled while it is on its way
    vi.mocked(AuthApi.verifySignup).mockImplementation(
      () =>
        new Promise((_, reject) =>
          setTimeout(() => reject(apiError(400, 'SIGNUP_CODE_INVALID', [{ field: 'attemptsLeft', message: '3' }])), 50),
        ),
    );
    renderAt();
    const input = screen.getByLabelText('Six-digit code');

    await userEvent.type(input, '111111');
    // jsdom lets a disabled input take focus; a browser does not. Record whether each focus() lands on an enabled box.
    const focusedEnabled: boolean[] = [];
    const focus = vi.spyOn(HTMLElement.prototype, 'focus').mockImplementation(function (this: HTMLElement) {
      focusedEnabled.push(!(this as HTMLInputElement).disabled);
    });

    try {
      expect(await screen.findByText('That code is not right')).toBeInTheDocument();
      expect(screen.getByText(/3 tries left/)).toBeInTheDocument();
      expect(input).toHaveValue('');
      // The boxes are ready for the next try without another click
      expect(focusedEnabled).toContain(true);
    } finally {
      focus.mockRestore();
    }
  });

  it('a used-up code locks the boxes until a new code is sent', async () => {
    park(-1);
    vi.mocked(AuthApi.verifySignup).mockRejectedValue(apiError(400, 'SIGNUP_CODE_EXPIRED'));
    vi.mocked(AuthApi.resendSignupCode).mockResolvedValue({
      success: true,
      message: 'ok',
      data: {
        email: 'lan@example.com',
        codeExpiresInSeconds: 600,
        resendAvailableInSeconds: 60,
        signupToken: 'tok-1',
      },
    } as never);
    renderAt();

    await userEvent.type(screen.getByLabelText('Six-digit code'), '111111');
    expect(await screen.findByText('This code can no longer be used')).toBeInTheDocument();
    expect(screen.getByLabelText('Six-digit code')).toBeDisabled();

    await userEvent.click(screen.getByRole('button', { name: 'Send a new code' }));
    expect(AuthApi.resendSignupCode).toHaveBeenCalledWith('lan@example.com', 'tok-1');
    expect(screen.getByLabelText('Six-digit code')).toBeEnabled();
  });

  it('too many codes counts down from Retry-After', async () => {
    park(-1);
    vi.mocked(AuthApi.resendSignupCode).mockRejectedValue(apiError(429, 'RATE_LIMITED', [], { 'retry-after': '1800' }));
    renderAt();

    await userEvent.click(screen.getByRole('button', { name: 'Send a new code' }));

    expect(await screen.findByRole('button', { name: /Send a new code in 1800 seconds/ })).toBeDisabled();
  });

  it('an expired sign-up offers the form again', async () => {
    park();
    vi.mocked(AuthApi.verifySignup).mockRejectedValue(apiError(410, 'SIGNUP_EXPIRED'));
    renderAt();

    await userEvent.type(screen.getByLabelText('Six-digit code'), '111111');
    await userEvent.click(await screen.findByRole('button', { name: 'Fill in the form again' }));

    expect(screen.getByText('the form')).toBeInTheDocument();
  });
});

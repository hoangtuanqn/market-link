import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AxiosError, AxiosHeaders } from 'axios';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import AuthApi from '@/api-requests/auth.requests';
import SignupStore from '@/lib/signup';
import Notification from '@/utils/notification';
import RegisterCustomerPage from './index';

vi.mock('@/api-requests/auth.requests', () => ({ default: { register: vi.fn() } }));
vi.mock('@/utils/notification', () => ({ default: { error: vi.fn(), success: vi.fn(), warning: vi.fn() } }));
// The address block loads the country and ward lists; it has its own tests
vi.mock('@/components/address/AddressFields', () => ({ default: () => null }));
vi.mock('@/lib/address', () => ({
  validateAddress: () => ({}),
  cleanAddress: (a: unknown) => a,
  addressErrorsFrom: () => ({}),
}));

const renderForm = () =>
  render(
    <MemoryRouter initialEntries={['/register/customer']}>
      <Routes>
        <Route path="/register/customer" element={<RegisterCustomerPage />} />
        <Route path="/register/verify" element={<p>verify screen</p>} />
      </Routes>
    </MemoryRouter>,
  );

beforeEach(() => {
  sessionStorage.clear();
  vi.mocked(AuthApi.register).mockReset();
});
afterEach(cleanup);

describe('RegisterCustomer', () => {
  it('sends the language and an empty honeypot, then opens the code screen', async () => {
    vi.mocked(AuthApi.register).mockResolvedValue({
      success: true,
      message: 'sent',
      data: { email: 'lan@example.com', codeExpiresInSeconds: 600, resendAvailableInSeconds: 60, signupToken: 'tok-1' },
    } as never);
    renderForm();

    await userEvent.type(screen.getByLabelText(/full name/i), 'Lan');
    await userEvent.type(screen.getByLabelText(/^phone number/i), '0903118218');
    await userEvent.type(screen.getByLabelText(/^email/i), 'lan@example.com');
    await userEvent.type(screen.getByLabelText(/^password/i), 'secret123');
    await userEvent.type(screen.getByLabelText(/repeat password/i), 'secret123');
    await userEvent.click(screen.getByRole('checkbox'));
    await userEvent.click(screen.getByRole('button', { name: 'Create account' }));

    expect(AuthApi.register).toHaveBeenCalledWith(
      expect.objectContaining({ language: 'en', website: '', signupToken: undefined }),
    );
    expect(await screen.findByText('verify screen')).toBeInTheDocument();
    expect(SignupStore.getPending()).toMatchObject({ email: 'lan@example.com', token: 'tok-1' });
    expect(JSON.stringify(SignupStore.getDraft())).not.toContain('secret123');
  });

  it('comes back filled in after "Change email"', () => {
    SignupStore.saveDraft({
      fullName: 'Lan',
      phone: '0903118218',
      email: 'old@example.com',
      addressParts: { countryCode: 'VN' } as never,
    });
    renderForm();

    expect(screen.getByLabelText(/^email/i)).toHaveValue('old@example.com');
    expect(screen.getByLabelText(/full name/i)).toHaveValue('Lan');
  });

  const fillAndSubmit = async (email: string) => {
    await userEvent.type(screen.getByLabelText(/full name/i), 'Lan');
    await userEvent.type(screen.getByLabelText(/^phone number/i), '0903118218');
    await userEvent.clear(screen.getByLabelText(/^email/i));
    await userEvent.type(screen.getByLabelText(/^email/i), email);
    await userEvent.type(screen.getByLabelText(/^password/i), 'secret123');
    await userEvent.type(screen.getByLabelText(/repeat password/i), 'secret123');
    await userEvent.click(screen.getByRole('checkbox'));
    await userEvent.click(screen.getByRole('button', { name: 'Create account' }));
  };

  /** Final review #1: a corrected form from the same browser keeps its sign-up. */
  it('sends the token of an earlier submit for the same address', async () => {
    SignupStore.setPending({ email: 'lan@example.com', token: 'tok-1', codeExpiresAt: 0, resendAt: 0 });
    vi.mocked(AuthApi.register).mockResolvedValue({
      success: true,
      message: 'sent',
      data: { email: 'lan@example.com', codeExpiresInSeconds: 600, resendAvailableInSeconds: 42, signupToken: 'tok-1' },
    } as never);
    renderForm();

    await fillAndSubmit('Lan@Example.com');

    expect(AuthApi.register).toHaveBeenCalledWith(expect.objectContaining({ signupToken: 'tok-1' }));
  });

  it("says in the reader's language when too many codes were asked for", async () => {
    vi.mocked(AuthApi.register).mockRejectedValue(
      new AxiosError('failed', '429', undefined, undefined, {
        status: 429,
        statusText: '',
        headers: { 'retry-after': '120' },
        config: { headers: new AxiosHeaders() },
        data: { success: false, message: 'server text', data: null, error: { code: 'RATE_LIMITED', details: [] } },
      }),
    );
    renderForm();

    await fillAndSubmit('lan@example.com');

    expect(Notification.error).toHaveBeenCalledWith({
      text: 'Too many codes asked for this address or network. Try again in 2 minutes.',
    });
  });
});

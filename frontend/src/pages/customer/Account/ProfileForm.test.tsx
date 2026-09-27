import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import AuthApi from '@/api-requests/auth.requests';
import GeoApi from '@/api-requests/geo.requests';
import type { UserType } from '@/types/user.types';
import ProfileForm from './ProfileForm';

const answer = <T,>(data: T) => ({ success: true, message: '', data, timestamp: '' });

const legacy: UserType = {
  id: 2,
  email: 'an@example.com',
  fullName: 'Nguyễn Văn An',
  phone: '0900000002',
  address: '12 Le Loi, Quan 1',
  role: 'customer',
};

const structured: UserType = {
  ...legacy,
  address: '12 Lê Lợi, Phường Bến Thành, Thành phố Hồ Chí Minh',
  addressParts: { countryCode: 'VN', provinceCode: '79', wardCode: '26743', streetName: 'Lê Lợi', addressLine: '12' },
};

const renderForm = () =>
  render(
    <MemoryRouter>
      <ProfileForm />
    </MemoryRouter>,
  );

describe('ProfileForm address (FR-001)', () => {
  beforeEach(() => {
    GeoApi.resetCache();
    vi.spyOn(GeoApi, 'countries').mockResolvedValue([{ code: 'VN', name: 'Vietnam' }]);
    vi.spyOn(GeoApi, 'provinces').mockResolvedValue([
      { code: '79', name: 'Hồ Chí Minh', fullName: 'Thành phố Hồ Chí Minh' },
    ]);
    vi.spyOn(GeoApi, 'wards').mockResolvedValue([{ code: '26743', name: 'Bến Thành', fullName: 'Phường Bến Thành' }]);
    vi.spyOn(GeoApi, 'streets').mockResolvedValue([]);
  });

  afterEach(() => vi.restoreAllMocks());

  it('shows an old account its plain address and blocks saving until the address is chosen again', async () => {
    vi.spyOn(AuthApi, 'getMe').mockResolvedValue(answer(legacy));
    const updateMe = vi.spyOn(AuthApi, 'updateMe').mockResolvedValue(answer(structured));
    renderForm();

    expect(await screen.findByText(/Current address: 12 Le Loi, Quan 1/)).toBeInTheDocument();
    await screen.findByRole('option', { name: 'Hồ Chí Minh' });
    await userEvent.type(screen.getByRole('textbox', { name: /Full name/ }), ' B');
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }));

    expect(updateMe).not.toHaveBeenCalled();
    expect(screen.getByRole('combobox', { name: /Province or city/ })).toHaveAccessibleDescription(
      'Choose a province or city.',
    );

    await userEvent.selectOptions(screen.getByRole('combobox', { name: /Province or city/ }), '79');
    await screen.findByRole('option', { name: 'Bến Thành' });
    await userEvent.selectOptions(screen.getByRole('combobox', { name: /Ward or commune/ }), '26743');
    await userEvent.type(screen.getByRole('combobox', { name: /Street/ }), 'Lê Lợi');
    await userEvent.type(screen.getByRole('textbox', { name: /House number and details/ }), '12');
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }));

    expect(updateMe).toHaveBeenCalledWith({
      fullName: 'Nguyễn Văn An B',
      phone: '0900000002',
      addressParts: {
        countryCode: 'VN',
        provinceCode: '79',
        wardCode: '26743',
        streetName: 'Lê Lợi',
        addressLine: '12',
      },
    });
  });

  it('opens a structured address with every part selected and nothing to save', async () => {
    vi.spyOn(AuthApi, 'getMe').mockResolvedValue(answer(structured));
    renderForm();

    await screen.findByRole('option', { name: 'Bến Thành' });
    expect(screen.getByRole('combobox', { name: /Ward or commune/ })).toHaveValue('26743');
    expect(screen.getByRole('combobox', { name: /Street/ })).toHaveValue('Lê Lợi');
    expect(screen.queryByText(/Current address/)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeDisabled();
  });
});

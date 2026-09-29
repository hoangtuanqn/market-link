import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import GeoApi from '@/api-requests/geo.requests';
import { emptyAddress, type AddressErrors, type AddressParts } from '@/types/address.types';
import AddressFields from './AddressFields';

type HarnessProps = {
  initial?: AddressParts;
  errors?: AddressErrors;
  lockCountry?: boolean;
  legacyAddress?: string;
};

/** Holds the value like a form would and prints it, so a test can read what the form would send. */
const Harness = ({ initial = emptyAddress(), ...rest }: HarnessProps) => {
  const [value, setValue] = useState<AddressParts>(initial);
  return (
    <>
      <AddressFields idPrefix="addr" value={value} onChange={setValue} {...rest} />
      <output data-testid="value">{JSON.stringify(value)}</output>
    </>
  );
};

const valueOf = () => JSON.parse(screen.getByTestId('value').textContent ?? '{}') as AddressParts;

describe('AddressFields (FR-001, FR-073)', () => {
  beforeEach(() => {
    GeoApi.resetCache();
    vi.spyOn(GeoApi, 'countries').mockResolvedValue([
      { code: 'JP', name: 'Japan' },
      { code: 'VN', name: 'Vietnam' },
    ]);
    vi.spyOn(GeoApi, 'provinces').mockResolvedValue([
      { code: '01', name: 'Hà Nội', fullName: 'Thành phố Hà Nội' },
      { code: '79', name: 'Hồ Chí Minh', fullName: 'Thành phố Hồ Chí Minh' },
    ]);
    vi.spyOn(GeoApi, 'wards').mockImplementation(async (code) =>
      code === '79'
        ? [
            { code: '26743', name: 'Bến Thành', fullName: 'Phường Bến Thành' },
            { code: '26737', name: 'Tân Định', fullName: 'Phường Tân Định' },
          ]
        : [{ code: '00004', name: 'Ba Đình', fullName: 'Phường Ba Đình' }],
    );
    vi.spyOn(GeoApi, 'streets').mockResolvedValue([]);
  });

  afterEach(() => vi.restoreAllMocks());

  it('opens in Vietnam with the ward locked until a province is chosen', async () => {
    render(<Harness />);

    expect(await screen.findByRole('option', { name: 'Hồ Chí Minh' })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: /Country/ })).toHaveValue('VN');
    expect(screen.getByRole('combobox', { name: /Ward or commune/ })).toBeDisabled();
    expect(screen.getByText('Choose the province first.')).toBeInTheDocument();
  });

  it('loads the wards of the chosen province', async () => {
    render(<Harness />);
    await screen.findByRole('option', { name: 'Hồ Chí Minh' });

    await userEvent.selectOptions(screen.getByRole('combobox', { name: /Province or city/ }), '79');

    expect(await screen.findByRole('option', { name: 'Bến Thành' })).toBeInTheDocument();
    expect(GeoApi.wards).toHaveBeenCalledWith('79');
    expect(screen.getByRole('combobox', { name: /Ward or commune/ })).toBeEnabled();
  });

  it('clears the ward and street when the province changes', async () => {
    render(
      <Harness
        initial={{ countryCode: 'VN', provinceCode: '79', wardCode: '26743', streetName: 'Lê Lợi', addressLine: '12' }}
      />,
    );
    await screen.findByRole('option', { name: 'Bến Thành' });

    await userEvent.selectOptions(screen.getByRole('combobox', { name: /Province or city/ }), '01');

    expect(valueOf()).toEqual({ countryCode: 'VN', provinceCode: '01', addressLine: '12' });
    expect(screen.getByRole('combobox', { name: /Street/ })).toHaveValue('');
  });

  it('switches to typed region and city abroad, dropping the Vietnamese parts', async () => {
    render(
      <Harness
        initial={{ countryCode: 'VN', provinceCode: '79', wardCode: '26743', streetName: 'Lê Lợi', addressLine: '12' }}
      />,
    );
    await screen.findByRole('option', { name: 'Japan' });

    await userEvent.selectOptions(screen.getByRole('combobox', { name: /Country/ }), 'JP');

    expect(valueOf()).toEqual({ countryCode: 'JP' });
    expect(screen.queryByRole('combobox', { name: /Province or city/ })).not.toBeInTheDocument();
    await userEvent.type(screen.getByRole('textbox', { name: /State or province/ }), 'Tokyo');
    await userEvent.type(screen.getByRole('textbox', { name: /City/ }), 'Shibuya');
    await userEvent.type(screen.getByRole('textbox', { name: /House number and details/ }), '1-2-3');
    expect(valueOf()).toEqual({ countryCode: 'JP', regionName: 'Tokyo', cityName: 'Shibuya', addressLine: '1-2-3' });
  });

  it('names provinces and wards without their prefix, so typing a letter jumps to them', async () => {
    render(
      <Harness
        initial={{ countryCode: 'VN', provinceCode: '79', wardCode: '26743', streetName: 'Lê Lợi', addressLine: '12' }}
      />,
    );

    expect(await screen.findByRole('option', { name: 'Bến Thành' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Hồ Chí Minh' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Phường Bến Thành' })).not.toBeInTheDocument();
  });

  it('offers a retry when the countries fail to load, and keeps the list locked until then', async () => {
    vi.mocked(GeoApi.countries).mockRejectedValueOnce(new Error('offline'));
    render(<Harness />);

    const retry = await screen.findByRole('button', { name: 'Try again' });
    expect(screen.getByRole('combobox', { name: /Country/ })).toBeDisabled();
    await userEvent.click(retry);

    expect(await screen.findByRole('option', { name: 'Japan' })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: /Country/ })).toBeEnabled();
  });

  it('lists Vietnam first and names countries in the reader’s language', async () => {
    render(<Harness />);
    await screen.findByRole('option', { name: 'Japan' });

    const options = screen.getAllByRole('option').map((o) => o.textContent);
    expect(options.indexOf('Vietnam')).toBeLessThan(options.indexOf('Japan'));
  });

  it('keeps the country fixed to Vietnam for a market', async () => {
    render(<Harness lockCountry />);
    await screen.findByRole('option', { name: 'Hồ Chí Minh' });

    expect(screen.getByRole('combobox', { name: /Country/ })).toBeDisabled();
    expect(screen.getByRole('combobox', { name: /Country/ })).toHaveValue('VN');
  });

  it('shows each error under its own field', async () => {
    render(<Harness errors={{ wardCode: 'Choose a ward or commune.', streetName: 'Enter the street.' }} />);
    await screen.findByRole('option', { name: 'Hồ Chí Minh' });

    expect(screen.getByRole('combobox', { name: /Ward or commune/ })).toHaveAccessibleDescription(
      'Choose a ward or commune.',
    );
    expect(screen.getByRole('combobox', { name: /Street/ })).toHaveAccessibleDescription('Enter the street.');
  });

  it('shows the address an old account had before addresses had parts', async () => {
    render(<Harness legacyAddress="12 Le Loi, Quan 1" />);

    expect(await screen.findByText(/Current address: 12 Le Loi, Quan 1/)).toBeInTheDocument();
  });

  it('offers a retry when the provinces fail to load', async () => {
    vi.mocked(GeoApi.provinces).mockRejectedValueOnce(new Error('offline'));
    render(<Harness />);

    await userEvent.click(await screen.findByRole('button', { name: 'Try again' }));

    await waitFor(() => expect(GeoApi.provinces).toHaveBeenCalledTimes(2));
    expect(await screen.findByRole('option', { name: 'Hồ Chí Minh' })).toBeInTheDocument();
  });
});

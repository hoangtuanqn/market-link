import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import GeoApi from '@/api-requests/geo.requests';
import StreetCombobox from './StreetCombobox';

const Harness = ({ provinceCode = '79', onValue }: { provinceCode?: string; onValue?: (v: string) => void }) => {
  const [value, setValue] = useState('');
  return (
    <>
      <StreetCombobox
        id="street"
        label="Street"
        provinceCode={provinceCode}
        value={value}
        onChange={(next) => {
          setValue(next);
          onValue?.(next);
        }}
      />
      <button type="button">elsewhere</button>
    </>
  );
};

describe('StreetCombobox (FR-001)', () => {
  afterEach(() => vi.restoreAllMocks());

  it('suggests streets of the province for what was typed', async () => {
    const streets = vi.spyOn(GeoApi, 'streets').mockResolvedValue(['Lê Lợi', 'Lê Lai']);
    render(<Harness />);

    await userEvent.type(screen.getByRole('combobox', { name: 'Street' }), 'le l');

    expect(await screen.findByRole('option', { name: 'Lê Lợi' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Lê Lai' })).toBeInTheDocument();
    expect(streets).toHaveBeenLastCalledWith('79', 'le l');
  });

  it('picks the highlighted suggestion with the keyboard', async () => {
    vi.spyOn(GeoApi, 'streets').mockResolvedValue(['Lê Lợi', 'Lê Lai']);
    const onValue = vi.fn();
    render(<Harness onValue={onValue} />);
    const box = screen.getByRole('combobox', { name: 'Street' });

    await userEvent.type(box, 'le l');
    await screen.findByRole('option', { name: 'Lê Lợi' });
    await userEvent.keyboard('{ArrowDown}{Enter}');

    expect(box).toHaveValue('Lê Lợi');
    expect(onValue).toHaveBeenLastCalledWith('Lê Lợi');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('offers to keep a street that is not in the list, and keeps it on blur', async () => {
    vi.spyOn(GeoApi, 'streets').mockResolvedValue(['Hẻm Chùa']);
    render(<Harness />);
    const box = screen.getByRole('combobox', { name: 'Street' });

    await userEvent.type(box, 'Đường Mới 5');

    expect(await screen.findByRole('option', { name: 'Use “Đường Mới 5”' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'elsewhere' }));
    expect(box).toHaveValue('Đường Mới 5');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('snaps text typed without diacritics to the matching street on blur', async () => {
    vi.spyOn(GeoApi, 'streets').mockResolvedValue(['Lê Lợi', 'Lê Lai']);
    const onValue = vi.fn();
    render(<Harness onValue={onValue} />);
    const box = screen.getByRole('combobox', { name: 'Street' });

    await userEvent.type(box, 'le loi');
    await screen.findByRole('option', { name: 'Lê Lợi' });
    await userEvent.click(screen.getByRole('button', { name: 'elsewhere' }));

    expect(box).toHaveValue('Lê Lợi');
    expect(onValue).toHaveBeenLastCalledWith('Lê Lợi');
  });

  it('does not offer the typed text again when it matches a suggestion', async () => {
    vi.spyOn(GeoApi, 'streets').mockResolvedValue(['Lê Lợi']);
    render(<Harness />);

    await userEvent.type(screen.getByRole('combobox', { name: 'Street' }), 'Lê Lợi');

    await screen.findByRole('option', { name: 'Lê Lợi' });
    expect(screen.queryByRole('option', { name: /Use/ })).not.toBeInTheDocument();
  });

  it('still takes typing when suggestions fail to load', async () => {
    vi.spyOn(GeoApi, 'streets').mockRejectedValue(new Error('offline'));
    render(<Harness />);
    const box = screen.getByRole('combobox', { name: 'Street' });

    await userEvent.type(box, 'Lê Lợi');

    await waitFor(() => expect(GeoApi.streets).toHaveBeenCalled());
    expect(box).toHaveValue('Lê Lợi');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('asks nothing without a province', async () => {
    const streets = vi.spyOn(GeoApi, 'streets').mockResolvedValue([]);
    render(<Harness provinceCode="" />);

    await userEvent.type(screen.getByRole('combobox', { name: 'Street' }), 'le');

    await new Promise((r) => setTimeout(r, 300));
    expect(streets).not.toHaveBeenCalled();
  });
});

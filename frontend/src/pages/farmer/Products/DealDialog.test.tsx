import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import DealDialog from './DealDialog';
import DealApi, { type DailyStockDto } from '@/api-requests/deal.requests';
import type { ProductType } from '@/types/product.types';

vi.mock('@/api-requests/deal.requests', async (importOriginal) => {
  const real = await importOriginal<typeof import('@/api-requests/deal.requests')>();
  return { ...real, default: { pickupDays: vi.fn(), post: vi.fn() } };
});

/** Spec §4.5.3 example: 7 days of shelf life, $0.60 a kg. */
const tomato: ProductType = {
  id: 7,
  name: 'Cà chua bi',
  stall: 'Nông trại Hoa Đà Lạt',
  marketName: '',
  category: 'Fruits',
  price: 0.6,
  unit: 'kg',
  stock: 30,
  status: 'available',
  shelfLifeDays: 7,
  nextDate: '2026-10-01',
};

const day = (stockDate: string, quantityAvailable = 30): DailyStockDto => ({
  productId: 7,
  stockDate,
  quantityAvailable,
  unitPrice: 0.6,
  listPrice: null,
  discountPercent: null,
  packedOn: null,
  bestBefore: null,
});

const renderDialog = (onPosted = vi.fn()) =>
  render(<DealDialog product={tomato} onClose={vi.fn()} onPosted={onPosted} />);

beforeEach(() => {
  // Today is Wed 30/09/2026; only Date is faked, so user-event's timers still run
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 8, 30, 10, 0));
  HTMLDialogElement.prototype.showModal = vi.fn(function (this: HTMLDialogElement) {
    this.open = true;
  });
  HTMLDialogElement.prototype.close = vi.fn(function (this: HTMLDialogElement) {
    this.open = false;
  });
  vi.mocked(DealApi.pickupDays).mockResolvedValue([day('2026-10-01'), day('2026-10-03')]);
  vi.mocked(DealApi.post).mockReset();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('DealDialog', () => {
  /** Harvested 29/09, picked up Sat 03/10 → good until end of Mon 05/10, 3 days left, 20% suggested. */
  it('works out until when the batch stays good and suggests the discount', async () => {
    renderDialog();
    await userEvent.selectOptions(await screen.findByLabelText('Pickup day'), '2026-10-03');
    fireEvent.change(screen.getByLabelText('Harvested or packed on'), { target: { value: '2026-09-29' } });

    expect(
      screen.getByText('Good until end of Mon 05/10 · the customer has 3 days (shelf life 7 days)'),
    ).toBeInTheDocument();
    expect(screen.getByText('Suggested 20%')).toBeInTheDocument();
    expect(screen.getByText('20%')).toBeInTheDocument();
    expect(screen.getByText('$0.60 / kg → $0.48 / kg')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Post deal' })).toBeEnabled();
  });

  /** Packed today for pickup tomorrow: 6 of 7 days still left, so the deal is refused, with the reason. */
  it('keeps posting closed for produce with more than half its shelf life left, and says why', async () => {
    renderDialog();
    fireEvent.change(await screen.findByLabelText('Harvested or packed on'), { target: { value: '2026-09-30' } });

    expect(
      screen.getByText(
        'More than half of its 7-day shelf life is left on that day. Deals are only for produce past half its shelf life.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Post deal' })).toBeDisabled();
  });

  it('asks for the packing date before it can post', async () => {
    renderDialog();

    expect(await screen.findByText('Enter the harvest or packing date.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Post deal' })).toBeDisabled();
  });

  it('posts the quantity, the packing date and the discount for the chosen day', async () => {
    const onPosted = vi.fn();
    const saved: DailyStockDto = {
      ...day('2026-10-03', 12),
      unitPrice: 0.45,
      listPrice: 0.6,
      discountPercent: 25,
      packedOn: '2026-09-29',
      bestBefore: '2026-10-05',
    };
    vi.mocked(DealApi.post).mockResolvedValue(saved);
    renderDialog(onPosted);

    await userEvent.selectOptions(await screen.findByLabelText('Pickup day'), '2026-10-03');
    const quantity = screen.getByLabelText('Quantity you bring (kg)');
    await userEvent.clear(quantity);
    await userEvent.type(quantity, '12');
    fireEvent.change(screen.getByLabelText('Harvested or packed on'), { target: { value: '2026-09-29' } });
    await userEvent.click(screen.getByRole('button', { name: 'Raise the discount' }));
    await userEvent.click(screen.getByRole('button', { name: 'Post deal' }));

    expect(DealApi.post).toHaveBeenCalledWith(7, '2026-10-03', {
      quantityAvailable: 12,
      packedOn: '2026-09-29',
      discountPercent: 25,
    });
    expect(onPosted).toHaveBeenCalledWith(saved);
  });

  it('says so when no pickup day is open in the next 14 days', async () => {
    vi.mocked(DealApi.pickupDays).mockResolvedValue([]);
    renderDialog();

    expect(await screen.findByText('No pickup day open')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Post deal' })).toBeDisabled();
  });
});

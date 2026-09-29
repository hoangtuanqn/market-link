import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import FarmerProductFormPage from './index';
import CatalogApi from '@/api-requests/catalog.requests';
import ProductApi from '@/api-requests/product.requests';
import QualityReportApi from '@/api-requests/quality-report.requests';
import ShelfLifeApi from '@/api-requests/shelf-life.requests';

vi.mock('@/api-requests/catalog.requests', () => ({ default: { listCategories: vi.fn() } }));
vi.mock('@/api-requests/product.requests', () => ({
  default: {
    getMine: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    setStatus: vi.fn(),
    remove: vi.fn(),
    uploadProductImage: vi.fn(),
  },
}));
vi.mock('@/api-requests/quality-report.requests', () => ({ default: { standing: vi.fn() } }));
vi.mock('@/api-requests/shelf-life.requests', () => ({ default: { forCategory: vi.fn() } }));

const renderNew = () =>
  render(
    <MemoryRouter initialEntries={['/farmer/products/new']}>
      <Routes>
        <Route path="/farmer/products/new" element={<FarmerProductFormPage />} />
      </Routes>
    </MemoryRouter>,
  );

const renderEdit = () =>
  render(
    <MemoryRouter initialEntries={['/farmer/products/5']}>
      <Routes>
        <Route path="/farmer/products/:id" element={<FarmerProductFormPage />} />
      </Routes>
    </MemoryRouter>,
  );

beforeEach(() => {
  vi.mocked(CatalogApi.listCategories).mockResolvedValue([
    { id: 1, name: 'Vegetables', slug: 'vegetables', minShelfLifeDays: 1, maxShelfLifeDays: 7 },
  ] as never);
  vi.mocked(ProductApi.create).mockReset();
  vi.mocked(ShelfLifeApi.forCategory).mockResolvedValue([
    {
      groupName: 'Leafy greens',
      examples: 'rau muống, lettuce',
      modes: [
        { guideId: 11, storageMode: 'room', suggestedDays: 1, peerMedianDays: null, peerCount: 0 },
        { guideId: 12, storageMode: 'chilled', suggestedDays: 3, peerMedianDays: 3, peerCount: 4 },
      ],
    },
    {
      groupName: 'Roots and bulbs',
      examples: 'cà rốt, carrot',
      modes: [{ guideId: 21, storageMode: 'room', suggestedDays: 14, peerMedianDays: null, peerCount: 0 }],
    },
  ] as never);
  vi.mocked(ProductApi.create).mockResolvedValue({ id: 5, name: 'Rau muống', status: 'available' } as never);
  vi.mocked(QualityReportApi.standing).mockResolvedValue({
    activeViolations: 0,
    limit: 3,
    windowDays: 90,
    extensionLockedUntil: null,
  });
  vi.mocked(ProductApi.update).mockReset();
});

describe('FarmerProductFormPage', () => {
  const locked = () =>
    vi.mocked(QualityReportApi.standing).mockResolvedValue({
      activeViolations: 3,
      limit: 3,
      windowDays: 90,
      extensionLockedUntil: '2026-11-15T03:00:00Z',
    });

  it('keeps the decimal point while the price is typed', async () => {
    renderNew();
    const price = await screen.findByLabelText(/^Price/);

    await userEvent.type(price, '1.50');

    expect(price).toHaveValue('1.50');
    expect(screen.getByText(/Shown as \$1\.50/)).toBeInTheDocument();
  });

  it('asks for the decimal keypad', async () => {
    renderNew();

    expect(await screen.findByLabelText(/^Price/)).toHaveAttribute('inputmode', 'decimal');
  });

  it('keeps a negative price and quantity and refuses to save them', async () => {
    renderNew();
    const price = await screen.findByLabelText(/^Price/);
    const qty = screen.getByLabelText(/^Quantity/);

    await userEvent.type(price, '-1');
    await userEvent.type(qty, '-1');
    expect(price).toHaveValue('-1');
    expect(qty).toHaveValue('-1');

    await userEvent.click(screen.getByRole('button', { name: /Add product/ }));
    expect(screen.getByText('Price must be greater than 0.')).toBeInTheDocument();
    expect(screen.getByText(/Quantity must be 0 or more/)).toBeInTheDocument();
    expect(ProductApi.create).not.toHaveBeenCalled();
  });

  it('reads a comma as the decimal point', async () => {
    renderNew();
    const price = await screen.findByLabelText(/^Price/);

    await userEvent.type(price, '1,50');

    expect(screen.getByText(/Shown as \$1\.50/)).toBeInTheDocument();
  });

  it('suggests the days of the group matched from the name', async () => {
    renderNew();
    await userEvent.type(await screen.findByLabelText(/^Product name/), 'Cà rốt Đà Lạt');

    expect(await screen.findByDisplayValue('Roots and bulbs')).toBeInTheDocument();
    expect(screen.getByRole('status', { name: /shelf life/i })).toHaveTextContent('14 days');
  });

  it('jumps to the suggestion of the way of keeping that is picked', async () => {
    renderNew();
    await userEvent.click(await screen.findByLabelText(/Fridge 0–5 °C · suggested 3 days/));

    expect(screen.getByRole('status', { name: /shelf life/i })).toHaveTextContent('3 days');
    expect(screen.getByText('Other stalls usually set 3 days')).toBeInTheDocument();
  });

  it('asks for the promise before saving a longer shelf life', async () => {
    renderNew();
    await userEvent.type(await screen.findByLabelText(/^Product name/), 'Rau muống');
    await userEvent.type(screen.getByLabelText(/^Price/), '0.5');
    await userEvent.type(screen.getByLabelText(/^Quantity/), '10');
    await userEvent.click(screen.getByLabelText(/Fridge 0–5 °C · suggested 3 days/));
    await userEvent.click(screen.getByRole('button', { name: 'One day more' }));

    expect(screen.getByText(/1 day longer than suggested/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Add product/ })).toBeDisabled();
    expect(screen.getByText('Tick the promise above to save.')).toBeInTheDocument();

    await userEvent.click(screen.getByLabelText(/I promise this still keeps well for 4 days/));
    await userEvent.click(screen.getByRole('button', { name: /Add product/ }));

    expect(ProductApi.create).toHaveBeenCalledWith(
      expect.objectContaining({
        shelfLifeDays: 4,
        shelfLifeGuideId: 12,
        storageMode: 'chilled',
        acknowledgeLongerShelfLife: true,
      }),
    );
  });

  it('sends the Farmer to the weekly stock after adding a product', async () => {
    render(
      <MemoryRouter initialEntries={['/farmer/products/new']}>
        <Routes>
          <Route path="/farmer/products/new" element={<FarmerProductFormPage />} />
          <Route path="/farmer/stock" element={<p>Weekly stock page</p>} />
        </Routes>
      </MemoryRouter>,
    );
    await userEvent.type(await screen.findByLabelText(/^Product name/), 'Rau muống');
    await userEvent.type(screen.getByLabelText(/^Price/), '0.5');
    await userEvent.type(screen.getByLabelText(/^Quantity/), '10');
    expect(screen.getByText(/Customers order from your weekly stock/)).toBeInTheDocument();
    await userEvent.click(screen.getByLabelText(/Fridge 0–5 °C · suggested 3 days/));
    await userEvent.click(screen.getByRole('button', { name: /Add product/ }));

    expect(await screen.findByText('Weekly stock page')).toBeInTheDocument();
  });

  it('names a one-day suggestion in the singular', async () => {
    renderNew();
    await userEvent.click(await screen.findByLabelText(/Room temperature · suggested 1 day/));
    await userEvent.click(screen.getByRole('button', { name: 'One day more' }));

    expect(screen.getByText('1 day longer than suggested (1 day, Room temperature)')).toBeInTheDocument();
  });

  it('stops at twice the suggestion', async () => {
    renderNew();
    await userEvent.click(await screen.findByLabelText(/Room temperature · suggested 1 day/));
    const more = screen.getByRole('button', { name: 'One day more' });
    await userEvent.click(more);

    expect(screen.getByRole('status', { name: /shelf life/i })).toHaveTextContent('2 days');
    expect(more).toBeDisabled();
  });

  it('resets the group when the category changes', async () => {
    vi.mocked(CatalogApi.listCategories).mockResolvedValue([
      { id: 1, name: 'Vegetables', slug: 'vegetables', minShelfLifeDays: 1, maxShelfLifeDays: 7 },
      { id: 2, name: 'Fruits', slug: 'fruits', minShelfLifeDays: 2, maxShelfLifeDays: 14 },
    ] as never);
    renderNew();
    await userEvent.click(await screen.findByLabelText(/Fridge 0–5 °C · suggested 3 days/));
    vi.mocked(ShelfLifeApi.forCategory).mockResolvedValue([
      {
        groupName: 'Soft fruit',
        examples: 'chuối, banana',
        modes: [{ guideId: 31, storageMode: 'room', suggestedDays: 2, peerMedianDays: null, peerCount: 0 }],
      },
    ] as never);

    await userEvent.selectOptions(screen.getByLabelText(/^Category/), '2');

    expect(await screen.findByDisplayValue('Soft fruit')).toBeInTheDocument();
    expect(screen.getByRole('status', { name: /shelf life/i })).toHaveTextContent('2 days');
  });

  it('falls back to the category range when it has no groups', async () => {
    vi.mocked(ShelfLifeApi.forCategory).mockResolvedValue([]);
    renderNew();

    expect(
      await screen.findByText('This category has no storage groups yet. It usually keeps 1–7 days.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('status', { name: /shelf life/i })).toHaveTextContent('7 days');
  });

  it("keeps an extended product's promise when editing without changes", async () => {
    vi.mocked(ProductApi.getMine).mockResolvedValue({
      id: 5,
      name: 'Rau muống',
      categoryId: 1,
      unit: 'bunch',
      price: 0.5,
      stock: 10,
      status: 'available',
      shelfLife: {
        guideId: 12,
        groupName: 'Leafy greens',
        storageMode: 'chilled',
        days: 5,
        suggestedDays: 3,
        extended: true,
      },
    } as never);
    vi.mocked(ProductApi.update).mockResolvedValue({ id: 5, name: 'Rau muống', status: 'available' } as never);
    renderEdit();

    expect(await screen.findByLabelText(/I promise this still keeps well for 5 days/)).toBeChecked();
    await userEvent.click(screen.getByRole('button', { name: 'Save product' }));

    expect(ProductApi.update).toHaveBeenCalledWith(
      5,
      expect.objectContaining({ shelfLifeDays: 5, shelfLifeGuideId: 12, acknowledgeLongerShelfLife: true }),
    );
  });

  it('asks for another group when the saved one is gone', async () => {
    vi.mocked(ProductApi.getMine).mockResolvedValue({
      id: 5,
      name: 'Rau muống',
      categoryId: 1,
      unit: 'bunch',
      price: 0.5,
      stock: 10,
      status: 'available',
      shelfLife: {
        guideId: 99,
        groupName: 'Old group',
        storageMode: 'chilled',
        days: 5,
        suggestedDays: 3,
        extended: true,
      },
    } as never);
    vi.mocked(ProductApi.update).mockResolvedValue({ id: 5, name: 'Rau muống', status: 'available' } as never);
    renderEdit();

    expect(
      await screen.findByText('The group this product used is no longer offered. Pick another.'),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/^Storage group/)).toHaveValue('');
    expect(screen.queryByLabelText(/I promise/)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save product' })).toBeDisabled();
    expect(screen.getByText('Pick a storage group above to save.')).toBeInTheDocument();

    await userEvent.selectOptions(screen.getByLabelText(/^Storage group/), 'Leafy greens');

    expect(screen.getByRole('status', { name: /shelf life/i })).toHaveTextContent('1 day');
    expect(screen.getByRole('button', { name: 'Save product' })).toBeEnabled();
    await userEvent.click(screen.getByRole('button', { name: 'One day more' }));
    expect(screen.getByLabelText(/I promise this still keeps well for 2 days/)).not.toBeChecked();
    await userEvent.click(screen.getByRole('button', { name: 'One day less' }));
    await userEvent.click(screen.getByRole('button', { name: 'Save product' }));

    expect(ProductApi.update).toHaveBeenCalledWith(
      5,
      expect.objectContaining({
        shelfLifeGuideId: 11,
        storageMode: 'room',
        shelfLifeDays: 1,
        acknowledgeLongerShelfLife: false,
      }),
    );
  });

  it('asks for a group again when only the saved way of keeping is turned off', async () => {
    vi.mocked(ShelfLifeApi.forCategory).mockResolvedValue([
      {
        groupName: 'Leafy greens',
        examples: 'rau muống, lettuce',
        modes: [{ guideId: 11, storageMode: 'room', suggestedDays: 1, peerMedianDays: null, peerCount: 0 }],
      },
    ] as never);
    vi.mocked(ProductApi.getMine).mockResolvedValue({
      id: 5,
      name: 'Rau muống',
      categoryId: 1,
      unit: 'bunch',
      price: 0.5,
      stock: 10,
      status: 'available',
      shelfLife: {
        guideId: 12,
        groupName: 'Leafy greens',
        storageMode: 'chilled',
        days: 5,
        suggestedDays: 3,
        extended: true,
      },
    } as never);
    renderEdit();

    expect(
      await screen.findByText('The group this product used is no longer offered. Pick another.'),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText(/I promise/)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save product' })).toBeDisabled();

    await userEvent.selectOptions(screen.getByLabelText(/^Storage group/), 'Leafy greens');

    expect(screen.getByLabelText(/Room temperature · suggested 1 day/)).toBeChecked();
    expect(screen.getByRole('status', { name: /shelf life/i })).toHaveTextContent('1 day');
    expect(screen.getByRole('button', { name: 'Save product' })).toBeEnabled();
  });

  it('refuses to save a product whose saved days are now above the cap', async () => {
    vi.mocked(ProductApi.update).mockClear();
    vi.mocked(ProductApi.getMine).mockResolvedValue({
      id: 5,
      name: 'Rau muống',
      categoryId: 1,
      unit: 'bunch',
      price: 0.5,
      stock: 10,
      status: 'available',
      shelfLife: {
        guideId: 12,
        groupName: 'Leafy greens',
        storageMode: 'chilled',
        days: 7,
        suggestedDays: 4,
        extended: true,
      },
    } as never);
    renderEdit();

    await userEvent.click(await screen.findByRole('button', { name: 'Save product' }));

    expect(screen.getByText('At most 6 days for this group.')).toBeInTheDocument();
    expect(ProductApi.update).not.toHaveBeenCalled();
  });

  it('keeps Save off, and says why, when the storage groups do not load', async () => {
    vi.mocked(ShelfLifeApi.forCategory).mockRejectedValue(new Error('network'));
    renderNew();

    expect(await screen.findByText('Reload the storage groups above to save.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Add product/ })).toBeDisabled();
  });

  it('asks for the promise again when the days change after it was ticked', async () => {
    renderNew();
    await userEvent.click(await screen.findByLabelText(/Fridge 0–5 °C · suggested 3 days/));
    const more = screen.getByRole('button', { name: 'One day more' });
    await userEvent.click(more);
    await userEvent.click(screen.getByLabelText(/I promise this still keeps well for 4 days/));
    expect(screen.getByLabelText(/I promise this still keeps well for 4 days/)).toBeChecked();

    await userEvent.click(more);

    expect(screen.getByLabelText(/I promise this still keeps well for 5 days/)).not.toBeChecked();
    expect(screen.getByRole('button', { name: /Add product/ })).toBeDisabled();
    expect(screen.getByText('Tick the promise above to save.')).toBeInTheDocument();
  });

  it('gives a pre-feature product a matched group and re-checks its saved days against it', async () => {
    vi.mocked(ProductApi.getMine).mockResolvedValue({
      id: 5,
      name: 'Rau muống',
      categoryId: 1,
      unit: 'bunch',
      price: 0.5,
      stock: 10,
      status: 'available',
      shelfLife: { guideId: null, groupName: null, storageMode: 'room', days: 3, suggestedDays: null, extended: false },
    } as never);
    vi.mocked(ProductApi.update).mockResolvedValue({ id: 5, name: 'Rau muống', status: 'available' } as never);
    renderEdit();

    expect(await screen.findByDisplayValue('Leafy greens')).toBeInTheDocument();
    expect(screen.getByRole('status', { name: /shelf life/i })).toHaveTextContent('3 days');
    expect(screen.getByText(/2 days longer than suggested/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save product' })).toBeDisabled();
    expect(screen.getByText('Tick the promise above to save.')).toBeInTheDocument();

    await userEvent.click(screen.getByLabelText(/Fridge 0–5 °C · suggested 3 days/));

    expect(screen.getByRole('status', { name: /shelf life/i })).toHaveTextContent('3 days');
    expect(screen.queryByText(/longer than suggested/)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save product' })).toBeEnabled();

    await userEvent.click(screen.getByRole('button', { name: 'Save product' }));

    expect(ProductApi.update).toHaveBeenCalledWith(
      5,
      expect.objectContaining({
        shelfLifeGuideId: 12,
        storageMode: 'chilled',
        shelfLifeDays: 3,
        acknowledgeLongerShelfLife: false,
      }),
    );
  });

  it("asks for the promise again once an extended product's days are pulled down, and drops it at the suggestion", async () => {
    vi.mocked(ProductApi.getMine).mockResolvedValue({
      id: 5,
      name: 'Rau muống',
      categoryId: 1,
      unit: 'bunch',
      price: 0.5,
      stock: 10,
      status: 'available',
      shelfLife: {
        guideId: 12,
        groupName: 'Leafy greens',
        storageMode: 'chilled',
        days: 5,
        suggestedDays: 3,
        extended: true,
      },
    } as never);
    renderEdit();

    expect(await screen.findByLabelText(/I promise this still keeps well for 5 days/)).toBeChecked();
    const less = screen.getByRole('button', { name: 'One day less' });

    await userEvent.click(less);

    expect(screen.getByRole('status', { name: /shelf life/i })).toHaveTextContent('4 days');
    expect(screen.getByLabelText(/I promise this still keeps well for 4 days/)).not.toBeChecked();
    expect(screen.getByRole('button', { name: 'Save product' })).toBeDisabled();
    expect(screen.getByText('Tick the promise above to save.')).toBeInTheDocument();

    await userEvent.click(less);

    expect(screen.getByRole('status', { name: /shelf life/i })).toHaveTextContent('3 days');
    expect(screen.queryByText(/longer than suggested/)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save product' })).toBeEnabled();
  });

  it('stops at the suggestion while the stall is locked, and says until when', async () => {
    locked();
    renderNew();
    await userEvent.click(await screen.findByLabelText(/Fridge 0–5 °C · suggested 3 days/));

    expect(await screen.findByText(/can't go above the suggestion until 15\/11\/2026/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'One day more' })).toBeDisabled();
  });

  it('asks a locked stall to lower an extended product before saving', async () => {
    locked();
    vi.mocked(ProductApi.getMine).mockResolvedValue({
      id: 5,
      name: 'Rau muống',
      categoryId: 1,
      unit: 'bunch',
      price: 0.5,
      stock: 10,
      status: 'available',
      shelfLife: {
        guideId: 12,
        groupName: 'Leafy greens',
        storageMode: 'chilled',
        days: 5,
        suggestedDays: 3,
        extended: true,
      },
    } as never);
    renderEdit();

    await screen.findByText(/can't go above the suggestion until/);
    await userEvent.click(screen.getByRole('button', { name: 'Save product' }));

    expect(
      await screen.findByText("Your stall can't go above the suggestion for now. Lower it to 3 days."),
    ).toBeInTheDocument();
    expect(ProductApi.update).not.toHaveBeenCalled();
  });
});

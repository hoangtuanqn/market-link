import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AxiosError, AxiosHeaders } from 'axios';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ShelfLifeGuides from './ShelfLifeGuides';
import ShelfLifeApi from '@/api-requests/shelf-life.requests';

vi.mock('@/api-requests/shelf-life.requests', () => ({
  default: { adminList: vi.fn(), adminCreate: vi.fn(), adminUpdate: vi.fn(), adminDeactivate: vi.fn() },
}));

const categories = [
  {
    id: 1,
    name: 'Vegetables',
    slug: 'vegetables',
    sortOrder: 1,
    isActive: true,
    count: 0,
    minShelfLifeDays: 1,
    maxShelfLifeDays: 7,
  },
];
const leafy = {
  id: 12,
  categoryId: 1,
  groupName: 'Leafy greens',
  examples: 'rau muống, lettuce',
  storageMode: 'chilled' as const,
  suggestedDays: 3,
  isActive: true,
};

beforeEach(() => {
  vi.mocked(ShelfLifeApi.adminList).mockResolvedValue([leafy]);
  vi.mocked(ShelfLifeApi.adminCreate).mockReset();
  vi.mocked(ShelfLifeApi.adminUpdate).mockReset();
  vi.mocked(ShelfLifeApi.adminDeactivate).mockReset();
});

describe('ShelfLifeGuides', () => {
  it("lists the category's groups", async () => {
    render(<ShelfLifeGuides categories={categories} />);
    expect(await screen.findByText('Leafy greens')).toBeInTheDocument();
    // Scoped to the table: the add form's "How it is kept" select also has a 'Fridge 0–5 °C' option.
    expect(within(screen.getByRole('table')).getByText('Fridge 0–5 °C')).toBeInTheDocument();
  });

  it('names each row of the same group by its own way of keeping', async () => {
    const leafyRoom = { ...leafy, id: 14, storageMode: 'room' as const, suggestedDays: 5 };
    vi.mocked(ShelfLifeApi.adminList).mockResolvedValue([leafy, leafyRoom]);
    render(<ShelfLifeGuides categories={categories} />);

    // Both rows share the group name, so wait on one of the two distinct labels rather than the ambiguous group text.
    expect(await screen.findByLabelText('Days for Leafy greens (Fridge 0–5 °C)')).toBeInTheDocument();
    expect(screen.getByLabelText('Days for Leafy greens (Room temperature)')).toBeInTheDocument();
  });

  it('adds a group', async () => {
    vi.mocked(ShelfLifeApi.adminCreate).mockResolvedValue({
      ...leafy,
      id: 13,
      groupName: 'Roots and bulbs',
      storageMode: 'room',
      suggestedDays: 14,
    });
    render(<ShelfLifeGuides categories={categories} />);
    await screen.findByText('Leafy greens');

    await userEvent.type(screen.getByLabelText(/^Group name/), 'Roots and bulbs');
    await userEvent.selectOptions(screen.getByLabelText(/^How it is kept/), 'room');
    await userEvent.type(screen.getByLabelText(/^Suggested days/), '14');
    await userEvent.click(screen.getByRole('button', { name: 'Add group' }));

    expect(ShelfLifeApi.adminCreate).toHaveBeenCalledWith({
      categoryId: 1,
      groupName: 'Roots and bulbs',
      examples: '',
      storageMode: 'room',
      suggestedDays: 14,
    });
    expect(await screen.findByText('Roots and bulbs')).toBeInTheDocument();
  });

  it('says so when the group already has that way of keeping', async () => {
    vi.mocked(ShelfLifeApi.adminCreate).mockRejectedValue(
      new AxiosError('x', 'ERR', undefined, undefined, {
        status: 409,
        statusText: '',
        headers: {},
        config: { headers: new AxiosHeaders() },
        data: { success: false, error: { code: 'DUPLICATE_SHELF_LIFE_GUIDE', details: [] }, message: 'x' },
      }),
    );
    render(<ShelfLifeGuides categories={categories} />);
    await screen.findByText('Leafy greens');

    await userEvent.type(screen.getByLabelText(/^Group name/), 'Leafy greens');
    await userEvent.selectOptions(screen.getByLabelText(/^How it is kept/), 'chilled');
    await userEvent.type(screen.getByLabelText(/^Suggested days/), '3');
    await userEvent.click(screen.getByRole('button', { name: 'Add group' }));

    expect(await screen.findByText('This group already has that way of keeping.')).toBeInTheDocument();
  });

  it('turns a group off', async () => {
    vi.mocked(ShelfLifeApi.adminDeactivate).mockResolvedValue(undefined);
    render(<ShelfLifeGuides categories={categories} />);
    const row = (await screen.findByText('Leafy greens')).closest('tr')!;

    await userEvent.click(within(row).getByRole('button', { name: 'Turn off' }));

    expect(ShelfLifeApi.adminDeactivate).toHaveBeenCalledWith(12);
    expect(await within(row).findByText('Off')).toBeInTheDocument();
  });

  it('shows the empty state for a category without groups', async () => {
    vi.mocked(ShelfLifeApi.adminList).mockResolvedValue([]);
    render(<ShelfLifeGuides categories={categories} />);
    expect(await screen.findByText('No storage groups yet')).toBeInTheDocument();
  });

  it("saves a row's days", async () => {
    vi.mocked(ShelfLifeApi.adminUpdate).mockResolvedValue({ ...leafy, suggestedDays: 5 });
    render(<ShelfLifeGuides categories={categories} />);
    const row = (await screen.findByText('Leafy greens')).closest('tr')!;

    const daysInput = within(row).getByLabelText('Days for Leafy greens (Fridge 0–5 °C)');
    await userEvent.clear(daysInput);
    await userEvent.type(daysInput, '5');
    await userEvent.click(within(row).getByRole('button', { name: 'Save' }));

    expect(ShelfLifeApi.adminUpdate).toHaveBeenCalledWith(12, {
      categoryId: 1,
      groupName: 'Leafy greens',
      examples: 'rau muống, lettuce',
      storageMode: 'chilled',
      suggestedDays: 5,
    });
  });

  it('turns a row back on using its saved days, not an unsaved draft', async () => {
    const off = { ...leafy, isActive: false };
    vi.mocked(ShelfLifeApi.adminList).mockResolvedValue([off]);
    vi.mocked(ShelfLifeApi.adminUpdate).mockResolvedValue({ ...off, isActive: true });
    render(<ShelfLifeGuides categories={categories} />);
    const row = (await screen.findByText('Leafy greens')).closest('tr')!;

    const daysInput = within(row).getByLabelText('Days for Leafy greens (Fridge 0–5 °C)');
    await userEvent.clear(daysInput);
    await userEvent.type(daysInput, '9');
    await userEvent.click(within(row).getByRole('button', { name: 'Turn on' }));

    expect(ShelfLifeApi.adminUpdate).toHaveBeenCalledWith(12, {
      categoryId: 1,
      groupName: 'Leafy greens',
      examples: 'rau muống, lettuce',
      storageMode: 'chilled',
      suggestedDays: 3,
      active: true,
    });
    expect(await within(row).findByText('On')).toBeInTheDocument();
  });

  it('switches category and reloads its groups', async () => {
    const categoryTwo = {
      id: 2,
      name: 'Fruits',
      slug: 'fruits',
      sortOrder: 2,
      isActive: true,
      count: 0,
      minShelfLifeDays: 1,
      maxShelfLifeDays: 10,
    };
    const citrus = {
      id: 20,
      categoryId: 2,
      groupName: 'Citrus',
      examples: 'cam, orange',
      storageMode: 'room' as const,
      suggestedDays: 10,
      isActive: true,
    };
    vi.mocked(ShelfLifeApi.adminList).mockResolvedValueOnce([leafy]).mockResolvedValueOnce([citrus]);
    render(<ShelfLifeGuides categories={[...categories, categoryTwo]} />);
    await screen.findByText('Leafy greens');

    await userEvent.selectOptions(screen.getByLabelText('Category'), '2');

    expect(await screen.findByText('Citrus')).toBeInTheDocument();
    expect(ShelfLifeApi.adminList).toHaveBeenCalledWith(2);
  });
});

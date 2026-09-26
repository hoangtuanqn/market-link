import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import ProductPin from './ProductPin';
import { perUnit } from '@/lib/format';
import ProductApi from '@/api-requests/product.requests';

vi.mock('@/api-requests/product.requests', () => ({
  default: { get: vi.fn() },
}));

describe('ProductPin', () => {
  it('shows the product name and price', async () => {
    vi.mocked(ProductApi.get).mockResolvedValue({
      product: {
        id: 8,
        name: 'Carrot',
        description: '',
        price: 15000,
        unit: 'kg',
        category: 'veg',
        currency: 'VND',
        farmerId: 30,
        galleries: [],
        status: 'active',
        stockQuantity: 10,
        minOrder: 1,
      },
    } as unknown as Awaited<ReturnType<typeof ProductApi.get>>);

    render(
      <MemoryRouter>
        <ProductPin productId={8} />
      </MemoryRouter>,
    );

    expect(await screen.findByText('Carrot')).toBeInTheDocument();
    // The price goes through lib/format (the currency is a dev decision — USD is locked for now): compare against perUnit itself, do not hardcode the symbol
    expect(screen.getByText(perUnit(15000, 'kg'))).toBeInTheDocument();
    expect(screen.getByRole('link')).toHaveAttribute('href', '/products/8');
  });

  it('shows an error if the product is missing', async () => {
    vi.mocked(ProductApi.get).mockRejectedValue(new Error('404'));

    render(
      <MemoryRouter>
        <ProductPin productId={8} />
      </MemoryRouter>,
    );

    expect(await screen.findByText(/no longer listed/i)).toBeInTheDocument();
  });
});

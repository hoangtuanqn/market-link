import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import type { ProductType } from '@/types/product.types';
import ProductCard from './ProductCard';

const product: ProductType = {
  id: 7,
  name: 'Bưởi da xanh',
  stall: 'Trái cây Ba Tơ',
  marketName: 'Chợ Bà Chiểu',
  category: 'Trái cây',
  price: 2.4,
  unit: 'kg',
  stock: 12,
  status: 'available',
  farmerId: 6,
};

const card = () => {
  render(
    <MemoryRouter>
      <ProductCard product={product} />
    </MemoryRouter>,
  );
  return screen.getByRole('article');
};

describe('ProductCard (FR-080)', () => {
  /**
   * On a phone the card is one visual block, so the whole card opens the product — done with a stretched link rather
   * than by wrapping the card in an <a>, which would swallow the two buttons inside it and nest interactive elements.
   */
  it('opens the product from one link that covers the card', () => {
    const links = within(card()).getAllByRole('link');

    expect(links).toHaveLength(1);
    expect(links[0]).toHaveAccessibleName('Bưởi da xanh');
    expect(links[0]).toHaveAttribute('href', '/products/7');
    expect(links[0].className).toContain('after:absolute');
  });

  it('keeps the favourite and add-to-cart buttons reachable on their own', () => {
    const buttons = within(card()).getAllByRole('button');

    expect(buttons.map((b) => b.textContent || b.getAttribute('aria-label'))).toEqual(
      expect.arrayContaining([
        expect.stringContaining('Bưởi da xanh'), // favourite, labelled with the product
        expect.stringContaining('Add to cart'),
      ]),
    );
    // They sit above the stretched link; without a stacking context the link would cover them.
    for (const b of buttons) expect(b.closest('[class*="z-2"]')).not.toBeNull();
  });
});

import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import Footer from './Footer';

vi.mock('@/hooks/useSession', () => ({ default: () => ({ user: null, isLoggedIn: false }) }));

describe('Footer', () => {
  it('links the near-expiry deals page', () => {
    render(
      <MemoryRouter>
        <Footer />
      </MemoryRouter>,
    );

    expect(screen.getByRole('link', { name: 'Near-expiry deals' })).toHaveAttribute('href', '/deals');
  });
});

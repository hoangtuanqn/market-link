import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ActiveDeals from './ActiveDeals';
import DealApi from '@/api-requests/deal.requests';

vi.mock('@/api-requests/deal.requests', async (importOriginal) => {
  const real = await importOriginal<typeof import('@/api-requests/deal.requests')>();
  return { ...real, default: { mine: vi.fn(), remove: vi.fn() } };
});

describe('ActiveDeals', () => {
  it('shows a loading line before the first list resolves', () => {
    // Never resolves within the test, so the component stays on its first "loading" render.
    vi.mocked(DealApi.mine).mockReturnValue(new Promise(() => {}));

    render(<ActiveDeals version={0} />);

    expect(screen.getByRole('status')).toHaveTextContent('Loading your deals');
  });
});

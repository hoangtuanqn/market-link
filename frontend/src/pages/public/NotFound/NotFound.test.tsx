import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import NotFoundPage from './index';

describe('NotFoundPage', () => {
  it('renders 404 number, heading and home button in standalone mode', () => {
    render(
      <MemoryRouter>
        <NotFoundPage />
      </MemoryRouter>,
    );

    expect(screen.getByText('404')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
    expect(screen.getByText('Back to the home page')).toBeInTheDocument();
    expect(screen.getByText('Explore markets')).toBeInTheDocument();
  });

  it('renders inside card when standalone is false', () => {
    render(
      <MemoryRouter>
        <NotFoundPage standalone={false} />
      </MemoryRouter>,
    );

    expect(screen.getByText('404')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
  });
});

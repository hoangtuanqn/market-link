import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { describe, expect, it } from 'vitest';
import AuthLayout from './AuthLayout';

describe('AuthLayout', () => {
  it('renders child outlet and logo without header or footer', () => {
    render(
      <MemoryRouter initialEntries={['/login']}>
        <Routes>
          <Route element={<AuthLayout />}>
            <Route path="/login" element={<div data-testid="auth-card">Login Form</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByTestId('auth-card')).toBeInTheDocument();
    expect(screen.getByText('Login Form')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /marketlink/i })).toHaveAttribute('href', '/');
    expect(screen.queryByRole('contentinfo')).not.toBeInTheDocument();
  });
});

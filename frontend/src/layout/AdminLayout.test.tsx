import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import AdminFarmerApi from '@/api-requests/admin-farmer.requests';
import { USER_ROLE } from '@/constants/enums';
import type { RoleType, UserType } from '@/types/user.types';
import Session from '@/utils/session';
import AdminLayout from './AdminLayout';

const userWith = (role: RoleType): UserType => ({
  id: 1,
  email: 'admin@marketlink.vn',
  fullName: 'Market Admin',
  role,
});

const signIn = (role: RoleType) => Session.save({ accessToken: 'token', user: userWith(role) });

const renderAdminArea = () =>
  render(
    <MemoryRouter initialEntries={['/admin']}>
      <Routes>
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<p>Admin Overview</p>} />
        </Route>
        <Route path="/admin/login" element={<p>Admin Login Page</p>} />
        <Route path="/403" element={<p>403 Forbidden Page</p>} />
      </Routes>
    </MemoryRouter>,
  );

describe('AdminLayout access control (FR-004, FR-005)', () => {
  beforeEach(() => {
    vi.spyOn(AdminFarmerApi, 'list').mockResolvedValue({
      success: true,
      message: '',
      data: { items: [], total: 0, page: 1, pageSize: 1 },
      timestamp: '',
    });
  });

  afterEach(() => {
    Session.clear();
    vi.restoreAllMocks();
  });

  it('redirects an unauthenticated guest to /admin/login', () => {
    renderAdminArea();

    expect(screen.getByText('Admin Login Page')).toBeInTheDocument();
    expect(screen.queryByText('Admin Overview')).not.toBeInTheDocument();
    expect(screen.queryByText('403 Forbidden Page')).not.toBeInTheDocument();
  });

  it('redirects an authenticated Customer to /403', () => {
    signIn(USER_ROLE.CUSTOMER);
    renderAdminArea();

    expect(screen.getByText('403 Forbidden Page')).toBeInTheDocument();
    expect(screen.queryByText('Admin Overview')).not.toBeInTheDocument();
    expect(screen.queryByText('Admin Login Page')).not.toBeInTheDocument();
  });

  it('redirects an authenticated Farmer to /403', () => {
    signIn(USER_ROLE.FARMER);
    renderAdminArea();

    expect(screen.getByText('403 Forbidden Page')).toBeInTheDocument();
    expect(screen.queryByText('Admin Overview')).not.toBeInTheDocument();
    expect(screen.queryByText('Admin Login Page')).not.toBeInTheDocument();
  });

  it('allows an authenticated Admin into the admin layout', async () => {
    signIn(USER_ROLE.ADMIN);
    renderAdminArea();

    expect(await screen.findByText('Admin Overview')).toBeInTheDocument();
    expect(screen.queryByText('Admin Login Page')).not.toBeInTheDocument();
    expect(screen.queryByText('403 Forbidden Page')).not.toBeInTheDocument();
  });
});

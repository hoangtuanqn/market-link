import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import AuthApi from '@/api-requests/auth.requests';
import { USER_ROLE } from '@/constants/enums';
import type { RoleType, UserType } from '@/types/user.types';
import Session from '@/utils/session';
import RequireAuth from './RequireAuth';

const userWith = (role: RoleType): UserType => ({ id: 7, email: 'someone@marketlink.vn', fullName: 'Someone', role });

const signIn = (role: RoleType) => Session.save({ accessToken: 'token', user: userWith(role) });

/** What GET /auth/me answers: the role the server holds right now. */
const serverSays = (role: RoleType) =>
  vi.spyOn(AuthApi, 'getMe').mockResolvedValue({ success: true, message: '', data: userWith(role), timestamp: '' });

const renderFarmerArea = () =>
  render(
    <MemoryRouter initialEntries={['/farmer/products']}>
      <Routes>
        <Route element={<RequireAuth role={USER_ROLE.FARMER} />}>
          <Route path="/farmer/products" element={<p>Farmer panel</p>} />
        </Route>
        <Route path="/login" element={<p>Sign-in page</p>} />
        <Route path="/become-farmer" element={<p>Become a Farmer</p>} />
        <Route path="/admin" element={<p>Admin panel</p>} />
      </Routes>
    </MemoryRouter>,
  );

describe('RequireAuth with a role (FR-005)', () => {
  afterEach(() => {
    Session.clear();
    vi.restoreAllMocks();
  });

  it('sends a guest to the sign-in page', () => {
    renderFarmerArea();

    expect(screen.getByText('Sign-in page')).toBeInTheDocument();
    expect(screen.queryByText('Farmer panel')).not.toBeInTheDocument();
  });

  it('lets a Farmer in', () => {
    signIn(USER_ROLE.FARMER);
    renderFarmerArea();

    expect(screen.getByText('Farmer panel')).toBeInTheDocument();
  });

  it('sends a Customer to the Become a Farmer page once the server confirms the role', async () => {
    signIn(USER_ROLE.CUSTOMER);
    serverSays(USER_ROLE.CUSTOMER);
    renderFarmerArea();

    expect(await screen.findByText('Become a Farmer')).toBeInTheDocument();
    expect(screen.queryByText('Farmer panel')).not.toBeInTheDocument();
  });

  it('sends an Admin back to the admin panel', async () => {
    signIn(USER_ROLE.ADMIN);
    serverSays(USER_ROLE.ADMIN);
    renderFarmerArea();

    expect(await screen.findByText('Admin panel')).toBeInTheDocument();
  });

  /** FR-071: approved while this browser was offline — the stored user still says "customer". */
  it('lets a just-approved Farmer in when the stored role is out of date', async () => {
    signIn(USER_ROLE.CUSTOMER);
    serverSays(USER_ROLE.FARMER);
    renderFarmerArea();

    expect(await screen.findByText('Farmer panel')).toBeInTheDocument();
    expect(Session.getUser()?.role).toBe(USER_ROLE.FARMER);
  });
});

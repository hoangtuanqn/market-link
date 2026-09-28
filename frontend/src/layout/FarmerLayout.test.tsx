import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import OrderApi from '@/api-requests/order.requests';
import StallApi, { type StallDetailDto } from '@/api-requests/stall.requests';
import { USER_ROLE } from '@/constants/enums';
import type { UserType } from '@/types/user.types';
import Session from '@/utils/session';
import FarmerLayout from './FarmerLayout';

const farmer: UserType = { id: 1, email: 'farmer@marketlink.vn', fullName: 'Vuon Co Tu', role: USER_ROLE.FARMER };

const stallProfile = (approvalStatus: StallDetailDto['approvalStatus']): StallDetailDto => ({
  farmerId: 1,
  stallName: 'Vuon Co Tu',
  contactPerson: 'Co Tu',
  orderCutoffHours: 12,
  ratingAvg: 0,
  ratingCount: 0,
  approvalStatus,
  markets: [],
});

const renderFarmerArea = () =>
  render(
    <MemoryRouter initialEntries={['/farmer']}>
      <Routes>
        <Route path="/farmer" element={<FarmerLayout />}>
          <Route index element={<p>Farmer Overview</p>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );

describe('FarmerLayout menu while suspended (FR-071, D-09)', () => {
  beforeEach(() => {
    Session.save({ accessToken: 'token', user: farmer });
    vi.spyOn(OrderApi, 'farmerList').mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 1 });
  });

  afterEach(() => {
    Session.clear();
    vi.restoreAllMocks();
  });

  it('shows every section for an approved stall', async () => {
    vi.spyOn(StallApi, 'myProfile').mockResolvedValue(stallProfile('approved'));

    renderFarmerArea();

    expect(await screen.findByRole('link', { name: 'Products' })).toHaveAttribute('href', '/farmer/products');
    expect(screen.getByRole('link', { name: "This week's stock" })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Pickup slots' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Stall & pickup' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Overview' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Orders' })).toBeInTheDocument();
  });

  it('hides the selling sections D-09 blocks while the stall is suspended, and keeps orders open', async () => {
    vi.spyOn(StallApi, 'myProfile').mockResolvedValue(stallProfile('suspended'));

    renderFarmerArea();

    // orders stay open — D-09's core guarantee
    expect(await screen.findByRole('link', { name: 'Orders' })).toHaveAttribute('href', '/farmer/orders');
    // the approval-status page must stay reachable — it is what explains the suspension
    expect(screen.getByRole('link', { name: 'Approval status' })).toBeInTheDocument();
    // reviews and sales history are read-only and un-guarded server-side — no reason to hide them
    expect(screen.getByRole('link', { name: 'Reviews' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Sales history' })).toBeInTheDocument();

    // the screens the server now refuses (StallSuspendedException) must not be offered
    expect(screen.queryByRole('link', { name: 'Products' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: "This week's stock" })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Pickup slots' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Stall & pickup' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Overview' })).not.toBeInTheDocument();
  });
});

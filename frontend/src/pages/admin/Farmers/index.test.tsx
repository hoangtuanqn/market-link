import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import AdminFarmerApi from '@/api-requests/admin-farmer.requests';
import type { AdminFarmerListItemType } from '@/types/farmer.types';
import AdminFarmersPage from './index';

const pending: AdminFarmerListItemType = {
  id: 11,
  stallName: 'Rau sạch Tài Hóc Môn',
  contactPerson: 'Trịnh Văn Tài',
  email: 'farmer-pending@marketlink.vn',
  phone: '0900000301',
  approvalStatus: 'pending',
  createdAt: '2026-09-24T03:00:00Z',
};

const page = (items: AdminFarmerListItemType[]) => ({
  success: true,
  message: '',
  timestamp: '',
  data: { items, page: 1, pageSize: 10, total: items.length },
});

const openRejectDialog = async () => {
  render(
    <MemoryRouter>
      <AdminFarmersPage />
    </MemoryRouter>,
  );
  await screen.findByText('Rau sạch Tài Hóc Môn');
  await userEvent.click(screen.getByRole('button', { name: 'Reject' }));
  return screen.getByRole('alertdialog');
};

describe('Rejecting a Farmer application with reason chips (FR-071)', () => {
  beforeEach(() => {
    // jsdom has no modal dialogs
    HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) {
      this.setAttribute('open', '');
    };
    HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) {
      this.removeAttribute('open');
    };
    vi.spyOn(AdminFarmerApi, 'list').mockImplementation(async (params) =>
      page(!params.status || params.status === 'all' || params.status === 'pending' ? [pending] : []),
    );
  });

  afterEach(() => vi.restoreAllMocks());

  it('sends the ticked reasons and the note as the sentence the applicant reads', async () => {
    const reject = vi.spyOn(AdminFarmerApi, 'reject').mockResolvedValue({} as never);
    const dialog = await openRejectDialog();

    await userEvent.click(within(dialog).getByRole('button', { name: 'The photos are unclear or not of your farm' }));
    await userEvent.type(within(dialog).getByRole('textbox', { name: 'Anything to add' }), 'Send photos of the beds.');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Reject registration' }));

    expect(reject).toHaveBeenCalledWith(11, 'The photos are unclear or not of your farm. Send photos of the beds.');
  });

  it('asks for a reason when nothing is ticked or written', async () => {
    const reject = vi.spyOn(AdminFarmerApi, 'reject').mockResolvedValue({} as never);
    const dialog = await openRejectDialog();

    await userEvent.click(within(dialog).getByRole('button', { name: 'Reject registration' }));

    expect(reject).not.toHaveBeenCalled();
    expect(within(dialog).getByRole('alert')).toHaveTextContent('Pick a reason or write one the applicant will see.');
  });
});

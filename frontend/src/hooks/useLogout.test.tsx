import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AuthApi from '@/api-requests/auth.requests';
import { Cart } from '@/lib/cart';
import Session from '@/utils/session';
import useLogout from './useLogout';

vi.mock('@/api-requests/auth.requests', () => ({ default: { logout: vi.fn() } }));
vi.mock('@/lib/notifications/browser', () => ({ dropPushSubscription: vi.fn().mockResolvedValue(undefined) }));
vi.mock('@/utils/notification', () => ({ default: { success: vi.fn(), error: vi.fn() } }));

const tomato = { productId: 1, name: 'Tomato', unit: 'kg', price: 1.5, max: 5, farmerId: 7, stallName: 'Cô Tư' };
const wrapper = ({ children }: { children: ReactNode }) => <MemoryRouter>{children}</MemoryRouter>;

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  Cart.clear();
});

describe('useLogout', () => {
  it('empties the cart along with the session', async () => {
    vi.mocked(AuthApi.logout).mockResolvedValue({ message: 'Signed out.' } as never);
    Session.save({ accessToken: 'token', user: { id: 1 } as never }, true);
    Cart.add(tomato, 2);
    const { result } = renderHook(() => useLogout(), { wrapper });

    await act(() => result.current());

    expect(Session.getAccessToken()).toBeNull();
    expect(Cart.lines()).toEqual([]);
    expect(localStorage.getItem('ml.cart')).toBe('[]');
  });

  it('empties the cart even when the server cannot be reached', async () => {
    vi.mocked(AuthApi.logout).mockRejectedValue(new Error('offline'));
    Session.save({ accessToken: 'token', user: { id: 1 } as never }, true);
    Cart.add(tomato, 1);
    const { result } = renderHook(() => useLogout(), { wrapper });

    await act(() => result.current());

    expect(Cart.lines()).toEqual([]);
  });
});

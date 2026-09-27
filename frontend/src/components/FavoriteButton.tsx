import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router';
import FavoriteApi, { type FavoriteInput, type FavoriteTargetType } from '@/api-requests/favorite.requests';
import useSession from '@/hooks/useSession';
import type { LoginRedirectState } from '@/layout/RequireAuth';
import Helper from '@/utils/helper';
import Notification from '@/utils/notification';
import { HeartIcon } from './icons';

type FavoriteButtonProps = {
  targetType: FavoriteTargetType;
  targetId: number;
  /** The favourite's id when already saved, null/undefined when not saved. */
  favoriteId?: number | null;
  /** Accessible labels for the off / on state, e.g. "Save Thảo Điền Weekend Market" */
  labelOff: string;
  labelOn: string;
  className?: string;
};

/** `FavoriteInput` sends exactly the id field that matches `targetType` (contract §9). */
const toInput = (targetType: FavoriteTargetType, targetId: number): FavoriteInput => {
  if (targetType === 'product') return { targetType, productId: targetId };
  if (targetType === 'farmer') return { targetType, farmerId: targetId };
  return { targetType, marketId: targetId };
};

/**
 * FR-040, FR-014 — a heart that saves or removes one favourite of the signed-in account. The caller loads whether the
 * target is already saved (`favoriteId`) and passes `key={favoriteId ?? 'none'}` so a freshly loaded value resets the
 * button's own state instead of fighting with it.
 */
const FavoriteButton = ({ targetType, targetId, favoriteId, labelOff, labelOn, className }: FavoriteButtonProps) => {
  const { t } = useTranslation();
  const [id, setId] = useState<number | null>(favoriteId ?? null);
  const [busy, setBusy] = useState(false);
  const { isLoggedIn } = useSession();
  const { pathname, search } = useLocation();
  const navigate = useNavigate();
  const on = id != null;

  // A favourite belongs to an account: a signed-out visitor who clicks the heart goes to sign in and then comes back
  // to this exact page, instead of turning red a heart that is saved nowhere and cannot be viewed again anywhere.
  const toggle = async () => {
    if (!isLoggedIn) {
      const state: LoginRedirectState = { from: pathname + search };
      navigate('/login', { state });
      return;
    }
    if (busy) return;
    setBusy(true);
    try {
      if (on && id != null) {
        await FavoriteApi.remove(id);
        setId(null);
      } else {
        const created = await FavoriteApi.add(toInput(targetType, targetId));
        setId(created.id);
      }
    } catch (error) {
      Notification.error({ text: Helper.getErrorMessage(error, t('errors.network')) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      aria-pressed={on}
      aria-label={on ? labelOn : labelOff}
      disabled={busy}
      onClick={() => void toggle()}
      className={Helper.cn(
        'bg-surface-raised text-ink aria-pressed:text-danger grid size-10 cursor-pointer place-items-center rounded-full disabled:opacity-60',
        className,
      )}
    >
      <HeartIcon filled={on} />
    </button>
  );
};

export default FavoriteButton;

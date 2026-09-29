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
  favoriteId?: number | null;
  labelOff: string;
  labelOn: string;
  className?: string;
  onChange?: (favoriteId: number | null) => void;
};

const toInput = (targetType: FavoriteTargetType, targetId: number): FavoriteInput => {
  if (targetType === 'product') return { targetType, productId: targetId };
  if (targetType === 'farmer') return { targetType, farmerId: targetId };
  return { targetType, marketId: targetId };
};

const FavoriteButton = ({
  targetType,
  targetId,
  favoriteId,
  labelOff,
  labelOn,
  className,
  onChange,
}: FavoriteButtonProps) => {
  const { t } = useTranslation();
  const [id, setId] = useState<number | null>(favoriteId ?? null);
  const [busy, setBusy] = useState(false);
  const { isLoggedIn } = useSession();
  const { pathname, search } = useLocation();
  const navigate = useNavigate();
  const on = id != null;

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
        onChange?.(null);
      } else {
        const created = await FavoriteApi.add(toInput(targetType, targetId));
        setId(created.id);
        onChange?.(created.id);
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
        'bg-surface-raised text-ink aria-pressed:text-danger grid size-11 cursor-pointer place-items-center rounded-full disabled:opacity-60',
        className,
      )}
    >
      <HeartIcon filled={on} />
    </button>
  );
};

export default FavoriteButton;

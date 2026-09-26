import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { SHOW_WIP } from '@/config/wip';
import useSession from '@/hooks/useSession';
import type { LoginRedirectState } from '@/layout/RequireAuth';
import Helper from '@/utils/helper';
import { HeartIcon } from './icons';

type FavoriteButtonProps = {
  initial?: boolean;
  /** Accessible labels for the off / on state, e.g. "Save Thảo Điền Weekend Market" */
  labelOff: string;
  labelOn: string;
  className?: string;
};

const FavoriteButton = ({ initial = false, labelOff, labelOn, className }: FavoriteButtonProps) => {
  const [on, setOn] = useState(initial);
  const { isLoggedIn } = useSession();
  const { pathname, search } = useLocation();
  const navigate = useNavigate();

  // Yêu thích gắn với tài khoản: khách chưa đăng nhập bấm tim thì sang đăng nhập rồi quay lại đúng trang này,
  // thay vì tô đỏ một trái tim không được lưu ở đâu và không có chỗ nào xem lại.
  const toggle = () => {
    if (!isLoggedIn) {
      const state: LoginRedirectState = { from: pathname + search };
      navigate('/login', { state });
      return;
    }
    setOn((v) => !v);
  };

  // Favorites (FR-040) chưa có API, trái tim chỉ đổi màu tại chỗ → production không hiện (config/wip.ts).
  if (!SHOW_WIP) return null;

  return (
    <button
      type="button"
      aria-pressed={on}
      aria-label={on ? labelOn : labelOff}
      onClick={toggle}
      className={Helper.cn(
        'bg-surface-raised text-ink aria-pressed:text-danger grid size-10 cursor-pointer place-items-center rounded-full',
        className,
      )}
    >
      <HeartIcon filled={on} />
    </button>
  );
};

export default FavoriteButton;

import { useMemo, useSyncExternalStore } from 'react';
import Session, { parseUser } from '@/utils/session';

/** User đang đăng nhập (null nếu chưa), tự cập nhật khi đăng nhập / đăng xuất / tab khác đổi phiên. */
const useSession = () => {
  const raw = useSyncExternalStore(Session.subscribe, Session.getRawUser, () => null);
  const user = useMemo(() => parseUser(raw), [raw]);
  return { user, isLoggedIn: user !== null };
};

export default useSession;

import { useMemo, useSyncExternalStore } from 'react';
import Session, { parseUser } from '@/utils/session';

const useSession = () => {
  const raw = useSyncExternalStore(Session.subscribe, Session.getRawUser, () => null);
  const user = useMemo(() => parseUser(raw), [raw]);
  return { user, isLoggedIn: user !== null };
};

export default useSession;

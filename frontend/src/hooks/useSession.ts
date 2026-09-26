import { useMemo, useSyncExternalStore } from 'react';
import Session, { parseUser } from '@/utils/session';

/** The signed-in user (null if not), updates itself when signing in / out / another tab changes the session. */
const useSession = () => {
  const raw = useSyncExternalStore(Session.subscribe, Session.getRawUser, () => null);
  const user = useMemo(() => parseUser(raw), [raw]);
  return { user, isLoggedIn: user !== null };
};

export default useSession;

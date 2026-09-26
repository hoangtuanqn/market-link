import { Navigate, Outlet, useLocation } from 'react-router';
import useSession from '@/hooks/useSession';

/**
 * The path to return to after signing in (router state, not taken from the URL so it cannot be abused to redirect
 * outside).
 */
export type LoginRedirectState = { from?: string };

/**
 * The Customer area (dashboard, cart, orders…) requires sign-in: with no session go to /login, and after signing in
 * return to the exact page. Only UX — the real permission is checked by the backend (FR-005).
 */
const RequireAuth = () => {
  const { isLoggedIn } = useSession();
  const { pathname, search } = useLocation();

  if (!isLoggedIn) {
    const state: LoginRedirectState = { from: pathname + search };
    return <Navigate to="/login" replace state={state} />;
  }
  return <Outlet />;
};

export default RequireAuth;

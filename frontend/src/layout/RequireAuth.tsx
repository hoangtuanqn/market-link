import { useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router';
import AuthApi from '@/api-requests/auth.requests';
import { USER_ROLE } from '@/constants/enums';
import useSession from '@/hooks/useSession';
import type { RoleType } from '@/types/user.types';
import Session from '@/utils/session';

/**
 * The path to return to after signing in (router state, not taken from the URL so it cannot be abused to redirect
 * outside).
 */
export type LoginRedirectState = { from?: string };

/** Where a signed-in user lands when the area belongs to another role: their own home, never a blank panel. */
const HOME_BY_ROLE: Record<RoleType, string> = {
  [USER_ROLE.CUSTOMER]: '/become-farmer',
  [USER_ROLE.FARMER]: '/farmer',
  [USER_ROLE.ADMIN]: '/admin',
};

type RequireAuthProps = {
  /** Only this role may open the area (the Farmer panel). Omit for "any signed-in user" (the Customer area). */
  role?: RoleType;
};

/**
 * Areas that need a session (Customer dashboard, cart, orders…; the Farmer panel): with no session go to /login, and
 * after signing in return to the exact page. With `role`, a signed-in user of another role is sent to their own home.
 * Only UX — the real permission is checked by the backend (FR-005).
 */
const RequireAuth = ({ role }: RequireAuthProps) => {
  const { user, isLoggedIn } = useSession();
  const { pathname, search } = useLocation();
  const storedRole = user?.role;
  const mismatch = role !== undefined && storedRole !== undefined && storedRole !== role;
  // The stored user only changes at sign-in / token refresh / a live notification, so a Farmer approved while offline
  // still reads "customer" here. Ask the server once before turning them away (FR-071).
  // Keyed by the stored role it answers for, so an answer about an earlier session is never reused.
  const [checked, setChecked] = useState<{ stored: RoleType; server: RoleType } | null>(null);

  useEffect(() => {
    if (!mismatch || !storedRole) return;
    let active = true;
    AuthApi.getMe()
      .then((res) => {
        if (!active) return;
        if (res.data.role !== storedRole) Session.updateUser(res.data);
        setChecked({ stored: storedRole, server: res.data.role });
      })
      .catch(() => {
        if (active) setChecked({ stored: storedRole, server: storedRole });
      });
    return () => {
      active = false;
    };
  }, [mismatch, storedRole]);

  if (!isLoggedIn || !user) {
    const state: LoginRedirectState = { from: pathname + search };
    return <Navigate to="/login" replace state={state} />;
  }
  if (mismatch) {
    if (checked?.stored !== storedRole) return null;
    return <Navigate to={HOME_BY_ROLE[checked.server] ?? '/'} replace />;
  }
  return <Outlet />;
};

export default RequireAuth;

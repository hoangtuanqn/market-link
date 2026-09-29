import { useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router';
import AuthApi from '@/api-requests/auth.requests';
import { USER_ROLE } from '@/constants/enums';
import useSession from '@/hooks/useSession';
import type { RoleType } from '@/types/user.types';
import Session from '@/utils/session';

export type LoginRedirectState = { from?: string };

const HOME_BY_ROLE: Record<RoleType, string> = {
  [USER_ROLE.CUSTOMER]: '/become-farmer',
  [USER_ROLE.FARMER]: '/farmer',
  [USER_ROLE.ADMIN]: '/admin',
};

type RequireAuthProps = {
  role?: RoleType;
};

const RequireAuth = ({ role }: RequireAuthProps) => {
  const { user, isLoggedIn } = useSession();
  const { pathname, search } = useLocation();
  const storedRole = user?.role;
  const mismatch = role !== undefined && storedRole !== undefined && storedRole !== role;
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

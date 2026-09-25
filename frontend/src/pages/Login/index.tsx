import { Link, Navigate, useLocation } from 'react-router';
import { Card } from '@/components/ui/card';
import { USER_ROLE } from '@/constants/enums';
import { ADMIN_HOME_PATH } from '@/constants/nav';
import useSession from '@/hooks/useSession';
import type { LoginRedirectState } from '@/layout/RequireAuth';
import FormLogin from './FormLogin';
import GoogleLoginButton from './GoogleLoginButton';

/** FR-003 — shared sign-in for Customer and Farmer. Admin uses its own sign-in screen (FR-004). */
const LoginPage = () => {
  const { user } = useSession();
  const location = useLocation();

  // FR-003: đã đăng nhập thì không hiện lại form — về trang đang mở dở (RequireAuth gửi sang), không có thì về trang đầu
  // theo vai (cùng đích FormLogin điều hướng sau khi đăng nhập)
  if (user) {
    const from = (location.state as LoginRedirectState | null)?.from;
    const home = user.role === USER_ROLE.ADMIN ? ADMIN_HOME_PATH : '/';
    return <Navigate to={from ?? home} replace />;
  }

  return (
    <Card className="mx-auto my-4 flex w-full max-w-115 flex-col gap-4 p-4 md:my-8 md:p-8">
      <div className="flex flex-col gap-2">
        <h1 className="font-hand text-h1">Sign in</h1>
        <p className="text-small text-ink-muted">
          Customers and Farmers sign in here. Admins use the{' '}
          <Link to="/admin/login" className="text-brand underline">
            separate admin sign-in
          </Link>
          .
        </p>
      </div>

      <FormLogin />

      <p className="text-ink-muted before:bg-line-strong after:bg-line-strong flex items-center gap-3 text-[13px] before:h-px before:flex-1 after:h-px after:flex-1">
        or
      </p>

      <div className="flex flex-col gap-2">
        <GoogleLoginButton />
        <p className="text-ink-muted text-[13px]">
          Google gives us your name and email. Your phone number and address are still needed before your first order,
          so we ask for them once on the next screen.
        </p>
      </div>

      <p className="text-small text-ink-muted">
        New here?{' '}
        <Link to="/register/customer" className="text-brand underline">
          Create a customer account
        </Link>{' '}
        or{' '}
        <Link to="/register/farmer" className="text-brand underline">
          register your stall
        </Link>
        .
      </p>
    </Card>
  );
};

export default LoginPage;

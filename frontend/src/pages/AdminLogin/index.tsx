import { Link, Navigate } from 'react-router';
import Logo from '@/components/Logo';
import { Card } from '@/components/ui/card';
import { USER_ROLE } from '@/constants/enums';
import { ADMIN_HOME_PATH, ADMIN_LOGIN_PATH } from '@/constants/nav';
import useSession from '@/hooks/useSession';
import FormAdminLogin from './FormAdminLogin';

/**
 * FR-004 — màn đăng nhập admin, tách khỏi layout Customer/Farmer (không header điều hướng, không footer). Chưa có
 * "Forgot password": việc admin tự đặt lại mật khẩu chưa được chốt (TODO trong prototype admin/login.html).
 */
const AdminLoginPage = () => {
  const { user } = useSession();
  // Đã đăng nhập bằng tài khoản admin thì vào thẳng khu admin
  if (user?.role === USER_ROLE.ADMIN) return <Navigate to={ADMIN_HOME_PATH} replace />;

  return (
    <div className="bg-surface-quiet flex min-h-screen flex-col">
      <header className="bg-board text-on-board">
        <div className="mx-auto flex min-h-16 max-w-300 items-center gap-4 px-4 md:px-6">
          <Logo to={ADMIN_LOGIN_PATH} />
          <span className="text-small text-board-muted border-board-muted border-l pl-3">Admin sign-in</span>
        </div>
        <div aria-hidden="true" className="border-twine h-0 border-t-2 border-dashed" />
      </header>

      <main className="flex flex-1 flex-col px-4 pt-6 pb-8 md:px-6 md:pt-12">
        <Card className="mx-auto flex w-full max-w-115 flex-col gap-4 p-4 md:p-8">
          <div className="flex flex-col gap-2">
            <p className="text-overline text-ink-muted uppercase">Admin area</p>
            <h1 className="font-hand text-h1">Sign in to manage MarketLink</h1>
            <p className="text-small text-ink-muted">
              This sign-in is only for platform admins and leads to a separate dashboard. Customers and Farmers{' '}
              <Link to="/login" className="text-brand underline">
                sign in here
              </Link>
              .
            </p>
          </div>
          <FormAdminLogin />
        </Card>
      </main>
    </div>
  );
};

export default AdminLoginPage;

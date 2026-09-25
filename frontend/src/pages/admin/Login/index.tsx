import { Link, Navigate } from 'react-router';
import { USER_ROLE } from '@/constants/enums';
import { ADMIN_HOME_PATH } from '@/constants/nav';
import useSession from '@/hooks/useSession';
import AdminAuthShell from '@/layout/AdminAuthShell';
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
    <AdminAuthShell>
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
    </AdminAuthShell>
  );
};

export default AdminLoginPage;

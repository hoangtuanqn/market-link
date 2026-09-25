import { Navigate, Outlet } from 'react-router';
import Logo from '@/components/Logo';
import { Button } from '@/components/ui/button';
import { USER_ROLE } from '@/constants/enums';
import { ADMIN_HOME_PATH, ADMIN_LOGIN_PATH } from '@/constants/nav';
import useLogout from '@/hooks/useLogout';
import useSession from '@/hooks/useSession';

/**
 * FR-004 — khung khu admin, tách khỏi layout Customer/Farmer. Chưa đăng nhập hoặc không phải admin thì về trang đăng
 * nhập admin. Đây chỉ là UX: quyền thật do backend kiểm tra ở từng API admin (FR-005).
 */
const AdminLayout = () => {
  const { user } = useSession();
  const logout = useLogout(ADMIN_LOGIN_PATH);

  if (user?.role !== USER_ROLE.ADMIN) {
    return <Navigate to={ADMIN_LOGIN_PATH} replace />;
  }

  return (
    <div className="bg-surface-quiet flex min-h-screen flex-col">
      <header className="bg-board text-on-board">
        <div className="mx-auto flex min-h-16 max-w-300 items-center gap-4 px-4 md:px-6">
          <Logo to={ADMIN_HOME_PATH} />
          <span className="text-small text-board-muted border-board-muted border-l pl-3">Admin</span>
          <div className="ml-auto flex items-center gap-3">
            <span className="text-small text-board-muted hidden md:inline">{user.fullName || user.email}</span>
            <Button variant="onboard" size="sm" onClick={logout}>
              Sign out
            </Button>
          </div>
        </div>
        <div aria-hidden="true" className="border-twine h-0 border-t-2 border-dashed" />
      </header>

      <main className="mx-auto box-border flex w-full max-w-300 flex-1 flex-col gap-6 px-4 pt-6 pb-8 md:px-6 md:pt-8 md:pb-12">
        <Outlet />
      </main>
    </div>
  );
};

export default AdminLayout;

import { useTranslation } from 'react-i18next';
import { Link, NavLink, Navigate, Outlet } from 'react-router';
import Logo from '@/components/Logo';
import { Button } from '@/components/ui/button';
import { USER_ROLE } from '@/constants/enums';
import { ADMIN_HOME_PATH, ADMIN_LOGIN_PATH, ADMIN_NAV, ADMIN_SECURITY_PATH } from '@/constants/nav';
import useLogout from '@/hooks/useLogout';
import useSession from '@/hooks/useSession';
import Helper from '@/utils/helper';

/**
 * FR-004 — khung khu admin, tách khỏi layout Customer/Farmer. Chưa đăng nhập hoặc không phải admin thì về trang đăng
 * nhập admin. Đây chỉ là UX: quyền thật do backend kiểm tra ở từng API admin (FR-005).
 */
const AdminLayout = () => {
  const { t } = useTranslation();
  const { user } = useSession();
  const logout = useLogout(ADMIN_LOGIN_PATH);

  if (user?.role !== USER_ROLE.ADMIN) {
    return <Navigate to={ADMIN_LOGIN_PATH} replace />;
  }

  return (
    <div className="bg-surface-quiet flex min-h-screen flex-col">
      <header className="bg-board text-on-board">
        <div className="mx-auto flex min-h-16 max-w-(--size-container) items-center gap-4 px-4 md:px-6">
          <Logo to={ADMIN_HOME_PATH} />
          {/* màn hẹp: nhường chỗ cho link Security và nút Sign out */}
          <span className="text-small text-board-muted border-board-muted hidden border-l pl-3 sm:inline">
            {t('admin.badge')}
          </span>
          <div className="ml-auto flex items-center gap-3">
            <span className="text-small text-board-muted hidden md:inline">{user.fullName || user.email}</span>
            {/* FR-008: bật / tắt xác thực hai bước */}
            <Link to={ADMIN_SECURITY_PATH} className="text-small text-on-board underline">
              {t('admin.security')}
            </Link>
            <Button variant="onboard" size="sm" onClick={logout}>
              {t('nav.signOut')}
            </Button>
          </div>
        </div>
        <nav aria-label={t('adminNav.sections')} className="overflow-x-auto">
          <div className="mx-auto flex max-w-(--size-container) gap-1 px-4 md:px-6">
            {ADMIN_NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === ADMIN_HOME_PATH}
                className={({ isActive }) =>
                  Helper.cn(
                    'text-board-muted hover:text-on-board inline-flex min-h-11 items-center px-3 text-[14px] font-bold whitespace-nowrap no-underline',
                    isActive && 'text-on-board shadow-[inset_0_-3px_0_var(--accent)]',
                  )
                }
              >
                {t(`adminNav.${item.label}`)}
              </NavLink>
            ))}
          </div>
        </nav>
        <div aria-hidden="true" className="border-twine h-0 border-t-2 border-dashed" />
      </header>

      <main className="mx-auto box-border flex w-full max-w-(--size-container) flex-1 flex-col gap-6 px-4 pt-6 pb-8 md:px-6 md:pt-8 md:pb-12">
        <Outlet />
      </main>
    </div>
  );
};

export default AdminLayout;

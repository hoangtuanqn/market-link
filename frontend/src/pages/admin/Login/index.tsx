import { Trans, useTranslation } from 'react-i18next';
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
  const { t } = useTranslation('AdminLogin');
  const { user } = useSession();
  // Đã đăng nhập bằng tài khoản admin thì vào thẳng khu admin
  if (user?.role === USER_ROLE.ADMIN) return <Navigate to={ADMIN_HOME_PATH} replace />;

  return (
    <AdminAuthShell>
      <div className="flex flex-col gap-2">
        <p className="text-overline text-ink-muted uppercase">{t('overline')}</p>
        <h1 className="font-hand text-h1">{t('title')}</h1>
        <p className="text-small text-ink-muted">
          <Trans t={t} i18nKey="intro" components={{ link: <Link to="/login" className="text-brand underline" /> }} />
        </p>
      </div>
      <FormAdminLogin />
    </AdminAuthShell>
  );
};

export default AdminLoginPage;

import { Trans, useTranslation } from 'react-i18next';
import { Link, Navigate } from 'react-router';
import { USER_ROLE } from '@/constants/enums';
import { ADMIN_HOME_PATH } from '@/constants/nav';
import useSession from '@/hooks/useSession';
import AdminAuthShell from '@/layout/AdminAuthShell';
import FormAdminLogin from './FormAdminLogin';

/**
 * FR-004 — the admin sign-in screen, separate from the Customer/Farmer layout (no navigation header, no footer). There
 * is no "Forgot password" yet: whether an admin resets their own password has not been decided (TODO in the prototype
 * admin/login.html).
 */
const AdminLoginPage = () => {
  const { t } = useTranslation('AdminLogin');
  const { user } = useSession();
  // Already signed in with an admin account → go straight into the admin area
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

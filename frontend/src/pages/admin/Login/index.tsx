import { useTranslation } from 'react-i18next';
import { Navigate } from 'react-router';
import { LockIcon } from '@/components/icons';
import { USER_ROLE } from '@/constants/enums';
import { ADMIN_HOME_PATH } from '@/constants/nav';
import useSession from '@/hooks/useSession';
import AdminAuthSplitShell, { AdminAuthCardHeader } from '@/layout/AdminAuthSplitShell';
import FormAdminLogin from './FormAdminLogin';

/**
 * FR-004 — the admin sign-in screen: a branded panel (left) making clear this is a separate admin area, and a focused
 * sign-in card (right). No navigation header/footer — this is not part of the Customer/Farmer layout. There is no
 * "Forgot password" yet: whether an admin resets their own password has not been decided (TODO in the prototype
 * admin/login.html).
 */
const AdminLoginPage = () => {
  const { t } = useTranslation('AdminLogin');
  const { user } = useSession();
  // Already signed in with an admin account → go straight into the admin area
  if (user?.role === USER_ROLE.ADMIN) return <Navigate to={ADMIN_HOME_PATH} replace />;

  return (
    <AdminAuthSplitShell>
      <AdminAuthCardHeader icon={<LockIcon size={20} />} eyebrow={t('form.eyebrow')} heading={t('form.heading')}>
        {t('form.subheading')}
      </AdminAuthCardHeader>

      <FormAdminLogin />
    </AdminAuthSplitShell>
  );
};

export default AdminLoginPage;

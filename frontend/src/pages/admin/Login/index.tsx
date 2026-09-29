import { useTranslation } from 'react-i18next';
import { Navigate } from 'react-router';
import { LockIcon } from '@/components/icons';
import { USER_ROLE } from '@/constants/enums';
import { ADMIN_HOME_PATH } from '@/constants/nav';
import useSession from '@/hooks/useSession';
import AdminAuthSplitShell, { AdminAuthCardHeader } from '@/layout/AdminAuthSplitShell';
import FormAdminLogin from './FormAdminLogin';

const AdminLoginPage = () => {
  const { t } = useTranslation('AdminLogin');
  const { user } = useSession();
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

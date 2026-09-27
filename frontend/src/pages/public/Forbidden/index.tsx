import { useTranslation } from 'react-i18next';
import { LockIcon } from '@/components/icons';
import { Button, ButtonLink } from '@/components/ui/button';
import { USER_ROLE } from '@/constants/enums';
import { ADMIN_LOGIN_PATH } from '@/constants/nav';
import useLogout from '@/hooks/useLogout';
import useSession from '@/hooks/useSession';

/**
 * 403 Forbidden page displayed when an authenticated user attempts to access an area reserved for another role (such as
 * a Customer or Farmer trying to access /admin/*).
 */
const ForbiddenPage = () => {
  const { t } = useTranslation('Forbidden');
  const { user, isLoggedIn } = useSession();
  const logout = useLogout(ADMIN_LOGIN_PATH);

  const getHomeTarget = () => {
    if (!isLoggedIn || !user) return { to: '/', label: t('backHome') };
    if (user.role === USER_ROLE.FARMER) return { to: '/farmer', label: t('backFarmer') };
    if (user.role === USER_ROLE.CUSTOMER) return { to: '/dashboard', label: t('backDashboard') };
    return { to: '/admin', label: t('backDashboard') };
  };

  const homeTarget = getHomeTarget();

  return (
    <div className="mx-auto flex max-w-160 flex-col items-center gap-4 px-4 py-16 text-center">
      <div className="bg-surface-sunken text-ink-muted flex h-14 w-14 items-center justify-center rounded-full">
        <LockIcon size={24} />
      </div>
      <p className="text-overline text-ink-muted uppercase">{t('overline')}</p>
      <h1 className="text-h2 text-ink font-sans font-bold">{t('title')}</h1>
      <p className="text-ink-muted max-w-md">{t('text')}</p>
      <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
        <ButtonLink to={homeTarget.to} variant="primary">
          {homeTarget.label}
        </ButtonLink>
        <Button variant="secondary" onClick={() => void logout()}>
          {t('switchAccount')}
        </Button>
      </div>
    </div>
  );
};

export default ForbiddenPage;

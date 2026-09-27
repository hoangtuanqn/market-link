import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { LockIcon } from '@/components/icons';
import { Button, ButtonLink } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { USER_ROLE } from '@/constants/enums';
import { ADMIN_LOGIN_PATH } from '@/constants/nav';
import useLogout from '@/hooks/useLogout';
import useSession from '@/hooks/useSession';
import ErrorShell from '@/layout/ErrorShell';

type ForbiddenPageProps = {
  standalone?: boolean;
};

/**
 * 403 Forbidden page displayed when an authenticated user attempts to access an area reserved for another role (such as
 * a Customer or Farmer trying to access /admin/*).
 */
const ForbiddenPage = ({ standalone = true }: ForbiddenPageProps) => {
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

  const cardContent = (
    <div className="flex flex-col items-center gap-4 text-center">
      <div className="bg-surface-sunken text-brand border-line-strong mx-auto mb-1 flex h-16 w-16 items-center justify-center rounded-full border-[1.5px]">
        <LockIcon size={28} />
      </div>

      <div className="font-hand text-ink text-6xl font-bold tracking-tight md:text-7xl">403</div>

      <p className="text-overline text-ink-muted font-semibold tracking-wider uppercase">{t('overline')}</p>

      <h1 className="text-h2 text-ink font-sans font-bold">{t('title')}</h1>

      {isLoggedIn && user && (
        <div className="border-line bg-surface-sunken text-ink-muted inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs">
          <span className="bg-accent h-2 w-2 rounded-full" />
          <span>
            {user.fullName || user.email} · <strong className="capitalize">{user.role}</strong>
          </span>
        </div>
      )}

      <p className="text-ink-muted mx-auto max-w-md text-sm leading-relaxed md:text-base">{t('text')}</p>

      <div className="flex w-full flex-col items-center justify-center gap-3 pt-3 sm:flex-row">
        <ButtonLink to={homeTarget.to} variant="primary" className="w-full sm:w-auto">
          {homeTarget.label}
        </ButtonLink>
        <Button variant="secondary" onClick={() => void logout()} className="w-full sm:w-auto">
          {t('switchAccount')}
        </Button>
      </div>

      <div className="border-line text-ink-muted mt-6 flex flex-wrap items-center justify-center gap-3 border-t pt-4 text-xs">
        <span>{t('needHelp')}</span>
        <Link to="/contact" className="hover:text-ink font-semibold underline-offset-4 hover:underline">
          {t('contactSupport')}
        </Link>
        <span>·</span>
        <Link to="/" className="hover:text-ink underline-offset-4 hover:underline">
          {t('backHome')}
        </Link>
      </div>
    </div>
  );

  if (!standalone) {
    return <Card className="mx-auto w-full max-w-lg p-6 text-center md:p-10">{cardContent}</Card>;
  }

  return <ErrorShell>{cardContent}</ErrorShell>;
};

export default ForbiddenPage;

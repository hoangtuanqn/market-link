import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import useLogout from '@/hooks/useLogout';
import AchievementsCard from './AchievementsCard';
import AvatarCard from './AvatarCard';
import PasswordCard from './PasswordCard';
import ProfileForm from './ProfileForm';
import SellCard from './SellCard';

/**
 * Profile editing and change password are proposals, not SRS requirements (feature catalog). Photo and details share
 * one card; "Password & security" opens its own page (/account/password, PR #125).
 */
const CustomerAccountPage = () => {
  const { t } = useTranslation('CustomerAccount');
  const logout = useLogout();
  return (
    <div className="mx-auto flex w-full max-w-180 flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-h1">{t('title')}</h1>
        <p className="text-body">{t('intro')}</p>
      </div>

      <Card className="flex flex-col gap-6 p-6">
        <AvatarCard />
        <div aria-hidden="true" className="border-line border-t" />
        <ProfileForm />
      </Card>

      <AchievementsCard />

      <PasswordCard />

      <SellCard />

      <Card className="flex flex-wrap items-center justify-between gap-4 p-6">
        <div>
          <h2 className="text-h3">{t('signOut.title')}</h2>
          <p className="text-small text-ink-muted">{t('signOut.text')}</p>
        </div>
        <Button variant="secondary" onClick={logout}>
          {t('signOut.button')}
        </Button>
      </Card>
    </div>
  );
};

export default CustomerAccountPage;

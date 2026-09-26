import { Navigate, Outlet, useLocation } from 'react-router';
import Footer from '@/components/Footer';
import Header from '@/components/Header';
import LiveAnnouncementBanner from '@/components/LiveAnnouncementBanner';
import { USER_ROLE } from '@/constants/enums';
import useMyAchievements from '@/hooks/useMyAchievements';
import useUnreadNotifications from '@/hooks/useUnreadNotifications';
import useSession from '@/hooks/useSession';

type MainLayoutProps = {
  cartCount?: number;
  unreadCount?: number;
};
/** The page for completing a required profile (a Google account with no phone number / address yet). */
const COMPLETE_PROFILE_PATH = '/auth/complete-profile';

const MainLayout = ({ cartCount, unreadCount }: MainLayoutProps) => {
  const { user } = useSession();
  const { pathname } = useLocation();
  const variant = user ? 'customer' : 'guest';
  const userName = user?.fullName || user?.email || '';
  const { state: achievements } = useMyAchievements();
  const unread = useUnreadNotifications();
  // Everyone who signs in has at least a Bronze ring, even when the figures have not finished loading or failed to load
  const tier = achievements.status === 'ready' ? achievements.data.tier : 'bronze';

  // A Customer (Google account) missing a phone number / address → cannot enter any other page until complete (can only
  // sign out). An Admin does not need these two fields.
  const mustCompleteProfile = user?.role === USER_ROLE.CUSTOMER && (!user.phone || !user.address);
  if (mustCompleteProfile && pathname !== COMPLETE_PROFILE_PATH) {
    return <Navigate to={COMPLETE_PROFILE_PATH} replace />;
  }

  return (
    <div className="flex min-h-screen flex-col">
      <LiveAnnouncementBanner />
      <Header
        variant={variant}
        userName={userName}
        userEmail={user?.email}
        avatarUrl={user?.avatarUrl}
        tier={tier}
        role={user?.role}
        settingsTo={user?.role === USER_ROLE.FARMER ? '/farmer/settings' : '/settings'}
        messagesTo={user?.role === USER_ROLE.FARMER ? '/farmer/messages' : '/messages'}
        notificationsTo={user?.role === USER_ROLE.FARMER ? '/farmer/notifications' : '/notifications'}
        cartCount={cartCount}
        unreadCount={unreadCount ?? unread}
      />
      <main className="mx-auto box-border flex w-full max-w-(--size-container) flex-1 flex-col gap-6 px-4 pt-6 pb-8 md:px-6 md:pt-8 md:pb-12">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
};

export default MainLayout;

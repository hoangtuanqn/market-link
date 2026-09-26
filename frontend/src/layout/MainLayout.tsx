import { Navigate, Outlet, useLocation } from 'react-router';
import AnnouncementBanner from '@/components/AnnouncementBanner';
import Footer from '@/components/Footer';
import Header from '@/components/Header';
import { announcement } from '@/data/home';
import { USER_ROLE } from '@/constants/enums';
import useMyAchievements from '@/hooks/useMyAchievements';
import useUnreadNotifications from '@/hooks/useUnreadNotifications';
import useSession from '@/hooks/useSession';

type MainLayoutProps = {
  cartCount?: number;
  unreadCount?: number;
};
/** Trang bổ sung hồ sơ bắt buộc (tài khoản Google chưa có số điện thoại / địa chỉ). */
const COMPLETE_PROFILE_PATH = '/auth/complete-profile';

const MainLayout = ({ cartCount, unreadCount }: MainLayoutProps) => {
  const { user } = useSession();
  const { pathname } = useLocation();
  const variant = user ? 'customer' : 'guest';
  const userName = user?.fullName || user?.email || '';
  const { state: achievements } = useMyAchievements();
  const unread = useUnreadNotifications();
  // Ai đăng nhập cũng có ít nhất viền Đồng, kể cả khi số liệu chưa tải xong hoặc tải lỗi
  const tier = achievements.status === 'ready' ? achievements.data.tier : 'bronze';

  // Customer (tài khoản Google) thiếu số điện thoại / địa chỉ → không vào được trang nào khác tới khi nhập đủ (chỉ có
  // thể đăng xuất). Admin không cần hai trường này.
  const mustCompleteProfile = user?.role === USER_ROLE.CUSTOMER && (!user.phone || !user.address);
  if (mustCompleteProfile && pathname !== COMPLETE_PROFILE_PATH) {
    return <Navigate to={COMPLETE_PROFILE_PATH} replace />;
  }

  return (
    <div className="flex min-h-screen flex-col">
      <AnnouncementBanner announcement={announcement} />
      <Header
        variant={variant}
        userName={userName}
        userEmail={user?.email}
        avatarUrl={user?.avatarUrl}
        tier={tier}
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

import { Navigate, Outlet, useLocation } from 'react-router';
import AnnouncementBanner from '@/components/AnnouncementBanner';
import Footer from '@/components/Footer';
import Header from '@/components/Header';
import { announcement } from '@/data/home';
import { USER_ROLE } from '@/constants/enums';
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
        cartCount={cartCount}
        unreadCount={unreadCount}
      />
      <main className="mx-auto box-border flex w-full max-w-300 flex-1 flex-col gap-6 px-4 pt-6 pb-8 md:px-6 md:pt-8 md:pb-12">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
};

export default MainLayout;

import { Outlet } from 'react-router';
import { Toaster } from 'sonner';
import AnnouncementBanner from '@/components/AnnouncementBanner';
import Footer from '@/components/Footer';
import Header from '@/components/Header';
import { announcement } from '@/data/home';
import useSession from '@/hooks/useSession';

type MainLayoutProps = {
  cartCount?: number;
  unreadCount?: number;
};
const MainLayout = ({ cartCount, unreadCount }: MainLayoutProps) => {
  const { user } = useSession();
  const variant = user ? 'customer' : 'guest';
  const userName = user?.fullName || user?.email || '';

  return (
    <div className="flex min-h-screen flex-col">
      <AnnouncementBanner announcement={announcement} />
      <Header variant={variant} userName={userName} cartCount={cartCount} unreadCount={unreadCount} />
      <main className="mx-auto box-border flex w-full max-w-300 flex-1 flex-col gap-6 px-4 pt-6 pb-8 md:px-6 md:pt-8 md:pb-12">
        <Outlet />
      </main>
      <Footer />
      <Toaster
        position="top-center"
        visibleToasts={5}
        closeButton
        toastOptions={{
          duration: 4000,
          classNames: {
            toast: '!rounded-md !border-line-strong !bg-surface-raised !text-ink !shadow-float !font-sans',
            description: '!text-ink-muted',
            success: '[&_[data-icon]]:!text-success',
            error: '!border-danger [&_[data-icon]]:!text-danger',
            warning: '[&_[data-icon]]:!text-warning-ink',
          },
        }}
      />
    </div>
  );
};

export default MainLayout;

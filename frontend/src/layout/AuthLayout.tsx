import { Outlet } from 'react-router';
import Logo from '@/components/Logo';

/**
 * Dedicated clean shell for authentication pages (Login, Register, Password flows). Displays only the brand logo and
 * the focused page content without SiteHeader and Footer.
 */
const AuthLayout = () => {
  return (
    <div className="bg-surface-quiet flex min-h-screen flex-col items-center px-4 py-8 sm:px-6 lg:px-8">
      <div className="my-auto flex w-full flex-col items-center">
        <div className="mb-4 flex justify-center">
          <Logo to="/" size={36} />
        </div>
        <main className="w-full">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AuthLayout;

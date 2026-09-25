import type { ReactNode } from 'react';
import Logo from '@/components/Logo';
import { Card } from '@/components/ui/card';
import { ADMIN_LOGIN_PATH } from '@/constants/nav';

/**
 * FR-004 / FR-008 — khung các màn đăng nhập admin (mật khẩu, nhập mã): header gọn không điều hướng, một thẻ ở giữa.
 * Tách khỏi layout Customer/Farmer và khỏi AdminLayout (chưa có phiên).
 */
const AdminAuthShell = ({ children }: { children: ReactNode }) => (
  <div className="bg-surface-quiet flex min-h-screen flex-col">
    <header className="bg-board text-on-board">
      <div className="mx-auto flex min-h-16 max-w-(--size-container) items-center gap-4 px-4 md:px-6">
        <Logo to={ADMIN_LOGIN_PATH} />
        <span className="text-small text-board-muted border-board-muted border-l pl-3">Admin sign-in</span>
      </div>
      <div aria-hidden="true" className="border-twine h-0 border-t-2 border-dashed" />
    </header>

    <main className="flex flex-1 flex-col px-4 pt-6 pb-8 md:px-6 md:pt-12">
      <Card className="mx-auto flex w-full max-w-115 flex-col gap-4 p-4 md:p-8">{children}</Card>
    </main>
  </div>
);

export default AdminAuthShell;

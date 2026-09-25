import { DataState } from '@/components/ui/data-state';
import useSession from '@/hooks/useSession';

/** FR-004 — trang đích sau khi admin đăng nhập. Dashboard số liệu (FR-070) chưa làm nên tạm hiện trạng thái trống. */
const AdminHomePage = () => {
  const { user } = useSession();

  return (
    <>
      <div className="flex flex-col gap-2">
        <p className="text-overline text-ink-muted uppercase">Admin area</p>
        <h1 className="font-hand text-h1">Hello, {user?.fullName || 'admin'}</h1>
      </div>
      <DataState
        title="The dashboard is on its way"
        text="Totals for farmers, customers, markets and orders will show here once the admin dashboard is built."
      />
    </>
  );
};

export default AdminHomePage;

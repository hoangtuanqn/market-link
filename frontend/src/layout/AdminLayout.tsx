import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router';
import AdminFarmerApi from '@/api-requests/admin-farmer.requests';
import {
  ChartIcon,
  ChatIcon,
  DashboardIcon,
  LockIcon,
  MegaphoneIcon,
  ReceiptIcon,
  ShieldIcon,
  SlidersIcon,
  StoreIcon,
  TagIcon,
  UsersIcon,
} from '@/components/icons';
import { USER_ROLE } from '@/constants/enums';
import { ADMIN_FARMERS_PATH, ADMIN_HOME_PATH, ADMIN_LOGIN_PATH, ADMIN_SECURITY_PATH } from '@/constants/nav';
import useLogout from '@/hooks/useLogout';
import useSession from '@/hooks/useSession';
import DashboardShell, { type ShellNavGroup } from './DashboardShell';

/** Sidebar groups from docs/prototype/prototype.js (SIDE.admin). Screens not built yet land on the in-panel 404. */
const buildNav = (pendingFarmers: number): ShellNavGroup[] => [
  {
    heading: 'Analytics',
    items: [
      { to: ADMIN_HOME_PATH, label: 'Overview', icon: DashboardIcon },
      { to: '/admin/reports', label: 'Reports', icon: ChartIcon },
      { to: '/admin/revenue', label: 'Platform revenue', icon: TagIcon },
      { to: '/admin/orders', label: 'Orders', icon: ReceiptIcon },
    ],
  },
  {
    heading: 'People',
    items: [
      { to: ADMIN_FARMERS_PATH, label: 'Farmers', icon: UsersIcon, count: pendingFarmers },
      { to: '/admin/customers', label: 'Customers', icon: UsersIcon },
    ],
  },
  {
    heading: 'Marketplace',
    items: [
      { to: '/admin/markets', label: 'Markets', icon: StoreIcon },
      { to: '/admin/moderation', label: 'Moderation', icon: ShieldIcon },
    ],
  },
  {
    heading: 'Platform',
    items: [
      { to: '/admin/categories', label: 'Categories & units', icon: TagIcon },
      { to: '/admin/announcements', label: 'Announcements', icon: MegaphoneIcon },
      { to: '/admin/feedback', label: 'Feedback inbox', icon: ChatIcon },
      { to: '/admin/pricing', label: 'Pricing & allowances', icon: TagIcon },
      { to: '/admin/settings', label: 'Settings', icon: SlidersIcon },
      // FR-008: bật / tắt xác thực hai bước
      { to: ADMIN_SECURITY_PATH, label: 'Security', icon: LockIcon },
    ],
  },
];

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w.charAt(0).toUpperCase())
    .join('') || 'AD';

/**
 * FR-004 — khung khu admin, tách khỏi layout Customer/Farmer. Chưa đăng nhập hoặc không phải admin thì về trang đăng
 * nhập admin. Đây chỉ là UX: quyền thật do backend kiểm tra ở từng API admin (FR-005).
 */
const AdminLayout = () => {
  const { user } = useSession();
  const { pathname } = useLocation();
  const logout = useLogout(ADMIN_LOGIN_PATH);
  const isAdmin = user?.role === USER_ROLE.ADMIN;
  const [pendingFarmers, setPendingFarmers] = useState(0);

  // Badge "đang chờ duyệt" trên mục Farmers; tải lại khi đổi trang để khớp sau khi duyệt / từ chối.
  useEffect(() => {
    if (!isAdmin) return;
    AdminFarmerApi.list({ status: 'pending', page: 1, pageSize: 1 })
      .then((response) => setPendingFarmers(response.data.total))
      .catch(() => {});
  }, [isAdmin, pathname]);

  if (!isAdmin) {
    return <Navigate to={ADMIN_LOGIN_PATH} replace />;
  }

  return (
    <DashboardShell
      badge="Admin"
      home={ADMIN_HOME_PATH}
      nav={buildNav(pendingFarmers)}
      context={{ mono: 'M', name: 'MarketLink', sub: 'Platform · whole marketplace' }}
      user={{ mono: initials(user.fullName ?? ''), email: user.email, line: 'Admin · whole platform' }}
      onSignOut={logout}
      searchId="admin-appq"
      searchPlaceholder="Stall, customer or market"
      accountTo={ADMIN_SECURITY_PATH}
      className="bg-surface-quiet"
    />
  );
};

export default AdminLayout;

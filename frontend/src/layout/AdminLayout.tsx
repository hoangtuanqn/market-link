import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Navigate, useLocation } from 'react-router';
import NotificationBell from '@/components/notifications/NotificationBell';
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
import {
  ADMIN_ACCOUNT_PATH,
  ADMIN_NOTIFICATIONS_PATH,
  ADMIN_ANNOUNCEMENTS_PATH,
  ADMIN_CATEGORIES_PATH,
  ADMIN_CUSTOMERS_PATH,
  ADMIN_FARMERS_PATH,
  ADMIN_FEEDBACK_PATH,
  ADMIN_HOME_PATH,
  ADMIN_LOGIN_PATH,
  ADMIN_MARKETS_PATH,
  ADMIN_MODERATION_PATH,
  ADMIN_ORDERS_PATH,
  ADMIN_PRICING_PATH,
  ADMIN_REPORTS_PATH,
  ADMIN_REVENUE_PATH,
  ADMIN_SECURITY_PATH,
  ADMIN_SETTINGS_PATH,
} from '@/constants/nav';
import useLogout from '@/hooks/useLogout';
import useSession from '@/hooks/useSession';
import type { TFunction } from 'i18next';
import DashboardShell, { type ShellNavGroup } from './DashboardShell';

/** Sidebar groups from docs/prototype/prototype.js (SIDE.admin). Every item now has a screen behind it. */
const buildNav = (t: TFunction, pendingFarmers: number): ShellNavGroup[] => [
  {
    heading: t('adminNav.analytics'),
    items: [
      { to: ADMIN_HOME_PATH, label: t('adminNav.overview'), icon: DashboardIcon },
      { to: ADMIN_REPORTS_PATH, label: t('adminNav.reports'), icon: ChartIcon },
      { to: ADMIN_REVENUE_PATH, label: t('adminNav.revenue'), icon: TagIcon },
      { to: ADMIN_ORDERS_PATH, label: t('adminNav.orders'), icon: ReceiptIcon },
    ],
  },
  {
    heading: t('adminNav.people'),
    items: [
      { to: ADMIN_FARMERS_PATH, label: t('adminNav.farmers'), icon: UsersIcon, count: pendingFarmers },
      { to: ADMIN_CUSTOMERS_PATH, label: t('adminNav.customers'), icon: UsersIcon },
    ],
  },
  {
    heading: t('adminNav.marketplace'),
    items: [
      { to: ADMIN_MARKETS_PATH, label: t('adminNav.markets'), icon: StoreIcon },
      { to: ADMIN_MODERATION_PATH, label: t('adminNav.moderation'), icon: ShieldIcon },
    ],
  },
  {
    heading: t('adminNav.platform'),
    items: [
      { to: ADMIN_CATEGORIES_PATH, label: t('adminNav.categories'), icon: TagIcon },
      { to: ADMIN_ANNOUNCEMENTS_PATH, label: t('adminNav.announcements'), icon: MegaphoneIcon },
      { to: ADMIN_FEEDBACK_PATH, label: t('adminNav.feedback'), icon: ChatIcon },
      { to: ADMIN_PRICING_PATH, label: t('adminNav.pricing'), icon: TagIcon },
      { to: ADMIN_SETTINGS_PATH, label: t('adminNav.settings'), icon: SlidersIcon },
      { to: ADMIN_ACCOUNT_PATH, label: t('adminNav.account'), icon: UsersIcon },
      // FR-008: bật / tắt xác thực hai bước
      { to: ADMIN_SECURITY_PATH, label: t('admin.security'), icon: LockIcon },
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
  const { t } = useTranslation();
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
      badge={t('admin.badge')}
      navLabel={t('adminNav.navigation')}
      homeLabel={t('adminNav.home')}
      home={ADMIN_HOME_PATH}
      nav={buildNav(t, pendingFarmers)}
      context={{ mono: 'M', name: 'MarketLink', sub: t('adminNav.contextSub') }}
      user={{ mono: initials(user.fullName ?? ''), email: user.email, line: t('adminNav.userLine') }}
      onSignOut={logout}
      searchId="admin-appq"
      searchPlaceholder={t('adminNav.searchPlaceholder')}
      accountTo={ADMIN_ACCOUNT_PATH}
      headerActions={<NotificationBell to={ADMIN_NOTIFICATIONS_PATH} />}
      className="bg-surface-quiet"
    />
  );
};

export default AdminLayout;

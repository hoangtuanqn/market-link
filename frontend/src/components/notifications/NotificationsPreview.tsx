import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import NotificationApi from '@/api-requests/notification.requests';
import useRequest from '@/hooks/useRequest';
import useUnreadNotifications from '@/hooks/useUnreadNotifications';
import { formatDate, formatTime } from '@/lib/format';
import { NotificationStore } from '@/lib/notifications/store';
import type { NotificationItem, NotificationKindCode } from '@/types/notification.types';
import { MegaphoneIcon, ReceiptIcon, StoreIcon } from '@/components/icons';
import Helper from '@/utils/helper';

const iconOf = (kind: NotificationKindCode) => {
  if (kind === 'announcement') return { Icon: MegaphoneIcon, className: 'bg-highlight text-ink' };
  if (kind.startsWith('farmer_')) return { Icon: StoreIcon, className: 'bg-brand-tint text-ink' };
  return { Icon: ReceiptIcon, className: 'bg-surface-sunken text-ink' };
};

export default function NotificationsPreview() {
  const { t } = useTranslation('common');
  const navigate = useNavigate();
  const unreadCount = useUnreadNotifications();

  const { state, mutate } = useRequest(`notify-preview:${unreadCount}`, () =>
    NotificationApi.list({ page: 1, size: 4 }).then((r) => r.data.items),
  );

  const open = (item: NotificationItem) => {
    if (!item.isRead) {
      mutate((items) => items.map((i) => (i.id === item.id ? { ...i, isRead: true } : i)));
      NotificationStore.setUnread(unreadCount - 1);
      NotificationApi.read(item.id).catch(() => undefined);
    }
    if (item.link) navigate(item.link);
  };

  if (state.kind === 'error') {
    return <div className="text-small text-ink-muted p-4 text-center">{t('notify.notificationsError')}</div>;
  }

  if (state.kind === 'loading') {
    return <div className="text-small text-ink-muted p-4 text-center">Loading...</div>;
  }

  if (state.data.length === 0) {
    return <div className="text-small text-ink-muted p-4 text-center">{t('notify.notificationsEmpty')}</div>;
  }

  return (
    <div className="flex flex-col">
      {state.data.map((n) => {
        const { Icon, className } = iconOf(n.kind);
        const at = new Date(n.createdAt);
        return (
          <button
            key={n.id}
            type="button"
            onClick={() => open(n)}
            className={Helper.cn(
              'hover:bg-surface-sunken flex w-full cursor-pointer items-start gap-3 p-3 text-left transition-colors',
              !n.isRead && 'bg-highlight',
            )}
          >
            <span className={Helper.cn('grid size-8 flex-shrink-0 place-items-center rounded-full', className)}>
              <Icon size={16} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[14px] font-bold">
                {n.title}
                {!n.isRead && (
                  <span aria-hidden="true" className="bg-brand ml-1.5 inline-block size-2 rounded-full align-middle" />
                )}
              </span>
              <span className="text-ink-muted mt-0.5 line-clamp-2 block text-[13px] break-words">{n.message}</span>
              <span className="text-ink-muted mt-1 block text-[12px] whitespace-nowrap">
                {formatDate(at)} {formatTime(at)}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

import { useState } from 'react';
import { NOTIFICATION_META } from '@/constants/notificationKind';
import { Chip } from '@/components/ui/chip';
import { notifications as INITIAL_NOTIFICATIONS } from '@/data/customer';
import Helper from '@/utils/helper';

/** FR-060 FR-061 — in-app notifications only for now (D-11); email is a later addition (FR-043, NICE). */
const CustomerNotificationsPage = () => {
  const [notifications, setNotifications] = useState(INITIAL_NOTIFICATIONS);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const unreadCount = notifications.filter((n) => n.unread).length;
  const shown = filter === 'unread' ? notifications.filter((n) => n.unread) : notifications;

  return (
    <div className="mx-auto flex w-full max-w-180 flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-h1">Notifications</h1>
          <p className="text-body">
            Order accepted, declined or ready, a favorite back in stock, and announcements from MarketLink.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Chip pressed={filter === 'all'} onClick={() => setFilter('all')}>
            All
          </Chip>
          <Chip pressed={filter === 'unread'} onClick={() => setFilter('unread')}>
            Unread <span className="text-[12px] tabular-nums opacity-80">{unreadCount}</span>
          </Chip>
        </div>
      </div>

      <section aria-label="Notifications" className="flex flex-col gap-0">
        <div className="border-line-strong flex items-center justify-between gap-3 border-b-[1.5px] py-2 pr-2 pl-4">
          <b className="text-[16px]">
            Notifications
            {unreadCount > 0 && (
              <span className="text-ink-muted ml-1 text-[14px] font-normal">· {unreadCount} unread</span>
            )}
          </b>
          <Chip onClick={() => setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })))}>
            Mark all as read
          </Chip>
        </div>
        <ul className="m-0 flex flex-col p-0">
          {shown.map((n, i) => {
            const { icon: Icon, className } = NOTIFICATION_META[n.kind];
            return (
              <li
                key={i}
                className={Helper.cn(
                  'border-line grid grid-cols-[32px_1fr_auto] gap-3 border-t px-4 py-3 first:border-t-0',
                  n.unread && 'bg-highlight',
                )}
              >
                <span className={Helper.cn('grid size-8 place-items-center rounded-full', className)}>
                  <Icon size={16} />
                </span>
                <div>
                  <p className="text-[14px] font-bold">
                    {n.title}
                    {n.unread && (
                      <span
                        aria-hidden="true"
                        className="bg-brand ml-1.5 inline-block size-2 rounded-full align-middle"
                      >
                        <span className="sr-only">unread</span>
                      </span>
                    )}
                  </p>
                  {n.text && <p className="text-ink-muted mt-0.5 text-[14px]">{n.text}</p>}
                </div>
                <span className="text-ink-muted text-[12px] whitespace-nowrap">{n.time}</span>
              </li>
            );
          })}
        </ul>
      </section>

      <p className="text-ink-muted text-[13px]">
        In-app only for now. Email for confirmations and ready-for-pickup is a later addition.
      </p>
    </div>
  );
};

export default CustomerNotificationsPage;

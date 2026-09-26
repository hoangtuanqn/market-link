import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import NotificationApi from '@/api-requests/notification.requests';
import { MegaphoneIcon, ReceiptIcon, StoreIcon } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { DataState } from '@/components/ui/data-state';
import useUnreadNotifications from '@/hooks/useUnreadNotifications';
import { formatDate, formatTime } from '@/lib/format';
import { NotificationStore } from '@/lib/notifications/store';
import type { NotificationItem, NotificationKindCode } from '@/types/notification.types';
import Helper from '@/utils/helper';
import Notification from '@/utils/notification';

const PAGE_SIZE = 20;

const iconOf = (kind: NotificationKindCode) => {
  if (kind === 'announcement') return { Icon: MegaphoneIcon, className: 'bg-highlight text-ink' };
  if (kind.startsWith('farmer_')) return { Icon: StoreIcon, className: 'bg-brand-tint text-ink' };
  return { Icon: ReceiptIcon, className: 'bg-surface-sunken text-ink' };
};

type Load = { status: 'loading' } | { status: 'error' } | { status: 'ready'; items: NotificationItem[]; total: number };

/**
 * FR-042 — the real notification list (/notifications, /farmer/notifications, /admin/notifications). A new notification
 * via STOMP is inserted at the top as soon as it arrives; clicking a row marks it read and then opens the right page.
 */
const NotificationList = ({ title, intro }: { title: string; intro: string }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const unread = useUnreadNotifications();
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [page, setPage] = useState(1);
  const [state, setState] = useState<Load>({ status: 'loading' });
  const [loadingMore, setLoadingMore] = useState(false);

  const fetchPage = (which: 'all' | 'unread', n: number) =>
    NotificationApi.list({ isRead: which === 'unread' ? false : undefined, page: n, size: PAGE_SIZE }).then(
      (res) => res.data,
    );

  useEffect(() => {
    let cancelled = false;
    fetchPage(filter, 1)
      .then((data) => !cancelled && setState({ status: 'ready', items: data.items, total: data.total }))
      .catch(() => !cancelled && setState({ status: 'error' }));
    return () => {
      cancelled = true;
    };
  }, [filter]);

  // A new storable notification arrives → goes to the top of the list
  useEffect(
    () =>
      NotificationStore.onFrame((f) => {
        if (!f.persistent || f.id === null) return;
        const item: NotificationItem = {
          id: f.id,
          kind: f.kind,
          title: f.title,
          message: f.message,
          link: f.link,
          isRead: false,
          createdAt: f.createdAt,
        };
        setState((s) =>
          s.status === 'ready' && !s.items.some((i) => i.id === item.id)
            ? { status: 'ready', items: [item, ...s.items], total: s.total + 1 }
            : s,
        );
      }),
    [],
  );

  const pick = (next: 'all' | 'unread') => {
    if (next === filter) return;
    setState({ status: 'loading' });
    setPage(1);
    setFilter(next);
  };

  const retry = () => {
    setState({ status: 'loading' });
    fetchPage(filter, 1)
      .then((data) => setState({ status: 'ready', items: data.items, total: data.total }))
      .catch(() => setState({ status: 'error' }));
  };

  const loadMore = async () => {
    if (state.status !== 'ready') return;
    setLoadingMore(true);
    try {
      const data = await fetchPage(filter, page + 1);
      setPage(page + 1);
      setState({ status: 'ready', items: [...state.items, ...data.items], total: data.total });
    } catch (error) {
      Notification.error({ text: Helper.getErrorMessage(error, t('notify.list.loadError')) });
    } finally {
      setLoadingMore(false);
    }
  };

  const open = (item: NotificationItem) => {
    if (!item.isRead) {
      setState((s) =>
        s.status === 'ready' ? { ...s, items: s.items.map((i) => (i.id === item.id ? { ...i, isRead: true } : i)) } : s,
      );
      NotificationStore.setUnread(unread - 1);
      NotificationApi.read(item.id).catch(() => undefined);
    }
    if (item.link) navigate(item.link);
  };

  const readAll = async () => {
    try {
      await NotificationApi.readAll();
      NotificationStore.setUnread(0);
      setState((s) =>
        s.status === 'ready'
          ? filter === 'unread'
            ? { status: 'ready', items: [], total: 0 }
            : { ...s, items: s.items.map((i) => ({ ...i, isRead: true })) }
          : s,
      );
    } catch (error) {
      Notification.error({ text: Helper.getErrorMessage(error, t('notify.list.readAllError')) });
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-180 flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-h1">{title}</h1>
          <p className="text-body">{intro}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Chip pressed={filter === 'all'} onClick={() => pick('all')}>
            {t('notify.list.all')}
          </Chip>
          <Chip pressed={filter === 'unread'} onClick={() => pick('unread')}>
            {t('notify.list.unread')} <span className="text-[12px] tabular-nums opacity-80">{unread}</span>
          </Chip>
        </div>
      </div>

      <section aria-label={title} className="flex flex-col gap-0">
        <div className="border-line-strong flex items-center justify-between gap-3 border-b-[1.5px] py-2 pr-2 pl-4">
          <b className="text-[16px]">
            {title}
            {unread > 0 && (
              <span className="text-ink-muted ml-1 text-[14px] font-normal">
                · {t('notify.list.unreadCount', { count: unread })}
              </span>
            )}
          </b>
          <Chip onClick={() => void readAll()} disabled={unread === 0}>
            {t('notify.list.markAllRead')}
          </Chip>
        </div>

        {state.status === 'loading' && (
          <p className="text-small text-ink-muted px-4 py-6">{t('notify.list.loading')}</p>
        )}

        {state.status === 'error' && (
          <DataState
            variant="error"
            className="mt-4"
            title={t('notify.list.errorTitle')}
            text={t('notify.list.errorText')}
            action={
              <Button variant="secondary" size="sm" onClick={retry}>
                {t('notify.settings.retry')}
              </Button>
            }
          />
        )}

        {state.status === 'ready' && state.items.length === 0 && (
          <DataState
            className="mt-4"
            title={filter === 'unread' ? t('notify.list.emptyUnreadTitle') : t('notify.list.emptyTitle')}
            text={t('notify.list.emptyText')}
          />
        )}

        {state.status === 'ready' && state.items.length > 0 && (
          <ul className="m-0 flex flex-col p-0">
            {state.items.map((n) => {
              const { Icon, className } = iconOf(n.kind);
              const at = new Date(n.createdAt);
              return (
                <li key={n.id} className="border-line border-t first:border-t-0">
                  <button
                    type="button"
                    onClick={() => open(n)}
                    className={Helper.cn(
                      'hover:bg-surface-sunken focus-visible:outline-focus grid w-full cursor-pointer grid-cols-[32px_1fr_auto] gap-3 px-4 py-3 text-left focus-visible:outline-2',
                      !n.isRead && 'bg-highlight',
                    )}
                  >
                    <span className={Helper.cn('grid size-8 place-items-center rounded-full', className)}>
                      <Icon size={16} />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[14px] font-bold">
                        {n.title}
                        {!n.isRead && (
                          <span
                            aria-hidden="true"
                            className="bg-brand ml-1.5 inline-block size-2 rounded-full align-middle"
                          />
                        )}
                        {!n.isRead && <span className="sr-only"> · {t('notify.list.unreadMark')}</span>}
                      </span>
                      <span className="text-ink-muted mt-0.5 block text-[14px] break-words">{n.message}</span>
                    </span>
                    <span className="text-ink-muted text-[12px] whitespace-nowrap">
                      {formatDate(at)} {formatTime(at)}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        {state.status === 'ready' && state.items.length < state.total && (
          <div className="flex justify-center pt-4">
            <Button variant="secondary" size="sm" disabled={loadingMore} onClick={() => void loadMore()}>
              {loadingMore ? t('notify.list.loading') : t('notify.list.more')}
            </Button>
          </div>
        )}
      </section>
    </div>
  );
};

export default NotificationList;

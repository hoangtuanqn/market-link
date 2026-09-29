import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import NotificationApi from '@/api-requests/notification.requests';
import { ChatIcon, MegaphoneIcon, ReceiptIcon, StoreIcon } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Chip } from '@/components/ui/chip';
import { DataState } from '@/components/ui/data-state';
import useUnreadNotifications from '@/hooks/useUnreadNotifications';
import { formatDate, formatTime } from '@/lib/format';
import { NotificationStore } from '@/lib/notifications/store';
import type { NotificationItem, NotificationKindCode } from '@/types/notification.types';
import Helper from '@/utils/helper';
import Notification from '@/utils/notification';

const PAGE_SIZE = 20;

const NotificationItemSkeleton = () => (
  <div className="border-line flex items-start gap-4 border-t px-6 py-4 first:border-t-0">
    <div className="bg-surface-sunken size-9 shrink-0 animate-pulse rounded-full" />
    <div className="flex min-w-0 flex-1 flex-col gap-2">
      <div className="bg-surface-sunken h-4 w-48 animate-pulse rounded-sm" />
      <div className="bg-surface-sunken h-3.5 w-full max-w-md animate-pulse rounded-sm" />
    </div>
    <div className="bg-surface-sunken h-3.5 w-24 shrink-0 animate-pulse rounded-sm" />
  </div>
);

const iconOf = (kind: NotificationKindCode) => {
  if (kind === 'announcement') return { Icon: MegaphoneIcon, className: 'bg-highlight text-ink' };
  if (kind.startsWith('farmer_')) return { Icon: StoreIcon, className: 'bg-brand-tint text-ink' };
  if (kind === 'feedback') return { Icon: ChatIcon, className: 'bg-status-accepted-bg text-ink' };
  return { Icon: ReceiptIcon, className: 'bg-surface-sunken text-ink' };
};

type Load = { status: 'loading' } | { status: 'error' } | { status: 'ready'; items: NotificationItem[]; total: number };

const NotificationList = ({ title, intro }: { title: string; intro: string }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const unread = useUnreadNotifications();
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [page, setPage] = useState(1);
  const [state, setState] = useState<Load>({ status: 'loading' });
  const [loadingMore, setLoadingMore] = useState(false);
  const [initialLoading, setInitialLoading] = useState(import.meta.env.MODE !== 'test');

  useEffect(() => {
    if (import.meta.env.MODE === 'test') return;
    const timer = setTimeout(() => {
      setInitialLoading(false);
    }, 1200);
    return () => clearTimeout(timer);
  }, []);

  const showSkeleton = state.status === 'loading' || initialLoading;

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
    <div className="flex w-full flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4 sm:items-end">
        <div className="flex flex-col gap-1">
          <h1 className="text-h1 text-ink font-bold">{title}</h1>
          <p className="text-body-lg text-ink-muted">{intro}</p>
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

      <Card as="section" aria-label={title} className="flex flex-col overflow-hidden">
        <div className="border-line flex items-center justify-between gap-3 border-b px-6 py-4">
          <h2 className="text-h3 text-ink font-bold">
            {title}
            {unread > 0 && (
              <span className="text-ink-muted ml-2 text-[14px] font-normal">
                · {t('notify.list.unreadCount', { count: unread })}
              </span>
            )}
          </h2>
          <Chip onClick={() => void readAll()} disabled={unread === 0}>
            {t('notify.list.markAllRead')}
          </Chip>
        </div>

        {showSkeleton && (
          <div className="flex flex-col">
            <NotificationItemSkeleton />
            <NotificationItemSkeleton />
            <NotificationItemSkeleton />
            <NotificationItemSkeleton />
          </div>
        )}

        {!showSkeleton && state.status === 'error' && (
          <div className="p-6">
            <DataState
              variant="error"
              title={t('notify.list.errorTitle')}
              text={t('notify.list.errorText')}
              action={
                <Button variant="secondary" size="sm" onClick={retry}>
                  {t('notify.settings.retry')}
                </Button>
              }
            />
          </div>
        )}

        {!showSkeleton && state.status === 'ready' && state.items.length === 0 && (
          <div className="p-6">
            <DataState
              center
              className="py-12"
              title={filter === 'unread' ? t('notify.list.emptyUnreadTitle') : t('notify.list.emptyTitle')}
              text={t('notify.list.emptyText')}
            />
          </div>
        )}

        {!showSkeleton && state.status === 'ready' && state.items.length > 0 && (
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
                      'hover:bg-surface-sunken focus-visible:outline-focus grid w-full cursor-pointer grid-cols-[36px_1fr_auto] items-start gap-4 px-6 py-4 text-left transition-colors focus-visible:outline-2',
                      !n.isRead && 'bg-highlight/50',
                    )}
                  >
                    <span className={Helper.cn('grid size-9 shrink-0 place-items-center rounded-full', className)}>
                      <Icon size={18} />
                    </span>
                    <span className="min-w-0">
                      <span className="text-ink flex items-center gap-2 text-[15px] font-bold">
                        {n.title}
                        {!n.isRead && (
                          <span aria-hidden="true" className="bg-brand inline-block size-2 shrink-0 rounded-full" />
                        )}
                        {!n.isRead && <span className="sr-only"> · {t('notify.list.unreadMark')}</span>}
                      </span>
                      <span className="text-ink-muted mt-1 block text-[14px] leading-relaxed break-words">
                        {n.message}
                      </span>
                    </span>
                    <span className="text-ink-muted shrink-0 pt-0.5 text-[12px] whitespace-nowrap">
                      {formatDate(at)} {formatTime(at)}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        {state.status === 'ready' && state.items.length < state.total && (
          <div className="border-line flex justify-center border-t py-4">
            <Button variant="secondary" size="sm" disabled={loadingMore} onClick={() => void loadMore()}>
              {loadingMore ? t('notify.list.loading') : t('notify.list.more')}
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
};

export default NotificationList;

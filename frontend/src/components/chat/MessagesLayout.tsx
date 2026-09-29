import ConversationPanel from './ConversationPanel';
import ThreadList from './ThreadList';
import { Card } from '@/components/ui/card';
import { useThreadList } from '@/lib/chat/useChat';
import { useSearchParams, useLocation } from 'react-router';
import type { ConversationSummary } from '@/types/chat.types';

type Props = {
  emptyText?: string;
};

export default function MessagesLayout({ emptyText }: Props) {
  const [params, setParams] = useSearchParams();
  const location = useLocation();

  const activeId = Number(params.get('c')) || null;
  const pinnedProductId = Number(params.get('product')) || undefined;
  const pinnedOrderId = Number(params.get('order')) || undefined;

  const { threads, loading, error, reload, hasMore, loadMore, loadingMore } = useThreadList(activeId);

  const fallback = (location.state as { thread?: ConversationSummary } | null)?.thread;
  const active = threads.find((thread) => thread.id === activeId) ?? (fallback?.id === activeId ? fallback : null);

  const onPick = (id: number) => setParams({ c: String(id) });
  const onBack = () => setParams({});

  return (
    <Card className="grid h-[70vh] min-h-96 grid-cols-1 overflow-hidden md:grid-cols-[minmax(0,20rem)_1fr]">
      <div
        className={`border-line-strong min-h-0 overflow-y-auto md:border-r ${activeId === null ? 'block' : 'hidden md:block'}`}
      >
        <ThreadList
          threads={threads}
          activeId={activeId}
          onPick={onPick}
          loading={loading}
          error={error}
          onRetry={reload}
          emptyText={emptyText}
          hasMore={hasMore}
          loadingMore={loadingMore}
          onLoadMore={loadMore}
        />
      </div>
      <div className={`min-h-0 ${activeId === null ? 'hidden md:block' : 'block'}`}>
        <ConversationPanel
          conversationId={activeId}
          thread={active}
          pinnedProductId={pinnedProductId}
          pinnedOrderId={pinnedOrderId}
          onBack={onBack}
          onUnpin={() => setParams({ c: String(activeId) })}
        />
      </div>
    </Card>
  );
}

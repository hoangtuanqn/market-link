import ConversationPanel from './ConversationPanel';
import ThreadList from './ThreadList';
import { Card } from '@/components/ui/card';
import { useThreadList } from '@/lib/chat/useChat';
import { useSearchParams, useLocation } from 'react-router';
import type { ConversationSummary } from '@/types/chat.types';

/**
 * The shared body of both /messages pages (spec §9.3: Farmer reuses the EXACT SAME component as Customer, only the
 * shell differs).
 *
 * Below `md` it is TWO SEPARATE screens (spec §9.2): the list, tapping one opens the conversation, with a back button.
 * Squeezing two columns into 375px is unreadable.
 */
type Props = {
  /** The empty-state sentence, by role (see ThreadList). */
  emptyText?: string;
};

export default function MessagesLayout({ emptyText }: Props) {
  const [params, setParams] = useSearchParams();
  const location = useLocation();

  const activeId = Number(params.get('c')) || null;
  const pinnedProductId = Number(params.get('product')) || undefined;

  // activeId so the hook keeps the open thread's badge at 0 (Review Focus #14)
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
          onBack={onBack}
          onUnpin={() => setParams({ c: String(activeId) })}
        />
      </div>
    </Card>
  );
}

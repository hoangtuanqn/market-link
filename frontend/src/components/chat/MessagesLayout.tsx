import ConversationPanel from './ConversationPanel';
import ThreadList from './ThreadList';
import { Card } from '@/components/ui/card';
import { useThreadList } from '@/lib/chat/useChat';
import { useSearchParams, useLocation } from 'react-router';
import type { ConversationSummary } from '@/types/chat.types';

/**
 * Ruột chung của hai trang /messages (spec §9.3: Farmer dùng lại ĐÚNG component của Customer, chỉ khác vỏ ngoài).
 *
 * Dưới `md` là HAI MÀN riêng (spec §9.2): danh sách, bấm vào mới mở hội thoại, có nút quay lại. Nhồi hai cột vào 375px
 * là không đọc được.
 */
type Props = {
  /** Câu của trạng thái rỗng theo vai (xem ThreadList). */
  emptyText?: string;
};

export default function MessagesLayout({ emptyText }: Props) {
  const [params, setParams] = useSearchParams();
  const location = useLocation();

  const activeId = Number(params.get('c')) || null;
  const pinnedProductId = Number(params.get('product')) || undefined;

  // activeId để hook giữ badge của thread đang mở ở 0 (Review Focus #14)
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

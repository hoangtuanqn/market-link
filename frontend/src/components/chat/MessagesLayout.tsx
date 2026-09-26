import { useState } from 'react';
import ConversationPanel from './ConversationPanel';
import ThreadList from './ThreadList';
import { Card } from '@/components/ui/card';
import { useThreadList } from '@/lib/chat/useChat';

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
  const [activeId, setActiveId] = useState<number | null>(null);
  // activeId để hook giữ badge của thread đang mở ở 0 (Review Focus #14)
  const { threads, loading, error, reload } = useThreadList(activeId);
  const active = threads.find((thread) => thread.id === activeId) ?? null;

  return (
    <Card className="grid h-[70vh] min-h-96 grid-cols-1 overflow-hidden md:grid-cols-[minmax(0,20rem)_1fr]">
      <div
        className={`border-line-strong min-h-0 overflow-y-auto md:border-r ${activeId === null ? 'block' : 'hidden md:block'}`}
      >
        <ThreadList
          threads={threads}
          activeId={activeId}
          onPick={setActiveId}
          loading={loading}
          error={error}
          onRetry={reload}
          emptyText={emptyText}
        />
      </div>
      <div className={`min-h-0 ${activeId === null ? 'hidden md:block' : 'block'}`}>
        <ConversationPanel conversationId={activeId} other={active?.other ?? null} onBack={() => setActiveId(null)} />
      </div>
    </Card>
  );
}

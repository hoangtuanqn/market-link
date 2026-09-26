package com.techx.intervue.modules.conversation.repositories;

import com.techx.intervue.modules.conversation.entities.Message;
import java.util.Collection;
import java.util.List;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface MessageRepository extends JpaRepository<Message, Long> {

    /** Trang đầu: mới nhất trước, bỏ tin đã bị ẩn. Pageable chỉ mang page size. */
    List<Message> findByConversationIdAndHiddenAtIsNullOrderByIdDesc(
            Long conversationId, Pageable pageable);

    /** Các trang sau: keyset theo id, để cuộn lên không bị trùng khi có tin mới chen vào. */
    List<Message> findByConversationIdAndIdLessThanAndHiddenAtIsNullOrderByIdDesc(
            Long conversationId, Long before, Pageable pageable);

    /**
     * Ngữ cảnh cho admin (spec §8.3) — KHÔNG lọc hiddenAt: admin phải thấy được tin mình vừa ẩn.
     * Đừng dùng hai method này cho người dùng thường; hai method có `HiddenAtIsNull` ở trên mới là
     * của họ.
     */
    List<Message> findByConversationIdAndIdLessThanOrderByIdDesc(
            Long conversationId, Long before, Pageable pageable);

    List<Message> findByConversationIdAndIdGreaterThanOrderByIdAsc(
            Long conversationId, Long after, Pageable pageable);

    interface UnreadRow {
        Long getConversationId();

        long getTotal();
    }

    /**
     * Chưa đọc = tin của người kia, chưa bị ẩn, tạo sau mốc read_at của mình trong thread đó. Gộp
     * theo thread cho một trang danh sách; ids không được rỗng (service tự chặn).
     */
    @Query(
            "select m.conversationId as conversationId, count(m) as total"
                    + " from Message m, Conversation c"
                    + " where c.id = m.conversationId and c.id in :ids"
                    + " and m.hiddenAt is null and m.senderId <> :me"
                    + " and ((c.userAId = :me and (c.userAReadAt is null or m.createdAt > c.userAReadAt))"
                    + "   or (c.userBId = :me and (c.userBReadAt is null or m.createdAt > c.userBReadAt)))"
                    + " group by m.conversationId")
    List<UnreadRow> countUnreadByConversation(
            @Param("me") Long me, @Param("ids") Collection<Long> ids);

    /** FR-113: tổng chưa đọc trên mọi thread của mình, cho badge header. */
    @Query(
            "select count(m) from Message m, Conversation c"
                    + " where c.id = m.conversationId"
                    + " and (c.userAId = :me or c.userBId = :me)"
                    + " and m.hiddenAt is null and m.senderId <> :me"
                    + " and ((c.userAId = :me and (c.userAReadAt is null or m.createdAt > c.userAReadAt))"
                    + "   or (c.userBId = :me and (c.userBReadAt is null or m.createdAt > c.userBReadAt)))")
    long countUnread(@Param("me") Long me);
}

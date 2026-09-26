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

    /** First page: newest first, skipping hidden messages. Pageable only carries the page size. */
    List<Message> findByConversationIdAndHiddenAtIsNullOrderByIdDesc(
            Long conversationId, Pageable pageable);

    /**
     * Later pages: keyset by id, so scrolling up does not get duplicates when new messages slip in.
     */
    List<Message> findByConversationIdAndIdLessThanAndHiddenAtIsNullOrderByIdDesc(
            Long conversationId, Long before, Pageable pageable);

    /**
     * Context for admins (spec §8.3) — does NOT filter hiddenAt: an admin must be able to see the
     * message they just hid. Do not use these two methods for ordinary users; the two with
     * `HiddenAtIsNull` above are theirs.
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
     * Unread = the other person's messages, not hidden, created after my read_at marker in that
     * thread. Grouped by thread for a list page; ids must not be empty (the service guards this).
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

    /** FR-113: total unread across all my threads, for the header badge. */
    @Query(
            "select count(m) from Message m, Conversation c"
                    + " where c.id = m.conversationId"
                    + " and (c.userAId = :me or c.userBId = :me)"
                    + " and m.hiddenAt is null and m.senderId <> :me"
                    + " and ((c.userAId = :me and (c.userAReadAt is null or m.createdAt > c.userAReadAt))"
                    + "   or (c.userBId = :me and (c.userBReadAt is null or m.createdAt > c.userBReadAt)))")
    long countUnread(@Param("me") Long me);
}

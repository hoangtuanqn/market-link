package com.techx.intervue.modules.conversation.repositories;

import com.techx.intervue.modules.conversation.entities.Conversation;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface ConversationRepository extends JpaRepository<Conversation, Long> {

    /** Gọi với cặp đã chuẩn hoá (userAId < userBId), xem Conversation.between. */
    Optional<Conversation> findByUserAIdAndUserBId(Long userAId, Long userBId);

    /** Thread của chính mình, mới nhất trước; thread chưa có tin nào xếp theo lúc tạo. */
    @Query(
            "select c from Conversation c where c.userAId = :me or c.userBId = :me"
                    + " order by coalesce(c.lastMessageAt, c.createdAt) desc, c.id desc")
    Page<Conversation> findMine(@Param("me") Long me, Pageable pageable);
}

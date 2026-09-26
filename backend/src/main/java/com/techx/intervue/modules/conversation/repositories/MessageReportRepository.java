package com.techx.intervue.modules.conversation.repositories;

import com.techx.intervue.modules.conversation.entities.MessageReport;
import com.techx.intervue.modules.conversation.enums.ReportStatus;
import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface MessageReportRepository extends JpaRepository<MessageReport, Long> {

    /** Một người báo một tin đúng một lần — kiểm trước để trả 409 thay vì để UNIQUE ném 500. */
    boolean existsByMessageIdAndReportedBy(Long messageId, Long reportedBy);

    /** Spec §8.3: câu hỏi quyết định admin có được đọc một tin hay không. */
    boolean existsByMessageId(Long messageId);

    Page<MessageReport> findByStatusOrderByCreatedAtDesc(ReportStatus status, Pageable pageable);

    Page<MessageReport> findAllByOrderByCreatedAtDesc(Pageable pageable);

    List<MessageReport> findByMessageId(Long messageId);
}

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

    boolean existsByMessageIdAndReportedBy(Long messageId, Long reportedBy);

    boolean existsByMessageId(Long messageId);

    Page<MessageReport> findByStatusOrderByCreatedAtDesc(ReportStatus status, Pageable pageable);

    Page<MessageReport> findAllByOrderByCreatedAtDesc(Pageable pageable);

    List<MessageReport> findByMessageId(Long messageId);
}

package com.techx.intervue.modules.farmer.resources;

import com.techx.intervue.modules.farmer.enums.ApprovalStatus;
import java.time.Instant;
import java.util.List;
import lombok.Builder;

/** Một lần nộp đơn đã qua: nội dung lúc nộp, kết quả và lý do nếu bị từ chối. */
@Builder
public record FarmerApplicationHistoryResource(
        Long id,
        Integer attempt,
        String stallName,
        String contactPerson,
        String description,
        List<String> photoUrls,
        String videoUrl,
        ApprovalStatus status,
        String rejectReason,
        Instant decidedAt,
        Instant submittedAt) {}

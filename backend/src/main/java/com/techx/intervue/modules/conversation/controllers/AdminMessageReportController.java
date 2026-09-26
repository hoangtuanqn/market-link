package com.techx.intervue.modules.conversation.controllers;

import com.techx.intervue.controllers.BaseController;
import com.techx.intervue.modules.conversation.enums.ReportStatus;
import com.techx.intervue.modules.conversation.resources.AdminReportListItemResource;
import com.techx.intervue.modules.conversation.services.interfaces.ModerationServiceInterface;
import com.techx.intervue.modules.user.exceptions.InvalidFieldException;
import com.techx.intervue.resources.ApiResource;
import com.techx.intervue.resources.PageResource;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import java.util.Locale;
import lombok.AllArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * FR-116 — chỉ Admin. **Không có endpoint nào đọc một conversationId tuỳ ý** (spec §8.3): mọi thứ
 * admin thấy đều bắt đầu từ một báo cáo.
 */
@Validated
@RestController
@RequestMapping("/api/v1/admin/message-reports")
@PreAuthorize("hasRole('ADMIN')")
@AllArgsConstructor
public class AdminMessageReportController extends BaseController {

    private final ModerationServiceInterface moderation;

    @GetMapping
    public ResponseEntity<ApiResource<PageResource<AdminReportListItemResource>>> list(
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "1") @Min(1) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(50) int pageSize) {
        return ok(moderation.list(parseStatus(status), page, pageSize), "Reports loaded.");
    }

    /** Giá trị lạ → 400 qua handler, không âm thầm trả về cả danh sách. */
    private static ReportStatus parseStatus(String status) {
        if (status == null || status.isBlank()) {
            return null;
        }
        try {
            return ReportStatus.valueOf(status.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException e) {
            throw new InvalidFieldException(
                    "status", "Status must be one of: new, reviewed, actioned.");
        }
    }
}

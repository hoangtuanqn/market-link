package com.techx.intervue.modules.conversation.controllers;

import com.techx.intervue.controllers.BaseController;
import com.techx.intervue.modules.conversation.enums.ReportStatus;
import com.techx.intervue.modules.conversation.resources.AdminReportDetailResource;
import com.techx.intervue.modules.conversation.resources.AdminReportListItemResource;
import com.techx.intervue.modules.conversation.resources.MessageReportResource;
import com.techx.intervue.modules.conversation.services.interfaces.ModerationServiceInterface;
import com.techx.intervue.modules.user.exceptions.InvalidFieldException;
import com.techx.intervue.modules.user.resources.CustomUserDetails;
import com.techx.intervue.resources.ApiResource;
import com.techx.intervue.resources.PageResource;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import java.util.Locale;
import lombok.AllArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * FR-116 — Admin only. **No endpoint reads an arbitrary conversationId** (spec §8.3): everything an
 * admin sees starts from a report.
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

    @GetMapping("/{id}")
    public ResponseEntity<ApiResource<AdminReportDetailResource>> detail(@PathVariable Long id) {
        return ok(moderation.detail(id), "Report loaded.");
    }

    /**
     * Not in the API table of spec §6.1, added on purpose: the queue is filtered by status=new, so
     * if there is no way to move a report to reviewed, every report an admin looked at and decided
     * NOT to hide would stay `new` forever and the queue becomes useless after a few days.
     */
    @PatchMapping("/{id}/dismiss")
    public ResponseEntity<ApiResource<MessageReportResource>> dismiss(
            @PathVariable Long id, @AuthenticationPrincipal CustomUserDetails admin) {
        return ok(moderation.dismiss(admin.getId(), id), "Report dismissed.");
    }

    /** An unknown value → 400 through the handler, instead of silently returning the whole list. */
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

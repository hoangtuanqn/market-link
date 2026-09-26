package com.techx.intervue.modules.feedback.controllers;

import com.techx.intervue.controllers.BaseController;
import com.techx.intervue.modules.feedback.requests.FeedbackStatusRequest;
import com.techx.intervue.modules.feedback.resources.FeedbackResource;
import com.techx.intervue.modules.feedback.services.interfaces.FeedbackServiceInterface;
import com.techx.intervue.resources.ApiResource;
import com.techx.intervue.resources.PageResource;
import jakarta.validation.Valid;
import lombok.AllArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** FR-081 — the admin queue: {@code GET /admin/feedbacks}, {@code PATCH .../{id}/status}. */
@RestController
@RequestMapping("/api/v1/admin/feedbacks")
@PreAuthorize("hasRole('ADMIN')")
@AllArgsConstructor
public class AdminFeedbackController extends BaseController {

    private final FeedbackServiceInterface feedbacks;

    @GetMapping
    public ResponseEntity<ApiResource<PageResource<FeedbackResource>>> list(
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int pageSize) {
        return ok(feedbacks.listForAdmin(status, page, pageSize), "Feedback loaded.");
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<ApiResource<FeedbackResource>> setStatus(
            @PathVariable long id, @Valid @RequestBody FeedbackStatusRequest request) {
        return ok(feedbacks.setStatus(id, request.status()), "Status updated.");
    }
}

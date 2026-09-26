package com.techx.intervue.modules.feedback.controllers;

import com.techx.intervue.controllers.BaseController;
import com.techx.intervue.modules.feedback.requests.CreateFeedbackRequest;
import com.techx.intervue.modules.feedback.resources.FeedbackResource;
import com.techx.intervue.modules.feedback.services.interfaces.FeedbackServiceInterface;
import com.techx.intervue.modules.user.resources.CustomUserDetails;
import com.techx.intervue.resources.ApiResource;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.AllArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** FR-081 — {@code POST /feedbacks}, Public (contract §11); whitelisted in SecurityConfig. */
@RestController
@RequestMapping("/api/v1/feedbacks")
@AllArgsConstructor
public class FeedbackController extends BaseController {

    private final FeedbackServiceInterface feedbacks;

    @PostMapping
    public ResponseEntity<ApiResource<FeedbackResource>> submit(
            @Valid @RequestBody CreateFeedbackRequest request,
            @AuthenticationPrincipal CustomUserDetails user,
            HttpServletRequest http) {
        Long userId = user == null ? null : user.getId();
        return created(
                feedbacks.submit(userId, clientKey(http), request),
                "Thanks, we read every message.");
    }

    /** Behind the compose proxy the real address is the first X-Forwarded-For entry. */
    private static String clientKey(HttpServletRequest http) {
        String forwarded = http.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            return forwarded.split(",")[0].trim();
        }
        return http.getRemoteAddr();
    }
}

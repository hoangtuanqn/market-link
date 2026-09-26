package com.techx.intervue.modules.conversation.controllers;

import com.techx.intervue.controllers.BaseController;
import com.techx.intervue.modules.conversation.requests.OpenConversationRequest;
import com.techx.intervue.modules.conversation.requests.SendMessageRequest;
import com.techx.intervue.modules.conversation.resources.ConversationResource;
import com.techx.intervue.modules.conversation.resources.MessageResource;
import com.techx.intervue.modules.conversation.resources.PagedResource;
import com.techx.intervue.modules.conversation.resources.UnreadCountResource;
import com.techx.intervue.modules.conversation.services.interfaces.ConversationServiceInterface;
import com.techx.intervue.modules.conversation.services.interfaces.MessageServiceInterface;
import com.techx.intervue.modules.user.resources.CustomUserDetails;
import com.techx.intervue.resources.ApiResource;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import java.util.List;
import lombok.AllArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * FR-110, FR-113, FR-114 — chat người-với-người. Khác hẳn chatbot ở /api/v1/chat (FR-090). Mọi
 * route đều cần đăng nhập (SecurityConfig: anyRequest().authenticated()).
 */
@Validated
@RestController
@RequestMapping("/api/v1/conversations")
@AllArgsConstructor
public class ConversationController extends BaseController {

    private final ConversationServiceInterface conversationService;
    private final MessageServiceInterface messageService;

    @PostMapping
    public ResponseEntity<ApiResource<ConversationResource>> open(
            @Valid @RequestBody OpenConversationRequest request,
            @AuthenticationPrincipal CustomUserDetails me) {
        return created(conversationService.open(me.getId(), request), "Conversation ready.");
    }

    @GetMapping
    public ResponseEntity<ApiResource<PagedResource<ConversationResource>>> listMine(
            @RequestParam(defaultValue = "1") @Min(1) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(50) int size,
            @AuthenticationPrincipal CustomUserDetails me) {
        return ok(conversationService.listMine(me.getId(), page, size), "OK");
    }

    @GetMapping("/unread-count")
    public ResponseEntity<ApiResource<UnreadCountResource>> unreadCount(
            @AuthenticationPrincipal CustomUserDetails me) {
        return ok(conversationService.unreadCount(me.getId()), "OK");
    }

    @GetMapping("/{id}/messages")
    public ResponseEntity<ApiResource<List<MessageResource>>> messages(
            @PathVariable Long id,
            @RequestParam(required = false) Long before,
            @RequestParam(defaultValue = "30") @Min(1) @Max(50) int size,
            @AuthenticationPrincipal CustomUserDetails me) {
        return ok(messageService.list(me.getId(), id, before, size), "OK");
    }

    @PostMapping("/{id}/messages")
    public ResponseEntity<ApiResource<MessageResource>> send(
            @PathVariable Long id,
            @Valid @RequestBody SendMessageRequest request,
            @AuthenticationPrincipal CustomUserDetails me) {
        return created(messageService.send(me.getId(), id, request), "Sent.");
    }

    @PostMapping("/{id}/read")
    public ResponseEntity<ApiResource<Void>> markRead(
            @PathVariable Long id, @AuthenticationPrincipal CustomUserDetails me) {
        conversationService.markRead(me.getId(), id);
        return ok(null, "Marked as read.");
    }
}

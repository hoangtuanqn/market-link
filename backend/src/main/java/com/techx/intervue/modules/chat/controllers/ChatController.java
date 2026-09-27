package com.techx.intervue.modules.chat.controllers;

import com.techx.intervue.controllers.BaseController;
import com.techx.intervue.modules.chat.enums.AssistantAudience;
import com.techx.intervue.modules.chat.requests.ChatRequest;
import com.techx.intervue.modules.chat.resources.ChatMessageResource;
import com.techx.intervue.modules.chat.resources.ChatReplyResource;
import com.techx.intervue.modules.chat.services.interfaces.ChatServiceInterface;
import com.techx.intervue.modules.user.resources.CustomUserDetails;
import com.techx.intervue.resources.ApiResource;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Pattern;
import java.util.List;
import java.util.stream.Collectors;
import lombok.AllArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * FR-090…092 — public, guests can use it; with a token the user_id is attached to the history.
 * Signed-in customer-panel accounts (Customer, and a Farmer shopping as a customer — FR-005) are
 * answered by the Claude assistant; guests and admins by the keyword engine.
 */
@Validated
@RestController
@RequestMapping("/api/v1/chat")
@AllArgsConstructor
public class ChatController extends BaseController {

    private final ChatServiceInterface chatService;

    @PostMapping
    public ResponseEntity<ApiResource<ChatReplyResource>> chat(
            @Valid @RequestBody ChatRequest request,
            @AuthenticationPrincipal CustomUserDetails user) {
        Long userId = user == null ? null : user.getId();
        return ok(chatService.reply(request, userId, audienceOf(user)), "OK");
    }

    @GetMapping("/history")
    public ResponseEntity<ApiResource<List<ChatMessageResource>>> history(
            @RequestParam
                    @Pattern(regexp = "^[A-Za-z0-9_-]{8,64}$", message = "Session key invalid!")
                    String sessionKey,
            @AuthenticationPrincipal CustomUserDetails user) {
        Long userId = user == null ? null : user.getId();
        return ok(chatService.history(sessionKey, userId), "OK");
    }

    /**
     * Which assistant the caller gets, from the authenticated principal only (FR-093, FR-094). A
     * guest, or an account with none of the three roles, gets null and the keyword engine answers.
     */
    private static AssistantAudience audienceOf(CustomUserDetails user) {
        if (user == null) {
            return null;
        }
        return AssistantAudience.of(
                user.getAuthorities().stream()
                        .map(GrantedAuthority::getAuthority)
                        .collect(Collectors.toSet()));
    }
}

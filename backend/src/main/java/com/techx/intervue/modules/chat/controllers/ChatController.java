package com.techx.intervue.modules.chat.controllers;

import com.techx.intervue.controllers.BaseController;
import com.techx.intervue.filters.JwtAuthFilter;
import com.techx.intervue.modules.chat.enums.AssistantAudience;
import com.techx.intervue.modules.chat.requests.ChatRequest;
import com.techx.intervue.modules.chat.resources.ChatMessageResource;
import com.techx.intervue.modules.chat.resources.ChatReplyResource;
import com.techx.intervue.modules.chat.resources.FarmerBriefingResource;
import com.techx.intervue.modules.chat.services.interfaces.ChatServiceInterface;
import com.techx.intervue.modules.user.resources.CustomUserDetails;
import com.techx.intervue.resources.ApiResource;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Pattern;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;
import lombok.AllArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
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
 * FR-090…094 — public, guests can use it; with a token the user_id is attached to the history.
 * Signed-in Customers, Farmers and Admins are answered by the Claude assistant, each with the tools
 * of their role. Guests, and an admin who has not finished the mandatory two-step setup (FR-008),
 * get the keyword engine.
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
     *
     * <p>So does an admin whose session JwtAuthFilter marked {@code MFA_SETUP_PENDING}: that
     * session is refused on /api/v1/admin/** (FR-008), and the admin tools read the same private
     * data — accounts with their emails, platform revenue, the feedback inbox.
     */
    private static AssistantAudience audienceOf(CustomUserDetails user) {
        if (user == null) {
            return null;
        }
        Set<String> authorities =
                user.getAuthorities().stream()
                        .map(GrantedAuthority::getAuthority)
                        .collect(Collectors.toSet());
        if (authorities.contains(JwtAuthFilter.MFA_SETUP_PENDING)) {
            return null;
        }
        return AssistantAudience.of(authorities);
    }

    /**
     * FR-093: the Farmer Overview banner. Farmer only, and the stall is resolved from the
     * principal, so there is nothing in the request that could point at another stall.
     */
    @GetMapping("/farmer-briefing")
    @PreAuthorize("hasRole('FARMER')")
    public ResponseEntity<ApiResource<FarmerBriefingResource>> farmerBriefing(
            @AuthenticationPrincipal CustomUserDetails user) {
        return ok(chatService.farmerBriefing(user == null ? null : user.getId()), "OK");
    }
}

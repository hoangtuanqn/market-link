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

    @GetMapping("/farmer-briefing")
    @PreAuthorize("hasRole('FARMER')")
    public ResponseEntity<ApiResource<FarmerBriefingResource>> farmerBriefing(
            @AuthenticationPrincipal CustomUserDetails user) {
        return ok(chatService.farmerBriefing(user == null ? null : user.getId()), "OK");
    }
}

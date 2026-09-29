package com.techx.intervue.modules.chat.controllers;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

import com.techx.intervue.filters.JwtAuthFilter;
import com.techx.intervue.modules.chat.enums.AssistantAudience;
import com.techx.intervue.modules.chat.requests.ChatRequest;
import com.techx.intervue.modules.chat.services.interfaces.ChatServiceInterface;
import com.techx.intervue.modules.user.resources.CustomUserDetails;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.security.core.authority.SimpleGrantedAuthority;

class ChatControllerTest {

    private final ChatServiceInterface service = mock(ChatServiceInterface.class);
    private final ChatController controller = new ChatController(service);
    private final ChatRequest request = new ChatRequest("session-123", "platform totals");

    private static CustomUserDetails user(String... authorities) {
        return CustomUserDetails.builder()
                .id(1L)
                .email("admin@marketlink.vn")
                .authorities(
                        List.of(authorities).stream().map(SimpleGrantedAuthority::new).toList())
                .build();
    }

    @Test
    void anAdminWhoFinishedTwoStepSetupGetsTheAdminAssistant() {
        controller.chat(request, user("ROLE_ADMIN"));

        verify(service).reply(request, 1L, AssistantAudience.ADMIN);
    }

    @Test
    void anAdminStillOwingTwoStepSetupGetsOnlyTheKeywordEngine() {
        controller.chat(request, user("ROLE_ADMIN", JwtAuthFilter.MFA_SETUP_PENDING));

        verify(service).reply(request, 1L, null);
    }

    @Test
    void aGuestGetsTheKeywordEngine() {
        controller.chat(request, null);

        verify(service).reply(request, null, null);
    }
}

package com.techx.intervue.config;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.techx.intervue.filters.JwtAuthFilter;
import com.techx.intervue.filters.MaintenanceModeFilter;
import com.techx.intervue.filters.TraceIdFilter;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.authentication.InsufficientAuthenticationException;

class SecurityConfigEntryPointTest {

    private final ObjectMapper objectMapper = new ObjectMapper().findAndRegisterModules();

    @Test
    void missingTokenIsA401AskingToSignIn() throws Exception {
        SecurityConfig config =
                new SecurityConfig(
                        objectMapper,
                        mock(JwtAuthFilter.class),
                        mock(TraceIdFilter.class),
                        mock(MaintenanceModeFilter.class));
        MockHttpServletResponse response = new MockHttpServletResponse();

        config.signInRequired()
                .commence(
                        new MockHttpServletRequest("GET", "/api/v1/notifications"),
                        response,
                        new InsufficientAuthenticationException(
                                "Full authentication is required to access this resource"));

        assertThat(response.getStatus()).isEqualTo(401);
        JsonNode body = objectMapper.readTree(response.getContentAsString());
        assertThat(body.get("success").asBoolean()).isFalse();
        assertThat(body.get("message").asText()).isEqualTo("Please sign in to continue.");
        assertThat(body.get("error").get("code").asText()).isEqualTo("UNAUTHORIZED");
        assertThat(response.getContentAsString()).doesNotContain("Full authentication");
    }
}

package com.techx.intervue.modules.user.controllers;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.techx.intervue.config.AuthConfig;
import com.techx.intervue.modules.user.enums.RoleType;
import com.techx.intervue.modules.user.requests.MfaCodeRequest;
import com.techx.intervue.modules.user.resources.AuthResult;
import com.techx.intervue.modules.user.resources.CustomUserDetails;
import com.techx.intervue.modules.user.resources.MfaEnabledResource;
import com.techx.intervue.modules.user.resources.UserResource;
import com.techx.intervue.modules.user.services.interfaces.MfaServiceInterface;
import com.techx.intervue.modules.user.services.interfaces.UserServiceInterface;
import com.techx.intervue.resources.ApiResource;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.mockito.InOrder;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;

class MfaControllerEnableTest {

    @Test
    void enablingRestartsTheSessionAndReturnsTheNewToken() {
        MfaServiceInterface mfaService = mock(MfaServiceInterface.class);
        UserServiceInterface userService = mock(UserServiceInterface.class);
        AuthConfig authConfig = mock(AuthConfig.class);
        when(authConfig.getRefreshTokenTTLDays()).thenReturn(14);
        when(authConfig.isCookieSecure()).thenReturn(true);
        when(mfaService.enable(1L, "123456")).thenReturn(List.of("aaaa-bbbb-cccc"));
        UserResource admin = UserResource.builder().id(1L).role(RoleType.ADMIN).build();
        when(userService.restartSession(1L))
                .thenReturn(new AuthResult("new-access", "new-refresh", admin, false));
        MfaController controller = new MfaController(mfaService, userService, authConfig);
        CustomUserDetails user = CustomUserDetails.builder().id(1L).email("a@b.c").build();

        ResponseEntity<ApiResource<MfaEnabledResource>> response =
                controller.enable(user, new MfaCodeRequest("123456"));

        InOrder order = inOrder(mfaService, userService);
        order.verify(mfaService).enable(1L, "123456");
        order.verify(userService).restartSession(1L);
        assertThat(response.getBody().getData().codes()).containsExactly("aaaa-bbbb-cccc");
        assertThat(response.getBody().getData().accessToken()).isEqualTo("new-access");
        assertThat(response.getHeaders().getFirst(HttpHeaders.SET_COOKIE))
                .contains("refresh_token=new-refresh")
                .contains("Secure")
                .doesNotContain("Max-Age");
    }
}

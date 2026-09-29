package com.techx.intervue.filters;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.techx.intervue.modules.platform.services.interfaces.PlatformStatusServiceInterface;
import com.techx.intervue.resources.ApiResource;
import com.techx.intervue.resources.ErrorResource;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
@RequiredArgsConstructor
public class MaintenanceModeFilter extends OncePerRequestFilter {

    private static final String ADMIN_AUTHORITY = "ROLE_ADMIN";

    private final PlatformStatusServiceInterface platformStatus;
    private final ObjectMapper objectMapper;

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getServletPath();
        return !path.startsWith("/api/v1/")
                || path.equals("/api/v1/platform/status")
                || path.startsWith("/api/v1/auth/");
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        if (!platformStatus.isMaintenanceMode() || isAdmin()) {
            filterChain.doFilter(request, response);
            return;
        }

        ErrorResource error = ErrorResource.builder().code("MAINTENANCE_MODE").build();
        response.setStatus(HttpServletResponse.SC_SERVICE_UNAVAILABLE);
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding("UTF-8");
        response.getWriter()
                .write(
                        objectMapper.writeValueAsString(
                                ApiResource.error(
                                        error, "MarketLink is temporarily down for maintenance.")));
    }

    private boolean isAdmin() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return auth != null
                && auth.getAuthorities().stream()
                        .anyMatch(a -> ADMIN_AUTHORITY.equals(a.getAuthority()));
    }
}

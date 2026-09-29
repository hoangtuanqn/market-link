package com.techx.intervue.filters;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.techx.intervue.modules.user.entities.User;
import com.techx.intervue.modules.user.enums.RoleType;
import com.techx.intervue.modules.user.enums.UserStatus;
import com.techx.intervue.modules.user.repositories.UserRepository;
import com.techx.intervue.modules.user.resources.CustomUserDetails;
import com.techx.intervue.modules.user.services.impl.DeactivationMessage;
import com.techx.intervue.modules.user.services.impl.UserSessionCache;
import com.techx.intervue.modules.user.services.interfaces.JwtServiceInterface;
import com.techx.intervue.modules.user.services.interfaces.MfaServiceInterface;
import com.techx.intervue.resources.ApiResource;
import com.techx.intervue.resources.ErrorResource;
import com.techx.intervue.services.interfaces.BlacklistServiceInterface;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.MalformedJwtException;
import io.jsonwebtoken.UnsupportedJwtException;
import io.jsonwebtoken.security.SignatureException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.HashSet;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataAccessException;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
@Slf4j
@RequiredArgsConstructor
public class JwtAuthFilter extends OncePerRequestFilter {
    private final JwtServiceInterface jwtService;
    private final BlacklistServiceInterface blacklistService;
    private final ObjectMapper objectMapper;
    private final UserSessionCache userSessionCache;
    private final MfaServiceInterface mfaService;
    private final UserRepository userRepository;

    public static final String TOKEN_ATTRIBUTE = "jwt_token";

    public static final String MFA_SETUP_PENDING = "MFA_SETUP_PENDING";

    private static final Map<Class<? extends JwtException>, String> JWT_ERRORS_MESSAGES =
            Map.of(
                    MalformedJwtException.class, "Malformed token",
                    ExpiredJwtException.class, "Token has expired",
                    SignatureException.class, "Token was not issued by this system",
                    UnsupportedJwtException.class, "Unsupported token type");

    private static final String REFRESH_PATH = "/api/v1/auth/refresh";

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        return REFRESH_PATH.equals(request.getServletPath());
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        String authHeader = request.getHeader("Authorization");

        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            filterChain.doFilter(request, response);
            return;
        }

        String token = authHeader.substring(7);
        try {
            String jti = jwtService.extractJti(token);
            if (Boolean.TRUE.equals(blacklistService.isRevoked(jti))) {
                writeErrorResponse(response, "Your token is not valid.");
                return;
            }
            request.setAttribute(TOKEN_ATTRIBUTE, token);
            Long userId = jwtService.extractSubject(token);

            if (userId != null && SecurityContextHolder.getContext().getAuthentication() == null) {

                UserSessionCache.SessionData session = userSessionCache.get(userId);

                if (session == null) {
                    writeDeactivationAwareError(response, userId);
                    return;
                }

                if (userSessionCache.isRevoked(userId, jwtService.extractIssuedAt(token))) {
                    writeDeactivationAwareError(response, userId);
                    return;
                }

                Set<GrantedAuthority> authorities = new HashSet<>();
                session.roles()
                        .forEach(r -> authorities.add(new SimpleGrantedAuthority("ROLE_" + r)));
                if (session.roles().contains(RoleType.ADMIN)
                        && mfaService.isSetupRequired(userId)) {
                    authorities.add(new SimpleGrantedAuthority(MFA_SETUP_PENDING));
                }

                CustomUserDetails userDetails =
                        CustomUserDetails.builder()
                                .id(userId)
                                .email(session.email())
                                .authorities(authorities)
                                .build();

                UsernamePasswordAuthenticationToken authToken =
                        new UsernamePasswordAuthenticationToken(userDetails, null, authorities);

                authToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                SecurityContextHolder.getContext().setAuthentication(authToken);
            }
        } catch (JwtException e) {
            String message =
                    JWT_ERRORS_MESSAGES.getOrDefault(e.getClass(), "Token authentication failed.");
            writeErrorResponse(response, message);
            return;

        } catch (DataAccessException e) {
            log.error("Could not check the access token: {}", e.getMessage());
            writeErrorResponse(
                    response,
                    HttpServletResponse.SC_SERVICE_UNAVAILABLE,
                    "SERVICE_UNAVAILABLE",
                    "Something went wrong on our side. Please try again later.");
            return;
        } catch (Exception e) {
            writeErrorResponse(response, "Token authentication failed.");
            return;
        }
        filterChain.doFilter(request, response);
    }

    private void writeErrorResponse(HttpServletResponse response, String message)
            throws IOException {
        writeErrorResponse(response, HttpServletResponse.SC_UNAUTHORIZED, "UNAUTHORIZED", message);
    }

    private void writeDeactivationAwareError(HttpServletResponse response, Long userId)
            throws IOException {
        Optional<User> banned =
                userId == null
                        ? Optional.empty()
                        : userRepository
                                .findById(userId)
                                .filter(u -> u.getStatus() == UserStatus.INACTIVE);
        if (banned.isPresent()) {
            writeErrorResponse(
                    response,
                    HttpServletResponse.SC_UNAUTHORIZED,
                    "ACCOUNT_DEACTIVATED",
                    DeactivationMessage.of(banned.get()));
            return;
        }
        writeErrorResponse(response, "Your session has expired.");
    }

    private void writeErrorResponse(
            HttpServletResponse response, int status, String code, String message)
            throws IOException {
        ErrorResource error = ErrorResource.builder().code(code).build();
        response.setStatus(status);
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding("UTF-8");
        response.getWriter()
                .write(objectMapper.writeValueAsString(ApiResource.error(error, message)));
    }
}

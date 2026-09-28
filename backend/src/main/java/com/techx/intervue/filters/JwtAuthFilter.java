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
@Slf4j // installs the logger
@RequiredArgsConstructor
public class JwtAuthFilter extends OncePerRequestFilter {
    private final JwtServiceInterface jwtService;
    private final BlacklistServiceInterface blacklistService;
    private final ObjectMapper objectMapper;
    private final UserSessionCache userSessionCache;
    private final MfaServiceInterface mfaService;
    private final UserRepository userRepository;

    public static final String TOKEN_ATTRIBUTE = "jwt_token";

    /**
     * FR-008: marks a session belonging to an admin who has never set up two-step verification.
     * Sign-in still hands them a working session — the setup screen needs one to call
     * /auth/mfa/setup — but SecurityConfig refuses /api/v1/admin/** while this is present, so the
     * mandatory step cannot be walked around by calling the API directly.
     */
    public static final String MFA_SETUP_PENDING = "MFA_SETUP_PENDING";

    private static final Map<Class<? extends JwtException>, String> JWT_ERRORS_MESSAGES =
            Map.of(
                    MalformedJwtException.class, "Malformed token",
                    ExpiredJwtException.class, "Token has expired",
                    SignatureException.class, "Token was not issued by this system",
                    UnsupportedJwtException.class, "Unsupported token type");

    /**
     * Refresh uses the cookie only; an expired access token sent along must not break this request.
     */
    private static final String REFRESH_PATH = "/api/v1/auth/refresh";

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        return REFRESH_PATH.equals(request.getServletPath());
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        // 1. Get the token from the header
        String authHeader = request.getHeader("Authorization");

        // 2. No token or wrong format -> skip, continue
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            filterChain.doFilter(request, response); // let it through, do nothing
            return;
        }

        // 3. Extract Token
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
                    // Session expired or was evicted → force logout
                    writeDeactivationAwareError(response, userId);
                    return;
                }

                // Token issued before the sign-out of all devices (password change / reset / ban)
                if (userSessionCache.isRevoked(userId, jwtService.extractIssuedAt(token))) {
                    writeDeactivationAwareError(response, userId);
                    return;
                }

                // Build authorities
                Set<GrantedAuthority> authorities = new HashSet<>();
                session.roles()
                        .forEach(r -> authorities.add(new SimpleGrantedAuthority("ROLE_" + r)));
                // Only admins have a row in admin_mfa; for anyone else the question does not apply.
                if (session.roles().contains(RoleType.ADMIN)
                        && mfaService.isSetupRequired(userId)) {
                    authorities.add(new SimpleGrantedAuthority(MFA_SETUP_PENDING));
                }

                // Build principal
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
            // A Redis / DB failure is not the token's fault: return 503 so the FE does not refresh
            // and then sign the
            // user out
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

    /**
     * The session/token was rejected — usually just an expired or evicted session, but if the user
     * is currently INACTIVE it is a ban: say so with the real reason (FR-072) instead of the
     * generic message, so the FE can send the page home instead of retrying a refresh that can
     * never succeed.
     */
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

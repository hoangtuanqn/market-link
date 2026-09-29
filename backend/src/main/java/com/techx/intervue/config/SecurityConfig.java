package com.techx.intervue.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.techx.intervue.filters.JwtAuthFilter;
import com.techx.intervue.filters.MaintenanceModeFilter;
import com.techx.intervue.filters.TraceIdFilter;
import com.techx.intervue.resources.ApiResource;
import com.techx.intervue.resources.ErrorResource;
import jakarta.servlet.http.HttpServletResponse;
import java.util.List;
import lombok.AllArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.access.expression.WebExpressionAuthorizationManager;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

@AllArgsConstructor
@Configuration
@EnableMethodSecurity
public class SecurityConfig {

    static final String ADMIN_ACCESS = "hasRole('ADMIN') and !hasAuthority('MFA_SETUP_PENDING')";

    static final String SIGNED_IN_ACCESS =
            "isAuthenticated() and !hasAuthority('MFA_SETUP_PENDING')";

    static final String SIGN_IN_MESSAGE = "Please sign in to continue.";

    private final ObjectMapper objectMapper;
    private final JwtAuthFilter jwtAuthFilter;
    private final TraceIdFilter traceIdFilter;
    private final MaintenanceModeFilter maintenanceModeFilter;

    @Bean
    PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    CorsConfigurationSource corsConfigurationSource(
            @Value("${app.cors.allowed-origins}") List<String> allowedOrigins) {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(allowedOrigins);
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("Authorization", "Content-Type"));
        config.setExposedHeaders(List.of("X-Trace-Id", "Retry-After"));
        config.setAllowCredentials(true);
        config.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }

    @Bean
    SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http.csrf(csrf -> csrf.disable())
                .cors(Customizer.withDefaults())
                .authorizeHttpRequests(
                        auth ->
                                auth.requestMatchers("/api/v1/admin/**")
                                        .access(new WebExpressionAuthorizationManager(ADMIN_ACCESS))
                                        .requestMatchers(
                                                "/api/v1/auth/logout",
                                                "/api/v1/auth/set-password",
                                                "/api/v1/auth/change-password",
                                                "/api/v1/auth/me",
                                                "/api/v1/auth/me/avatar",
                                                "/api/v1/auth/me/settings",
                                                "/api/v1/auth/me/achievements",
                                                "/api/v1/auth/mfa",
                                                "/api/v1/auth/mfa/setup",
                                                "/api/v1/auth/mfa/enable",
                                                "/api/v1/auth/mfa/disable",
                                                "/api/v1/auth/mfa/recovery-codes")
                                        .authenticated()
                                        .requestMatchers("/api/v1/auth/**")
                                        .permitAll()
                                        .requestMatchers("/ws", "/ws/**")
                                        .permitAll()
                                        .requestMatchers("/ping")
                                        .permitAll()
                                        .requestMatchers("/error")
                                        .permitAll()
                                        .requestMatchers("/uploads/**")
                                        .permitAll()
                                        .requestMatchers(
                                                "/swagger-ui.html",
                                                "/swagger-ui/**",
                                                "/v3/api-docs/**")
                                        .permitAll()
                                        .requestMatchers("/api/v1/products")
                                        .permitAll()
                                        .requestMatchers(HttpMethod.GET, "/api/v1/deals")
                                        .permitAll()
                                        .requestMatchers(
                                                HttpMethod.GET,
                                                "/api/v1/products/*",
                                                "/api/v1/farmers/*/products")
                                        .permitAll()
                                        .requestMatchers(HttpMethod.GET, "/api/v1/categories")
                                        .permitAll()
                                        .requestMatchers(HttpMethod.GET, "/api/v1/geo/**")
                                        .permitAll()
                                        .requestMatchers(
                                                HttpMethod.GET,
                                                "/api/v1/markets",
                                                "/api/v1/markets/*")
                                        .permitAll()
                                        .requestMatchers(
                                                HttpMethod.GET,
                                                "/api/v1/farmers",
                                                "/api/v1/farmers/*",
                                                "/api/v1/markets/*/farmers",
                                                "/api/v1/farmers/*/slots")
                                        .permitAll()
                                        .requestMatchers(
                                                HttpMethod.GET,
                                                "/api/v1/products/*/reviews",
                                                "/api/v1/farmers/*/reviews")
                                        .permitAll()
                                        .requestMatchers(HttpMethod.POST, "/api/v1/feedbacks")
                                        .permitAll()
                                        .requestMatchers("/api/v1/chat", "/api/v1/chat/history")
                                        .permitAll()
                                        .requestMatchers(
                                                HttpMethod.GET, "/api/v1/announcements/active")
                                        .permitAll()
                                        .requestMatchers(HttpMethod.GET, "/api/v1/platform/status")
                                        .permitAll()
                                        .requestMatchers(
                                                HttpMethod.GET, "/api/v1/attachments/*/stream")
                                        .permitAll()
                                        .anyRequest()
                                        .access(
                                                new WebExpressionAuthorizationManager(
                                                        SIGNED_IN_ACCESS)))
                .sessionManagement(
                        session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .exceptionHandling(ex -> ex.authenticationEntryPoint(signInRequired()))
                .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class)
                .addFilterBefore(traceIdFilter, JwtAuthFilter.class)
                .addFilterAfter(maintenanceModeFilter, JwtAuthFilter.class);

        return http.build();
    }

    AuthenticationEntryPoint signInRequired() {
        return (request, response, authException) -> {
            ErrorResource error =
                    ErrorResource.builder().code("UNAUTHORIZED").details(List.of()).build();
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
            response.setCharacterEncoding("UTF-8");
            response.getWriter()
                    .write(
                            objectMapper.writeValueAsString(
                                    ApiResource.error(error, SIGN_IN_MESSAGE)));
        };
    }
}

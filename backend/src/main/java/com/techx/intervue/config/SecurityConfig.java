package com.techx.intervue.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.techx.intervue.filters.JwtAuthFilter;
import com.techx.intervue.filters.TraceIdFilter;
import com.techx.intervue.resources.ApiResource;
import com.techx.intervue.resources.ErrorResource;
import com.techx.intervue.resources.FieldErrorResource;
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
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

@AllArgsConstructor
@Configuration
@EnableMethodSecurity // method-based authorization (the default is URL-based authorization)
public class SecurityConfig {

    private final ObjectMapper objectMapper;
    private final JwtAuthFilter jwtAuthFilter;
    private final TraceIdFilter traceIdFilter;

    @Bean
    PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    /**
     * Lets the React frontend (a different origin from the backend) call the API. The origin list
     * comes from app.cors.allowed-origins (variable CORS_ALLOWED_ORIGINS, several origins separated
     * by commas). allowCredentials lets the browser send/receive the refresh_token cookie.
     */
    @Bean
    CorsConfigurationSource corsConfigurationSource(
            @Value("${app.cors.allowed-origins}") List<String> allowedOrigins) {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(allowedOrigins);
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("Authorization", "Content-Type"));
        config.setExposedHeaders(List.of("X-Trace-Id"));
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
                                auth
                                        // Logout, own profile and setting a password need a valid
                                        // access
                                        // token
                                        // — placed before auth/**
                                        .requestMatchers(
                                                "/api/v1/auth/logout",
                                                "/api/v1/auth/set-password",
                                                "/api/v1/auth/change-password",
                                                "/api/v1/auth/me",
                                                "/api/v1/auth/me/avatar",
                                                "/api/v1/auth/me/settings",
                                                "/api/v1/auth/me/achievements",
                                                // FR-008: enable / disable 2FA (verification at
                                                // sign-in is still
                                                // public)
                                                "/api/v1/auth/mfa",
                                                "/api/v1/auth/mfa/setup",
                                                "/api/v1/auth/mfa/enable",
                                                "/api/v1/auth/mfa/disable",
                                                "/api/v1/auth/mfa/recovery-codes")
                                        .authenticated()
                                        // 1. Route AUTH - No JWT
                                        .requestMatchers("/api/v1/auth/**")
                                        .permitAll()
                                        // FR-111: the WebSocket handshake carries no
                                        // Authorization header;
                                        // the JWT is checked in the STOMP CONNECT frame
                                        // (StompAuthInterceptor)
                                        .requestMatchers("/ws", "/ws/**")
                                        .permitAll()
                                        // Ping - health check
                                        .requestMatchers("/ping")
                                        .permitAll()
                                        // Errors that no handler caught are forwarded to /error:
                                        // if it is not public it returns 401 and the FE thinks the
                                        // session is over
                                        .requestMatchers("/error")
                                        .permitAll()
                                        .requestMatchers("/uploads/**")
                                        .permitAll()
                                        // Swagger UI + OpenAPI JSON (off in prod through
                                        // springdoc.*)
                                        .requestMatchers(
                                                "/swagger-ui.html",
                                                "/swagger-ui/**",
                                                "/v3/api-docs/**")
                                        .permitAll()
                                        // 2. Public API
                                        .requestMatchers("/api/v1/products")
                                        .permitAll()
                                        // FR-020…023, FR-011: a stall's products and stock can be
                                        // viewed
                                        // before signing in
                                        .requestMatchers(
                                                HttpMethod.GET,
                                                "/api/v1/products/*",
                                                "/api/v1/farmers/*/products")
                                        .permitAll()
                                        // FR-020/FR-076: the category filter can be used before
                                        // signing
                                        // in
                                        .requestMatchers(HttpMethod.GET, "/api/v1/categories")
                                        .permitAll()
                                        // FR-010/FR-012: markets and the map can be viewed before
                                        // signing in
                                        .requestMatchers(
                                                HttpMethod.GET,
                                                "/api/v1/markets",
                                                "/api/v1/markets/*")
                                        .permitAll()
                                        // FR-011: a market's stalls and Farmer list can be viewed
                                        // before
                                        // signing in
                                        .requestMatchers(
                                                HttpMethod.GET,
                                                "/api/v1/farmers",
                                                "/api/v1/farmers/*",
                                                "/api/v1/markets/*/farmers",
                                                // FR-032: giỏ hàng chọn slot trước khi đăng nhập
                                                "/api/v1/farmers/*/slots")
                                        .permitAll()
                                        // Chatbot FR-090…092: guests can ask questions too
                                        .requestMatchers("/api/v1/chat", "/api/v1/chat/history")
                                        .permitAll()
                                        // FR-077: notice banner on the public pages
                                        .requestMatchers(
                                                HttpMethod.GET, "/api/v1/announcements/active")
                                        .permitAll()
                                        .anyRequest()
                                        .authenticated())
                .sessionManagement(
                        session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .exceptionHandling(
                        ex ->
                                ex.authenticationEntryPoint(
                                        ((request, response, authException) -> {
                                            ErrorResource error =
                                                    ErrorResource.builder()
                                                            .code("UNAUTHORIZED")
                                                            .details(
                                                                    List.of(
                                                                            FieldErrorResource
                                                                                    .builder()
                                                                                    .message(
                                                                                            authException
                                                                                                    .getMessage())
                                                                                    .build()))
                                                            .build();

                                            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                                            response.setContentType(
                                                    MediaType.APPLICATION_JSON_VALUE);
                                            response.setCharacterEncoding("UTF-8");
                                            response.getWriter()
                                                    .write(
                                                            objectMapper.writeValueAsString(
                                                                    ApiResource.error(
                                                                            error,
                                                                            "Something went wrong on our side. Please try again later.")));
                                        })))
                // UsernamePasswordAuthenticationFilter.class is just a reference point:
                // after the request passes through jwtAuthFilter it goes on through
                // UsernamePasswordAuthenticationFilter.class (which runs but does nothing)
                // two parameters are required
                .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class)
                .addFilterBefore(traceIdFilter, JwtAuthFilter.class);

        return http.build();
    }
}

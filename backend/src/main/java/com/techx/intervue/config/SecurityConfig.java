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
@EnableMethodSecurity // phần quyền dựa trên method (còn default là phân quyền theo url)
public class SecurityConfig {

    private final ObjectMapper objectMapper;
    private final JwtAuthFilter jwtAuthFilter;
    private final TraceIdFilter traceIdFilter;

    @Bean
    PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    /**
     * Cho phép frontend React (khác origin với backend) gọi API. Danh sách origin lấy từ
     * app.cors.allowed-origins (biến CORS_ALLOWED_ORIGINS, nhiều origin cách nhau dấu phẩy).
     * allowCredentials để trình duyệt gửi/nhận cookie refresh_token.
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
                                        // Logout cần access token hợp lệ — đặt trước auth/**
                                        .requestMatchers("/api/v1/auth/logout")
                                        .authenticated()
                                        // 1. Route AUTH - No JWT
                                        .requestMatchers("/api/v1/auth/**")
                                        .permitAll()
                                        // Ping - health check
                                        .requestMatchers("/ping")
                                        .permitAll()
                                        .requestMatchers("/uploads/**")
                                        .permitAll()
                                        // Swagger UI + OpenAPI JSON (tắt ở prod qua springdoc.*)
                                        .requestMatchers(
                                                "/swagger-ui.html",
                                                "/swagger-ui/**",
                                                "/v3/api-docs/**")
                                        .permitAll()
                                        // 2. Public API
                                        .requestMatchers("/api/v1/products")
                                        .permitAll()
                                        // Chatbot FR-090…092: khách vãng lai cũng hỏi được
                                        .requestMatchers("/api/v1/chat", "/api/v1/chat/history")
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
                // UsernamePasswordAuthenticationFilter.class chỉ làm mốc để tham chiếu
                // sau khi chạy qua jwtAuthFiler thì nó sẽ chạy qua bên
                // UsernamePasswordAuthenticationFilter.class (chạy nma ko làm gì)
                // cần phải có 2 tham số
                .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class)
                .addFilterBefore(traceIdFilter, JwtAuthFilter.class);

        return http.build();
    }
}

package com.techx.intervue.config;

import lombok.AllArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

@AllArgsConstructor
@Configuration
@EnableMethodSecurity // phần quyền dựa trên method (còn default là phân quyền theo url)
public class SecurityConfig {

    // private final JwtAuthFilter jwtAuthFilter;
    // private final TraceIdFilter traceIdFilter;
    // private final ObjectMapper objectMapper;

    @Bean
    PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    // @Bean
    // SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
    // http
    // .csrf(csrf -> csrf.disable())
    // .authorizeHttpRequests(auth -> auth
    // // 1. Route AUTH - No JWT
    // .requestMatchers("/api/v1/auth/**").permitAll()
    // .requestMatchers("/api/v1/refresh").permitAll()
    // .requestMatchers("/uploads/**").permitAll()
    // // 2. Public API
    // .requestMatchers("/api/v1/products").permitAll()

    // .anyRequest().authenticated())
    // .sessionManagement(session -> session
    // .sessionCreationPolicy(SessionCreationPolicy.STATELESS))
    // .exceptionHandling(ex -> ex
    // .authenticationEntryPoint(((request, response, authException) -> {
    // ErrorResource error = ErrorResource.builder()
    // .code("UNAUTHORIZED")
    // .details(List.of(FieldErrorResource.builder()
    // .message(authException.getMessage()).build()))
    // .build();

    // response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
    // response.setContentType(MediaType.APPLICATION_JSON_VALUE);
    // response.setCharacterEncoding("UTF-8");
    // response.getWriter().write(
    // objectMapper.writeValueAsString(ApiResource.error(error,
    // "Đã có lỗi xảy ra với hệ thống, vui lòng thử lại sau!")));
    // })))
    // // UsernamePasswordAuthenticationFilter.class chỉ làm mốc để tham chiếu
    // // sau khi chạy qua jwtAuthFiler thì nó sẽ chạy qua bên
    // // UsernamePasswordAuthenticationFilter.class (chạy nma ko làm gì)
    // // cần phải có 2 tham số
    // .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class)
    // .addFilterBefore(traceIdFilter, JwtAuthFilter.class);

    // return http.build();
    // }

}

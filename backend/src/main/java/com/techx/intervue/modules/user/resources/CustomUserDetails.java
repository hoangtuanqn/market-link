package com.techx.intervue.modules.user.resources;

import java.time.Instant;
import java.util.Collection;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import org.jspecify.annotations.NullMarked;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

@Builder
@Getter
@AllArgsConstructor
public class CustomUserDetails implements UserDetails {

    private final Long id;
    private final String email;
    private final String phone;
    private final String password;
    private final Instant createdAt;
    private final Collection<? extends GrantedAuthority> authorities;

    @Override
    @NullMarked
    public String getUsername() {
        return email; // tùy hệ thống mà trả về cho đúng
    }

    @Override
    public String getPassword() {
        return password;
    }

    @Override
    @NullMarked
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return authorities;
    }
}

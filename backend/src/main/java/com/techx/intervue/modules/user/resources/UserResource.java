package com.techx.intervue.modules.user.resources;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.time.Instant;
import lombok.Builder;

@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public record UserResource(Long id, String email, String name, String phone, Instant createdAt) {}

package com.techx.intervue.resources;

import java.util.List;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class ErrorResource {
    private String code;
    @Builder.Default private List<FieldErrorResource> details = List.of();
}

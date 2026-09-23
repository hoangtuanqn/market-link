package com.techx.intervue.resources;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class FieldErrorResource {
    private String field;
    private String message;
}

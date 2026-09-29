package com.techx.intervue.modules.quality.requests;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record FarmerResponseRequest(
        @NotBlank(message = "Write a reply first.")
                @Size(max = 500, message = "Keep the reply under 500 characters.")
                String response) {}

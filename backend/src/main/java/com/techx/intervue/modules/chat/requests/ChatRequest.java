package com.techx.intervue.modules.chat.requests;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.util.List;

public record ChatRequest(
        @NotBlank(message = "Session key is required!")
                @Pattern(regexp = "^[A-Za-z0-9_-]{8,64}$", message = "Session key invalid!")
                String sessionKey,
        @NotBlank(message = "Message is required!")
                @Size(max = 500, message = "Maximum of 500 characters!")
                String message,
        @Valid PageContext context) {

    public ChatRequest(String sessionKey, String message) {
        this(sessionKey, message, null);
    }

    public record PageContext(
            @Pattern(regexp = "^[a-z/:-]{1,64}$", message = "Page invalid!") String page,
            @Pattern(
                            regexp = "^(order|review|farmer|product|market)$",
                            message = "Record type invalid!")
                    String recordType,
            @Pattern(regexp = "^[A-Za-z0-9_-]{1,32}$", message = "Record reference invalid!")
                    String recordRef,
            @Size(max = 30, message = "Cart too large!") @Valid List<CartLine> cart) {

        public record CartLine(
                @Min(1) long productId,
                @Min(value = 1, message = "Quantity must be at least 1!")
                        @Max(value = 999, message = "Quantity too large!")
                        int quantity) {}

        public PageContext(String page, String recordType, String recordRef) {
            this(page, recordType, recordRef, List.of());
        }
    }
}

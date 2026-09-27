package com.techx.intervue.modules.chat.requests;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record ChatRequest(
        @NotBlank(message = "Session key is required!")
                @Pattern(regexp = "^[A-Za-z0-9_-]{8,64}$", message = "Session key invalid!")
                String sessionKey,
        @NotBlank(message = "Message is required!")
                @Size(max = 500, message = "Maximum of 500 characters!")
                String message,
        @Valid PageContext context) {

    /** No context: a caller that does not know or does not care which screen the person is on. */
    public ChatRequest(String sessionKey, String message) {
        this(sessionKey, message, null);
    }

    /**
     * Where the person is while they ask, so "this order" resolves to something (FR-090, FR-093,
     * FR-094).
     *
     * <p>Both fields are shaped, not free text, and both patterns are narrow on purpose. This is
     * the one part of the prompt the client fills in, and the rule for FR-093/094 is that
     * user-typed text is data rather than instruction. A name or a description would break that
     * rule, so neither is accepted: the assistant is given a type and a reference and looks the
     * rest up with a tool, the same way it does for anything else.
     *
     * @param page the route pattern, e.g. "farmer/orders/:code" — lowercase letters, slashes,
     *     hyphens and colons only
     * @param recordType one of order, review, farmer, product, market
     * @param recordRef the id or code that route is showing
     */
    public record PageContext(
            @Pattern(regexp = "^[a-z/:-]{1,64}$", message = "Page invalid!") String page,
            @Pattern(
                            regexp = "^(order|review|farmer|product|market)$",
                            message = "Record type invalid!")
                    String recordType,
            @Pattern(regexp = "^[A-Za-z0-9_-]{1,32}$", message = "Record reference invalid!")
                    String recordRef) {}
}

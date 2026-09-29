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
     * @param cart the cart as it stands in the browser, when they are on the cart screen. The cart
     *     is client state — there is no cart table — so this is the only way the assistant can
     *     answer "do I make both cutoffs?". Ids and quantities only, and it is fed to the same
     *     preview the cart screen itself uses rather than to anything new.
     */
    public record PageContext(
            @Pattern(regexp = "^[a-z/:-]{1,64}$", message = "Page invalid!") String page,
            @Pattern(
                            regexp = "^(order|review|farmer|product|market)$",
                            message = "Record type invalid!")
                    String recordType,
            @Pattern(regexp = "^[A-Za-z0-9_-]{1,32}$", message = "Record reference invalid!")
                    String recordRef,
            @Size(max = 30, message = "Cart too large!") @Valid List<CartLine> cart) {

        /** One cart line. Numbers only: nothing here is text a person typed. */
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

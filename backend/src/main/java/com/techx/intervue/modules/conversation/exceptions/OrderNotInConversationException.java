package com.techx.intervue.modules.conversation.exceptions;

/**
 * R-06, FR-114 — ghim một đơn không thuộc hai người trong thread (đơn của khách khác, hoặc ở stall
 * khác). 403, không phải 404: nói thẳng là không được phép, như ảnh của người khác.
 */
public class OrderNotInConversationException extends RuntimeException {
    public OrderNotInConversationException() {
        super("This order is not part of this conversation.");
    }
}

package com.techx.intervue.modules.conversation.exceptions;

/**
 * R-06, FR-114 — pinning an order that does not belong to the two people in the thread (another
 * customer's order, or one from another stall). 403, not 404: say plainly that it is not allowed,
 * as with someone else's photo.
 */
public class OrderNotInConversationException extends RuntimeException {
    public OrderNotInConversationException() {
        super("This order is not part of this conversation.");
    }
}

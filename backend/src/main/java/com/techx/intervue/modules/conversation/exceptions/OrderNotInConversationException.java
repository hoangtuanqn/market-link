package com.techx.intervue.modules.conversation.exceptions;

public class OrderNotInConversationException extends RuntimeException {
    public OrderNotInConversationException() {
        super("This order is not part of this conversation.");
    }
}

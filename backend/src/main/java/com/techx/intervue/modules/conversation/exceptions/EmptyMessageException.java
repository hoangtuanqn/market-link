package com.techx.intervue.modules.conversation.exceptions;

/** Body rỗng hoặc chỉ toàn khoảng trắng → 400. */
public class EmptyMessageException extends RuntimeException {
    public EmptyMessageException() {
        super("Type a message before sending.");
    }
}

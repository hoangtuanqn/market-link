package com.techx.intervue.modules.conversation.exceptions;

/** Đối tượng được nhắn không phải một stall đang mở → 403. */
public class StallNotOpenException extends RuntimeException {
    public StallNotOpenException() {
        super("This stall is not open yet.");
    }
}

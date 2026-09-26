package com.techx.intervue.modules.conversation.exceptions;

import com.techx.intervue.modules.conversation.enums.MessageKind;

/** Plan 1 only accepts text messages; images and offers arrive in Plan 3 / phase 2 → 400. */
public class UnsupportedMessageKindException extends RuntimeException {
    public UnsupportedMessageKindException(MessageKind kind) {
        super("Messages of kind \"" + kind.value() + "\" are not supported yet.");
    }
}

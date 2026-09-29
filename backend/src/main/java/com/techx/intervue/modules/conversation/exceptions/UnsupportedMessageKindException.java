package com.techx.intervue.modules.conversation.exceptions;

import com.techx.intervue.modules.conversation.enums.MessageKind;

public class UnsupportedMessageKindException extends RuntimeException {
    public UnsupportedMessageKindException(MessageKind kind) {
        super("Messages of kind \"" + kind.value() + "\" are not supported yet.");
    }
}

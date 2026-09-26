package com.techx.intervue.modules.conversation.exceptions;

import com.techx.intervue.modules.conversation.enums.MessageKind;

/** Plan 1 chỉ nhận tin chữ; ảnh và ra giá tới ở Plan 3 / đợt 2 → 400. */
public class UnsupportedMessageKindException extends RuntimeException {
    public UnsupportedMessageKindException(MessageKind kind) {
        super("Messages of kind \"" + kind.value() + "\" are not supported yet.");
    }
}

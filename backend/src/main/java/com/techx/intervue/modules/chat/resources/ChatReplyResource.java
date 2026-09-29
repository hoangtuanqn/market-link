package com.techx.intervue.modules.chat.resources;

import com.techx.intervue.modules.chat.enums.ChatIntent;
import java.util.List;

public record ChatReplyResource(
        String reply,
        ChatIntent intent,
        List<ChatResultItem> results,
        List<ProposedAction> actions) {

    public record ProposedAction(String action, long id, String label, String detail) {}

    public record ChatResultItem(String type, Long id, String title, String subtitle) {}
}

package com.techx.intervue.modules.chat.resources;

import com.techx.intervue.modules.chat.enums.ChatIntent;
import java.util.List;

public record ChatReplyResource(String reply, ChatIntent intent, List<ChatResultItem> results) {

    /**
     * Một thẻ kết quả để FE render link.
     *
     * @param type "product" | "market" | "farmer"
     */
    public record ChatResultItem(String type, Long id, String title, String subtitle) {}
}

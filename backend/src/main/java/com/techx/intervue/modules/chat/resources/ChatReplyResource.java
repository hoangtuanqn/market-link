package com.techx.intervue.modules.chat.resources;

import com.techx.intervue.modules.chat.enums.ChatIntent;
import java.util.List;

public record ChatReplyResource(
        String reply,
        ChatIntent intent,
        List<ChatResultItem> results,
        List<ProposedAction> actions) {

    /**
     * FR-093, FR-094: something the assistant suggests doing, rendered by the client as a button
     * the person has to press.
     *
     * <p>Nothing here writes. The assistant only checks that the row belongs to the caller and that
     * the change is legal right now, then describes it. Pressing the button calls the ordinary
     * endpoint for that action, which checks the role, the ownership and the state transition again
     * from scratch (R-06). The model is never on the writing path.
     *
     * @param action what the button does, e.g. "accept_order" or "approve_farmer"
     * @param id the row the action applies to
     * @param label the button text, already in the reader's language
     * @param detail one line of context, e.g. the customer and the pickup window
     */
    public record ProposedAction(String action, long id, String label, String detail) {}

    /**
     * One result card so the FE can render a link.
     *
     * @param type "product" | "market" | "farmer"
     */
    public record ChatResultItem(String type, Long id, String title, String subtitle) {}
}

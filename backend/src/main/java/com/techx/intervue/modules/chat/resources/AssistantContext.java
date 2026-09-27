package com.techx.intervue.modules.chat.resources;

import com.techx.intervue.modules.chat.enums.AssistantAudience;
import com.techx.intervue.modules.chat.requests.ChatRequest.PageContext;
import java.util.List;

/**
 * Who the assistant is answering, resolved on the server before Claude is called.
 *
 * <p>This is the whole ownership story for FR-093: {@code farmerId} comes from the signed-in
 * account, so a farmer tool can only ever read that farmer's rows. No tool takes an owner id as an
 * argument — an argument is filled by the model, and a model that can name the owner can name
 * somebody else's.
 *
 * @param audience which tools are on the table
 * @param userId the signed-in account
 * @param farmerId the stall this account owns, or null when it owns none
 * @param cart the cart the browser sent up, empty when they are not on the cart screen
 */
public record AssistantContext(
        AssistantAudience audience, Long userId, Long farmerId, List<PageContext.CartLine> cart) {

    public AssistantContext(AssistantAudience audience, Long userId, Long farmerId) {
        this(audience, userId, farmerId, List.of());
    }
}

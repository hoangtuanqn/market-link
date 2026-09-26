package com.techx.intervue.modules.conversation.requests;

import jakarta.validation.constraints.NotNull;

/**
 * FR-110, FR-114. `farmerId` is the stall's id (farmer_profiles.id) — the exact id the product page
 * and stall page already have. The server looks up the stall owner itself; the client never needs
 * to know the Farmer's users.id. The product travels with the first message (SendMessageRequest),
 * not with the thread.
 */
public record OpenConversationRequest(
        @NotNull(message = "Choose a stall to message.") Long farmerId) {}

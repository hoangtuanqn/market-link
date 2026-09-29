package com.techx.intervue.modules.conversation.requests;

import jakarta.validation.constraints.NotNull;

public record OpenConversationRequest(
        @NotNull(message = "Choose a stall to message.") Long farmerId) {}

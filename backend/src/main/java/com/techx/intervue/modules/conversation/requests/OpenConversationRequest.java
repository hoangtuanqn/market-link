package com.techx.intervue.modules.conversation.requests;

import jakarta.validation.constraints.NotNull;

/**
 * FR-110, FR-114. `farmerId` là id stall (farmer_profiles.id) — đúng id mà trang sản phẩm và trang
 * stall có sẵn. Server tự tra chủ stall; client không bao giờ phải biết users.id của Farmer. Ghim
 * sản phẩm đi theo tin nhắn đầu tiên (SendMessageRequest), không theo thread.
 */
public record OpenConversationRequest(
        @NotNull(message = "Choose a stall to message.") Long farmerId) {}

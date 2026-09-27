package com.techx.intervue.modules.chat.resources;

import java.math.BigDecimal;
import java.time.LocalDate;

/** Rows the Admin tools return (FR-094). Read-only projections, never entities. */
public final class AdminRows {

    private AdminRows() {}

    public record PlatformTotalsRow(
            long farmers,
            long pendingFarmers,
            long customers,
            long markets,
            long orders,
            BigDecimal revenue) {}

    public record MarketActivityRow(
            String marketName, long orderCount, BigDecimal revenue, long activeStalls) {}

    public record PendingFarmerRow(
            long farmerId,
            String stallName,
            String contactPerson,
            String email,
            LocalDate appliedOn,
            String status) {}

    public record AccountRow(
            long userId,
            String fullName,
            String email,
            String role,
            String status,
            LocalDate joinedOn) {}

    public record FlaggedReviewRow(
            long reviewId,
            int rating,
            String comment,
            String stallName,
            String targetName,
            LocalDate createdOn) {}

    public record HiddenItemRow(String kind, long id, String name, String reason) {}

    /** One message from the feedback inbox (FR-094). The body is text a person wrote. */
    public record FeedbackRow(
            long feedbackId,
            String type,
            String status,
            String fromName,
            LocalDate createdOn,
            String message) {}

    public record FeedbackCountRow(String type, String status, long count) {}
}

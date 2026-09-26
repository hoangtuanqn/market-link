package com.techx.intervue.modules.order.resources;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.util.List;

/**
 * {@code GET /orders/{id}} (contract §7, FR-033/036/065). {@code customer} is only present when the
 * caller is this order's own Farmer — controller ruling C5-16: otherwise the {@code customer} key
 * is ABSENT from the JSON entirely (not {@code "customer": null}). {@code @JsonInclude} sits only
 * on this component (precedent: {@code MessageResource}), not on the whole record — {@code
 * customerNote}/{@code farmerNote} must still appear as {@code null} as usual.
 *
 * <p>{@code reviewed} (Task 8.3, FR-050): the customer already left at least one review on this
 * order — the "Write a review" button shows only on a completed order where it is false. Appended
 * last on purpose: the chat order pin (PR #155) reads the earlier fields by position.
 */
public record OrderDetailResource(
        OrderListItemResource summary,
        List<OrderItemResource> items,
        List<OrderHistoryResource> statusHistory,
        boolean canCancel,
        boolean canModify,
        String customerNote,
        String farmerNote,
        @JsonInclude(JsonInclude.Include.NON_NULL) CustomerSummaryResource customer,
        boolean reviewed) {}

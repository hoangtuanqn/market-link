package com.techx.intervue.modules.order.resources;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.util.List;

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

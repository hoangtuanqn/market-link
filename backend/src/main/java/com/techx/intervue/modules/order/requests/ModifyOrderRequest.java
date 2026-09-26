package com.techx.intervue.modules.order.requests;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import java.util.List;

/**
 * PUT /orders/{id}/items — edit an order before the cutoff (D-07): only lower quantities or drop
 * items, never add a new product (checked in the service, {@code ProductNotInOrderException}).
 */
public record ModifyOrderRequest(@NotEmpty @Valid List<CartLine> items) {}

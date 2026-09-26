package com.techx.intervue.modules.order.requests;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import java.util.List;

/** POST /orders — each group becomes one order, the whole call in one transaction (D-01, D-02). */
public record PlaceOrderRequest(@NotEmpty @Valid List<OrderGroupInput> groups) {}

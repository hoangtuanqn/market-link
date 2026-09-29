package com.techx.intervue.modules.order.requests;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import java.util.List;

public record PlaceOrderRequest(@NotEmpty @Valid List<OrderGroupInput> groups) {}

package com.techx.intervue.modules.order.resources;

import java.util.List;

/** data của POST /orders: {@code { orders: [...] }} (contract §7, C5-3). */
public record PlacedOrdersResource(List<PlacedOrderResource> orders) {}

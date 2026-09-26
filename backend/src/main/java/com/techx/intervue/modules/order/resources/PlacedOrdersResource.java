package com.techx.intervue.modules.order.resources;

import java.util.List;

/** The data of POST /orders: {@code { orders: [...] }} (contract §7, C5-3). */
public record PlacedOrdersResource(List<PlacedOrderResource> orders) {}

package com.techx.intervue.modules.order.resources;

import java.util.List;

/** data của POST /orders/preview: {@code { groups: [...] }} (contract §7, C5-3). */
public record OrderPreviewResource(List<OrderGroupPreviewResource> groups) {}

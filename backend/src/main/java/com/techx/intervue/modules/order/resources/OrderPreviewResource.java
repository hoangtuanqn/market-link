package com.techx.intervue.modules.order.resources;

import java.util.List;

/** The data of POST /orders/preview: {@code { groups: [...] }} (contract §7, C5-3). */
public record OrderPreviewResource(List<OrderGroupPreviewResource> groups) {}

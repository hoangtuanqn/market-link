package com.techx.intervue.modules.order.resources;

/**
 * FR-122: the spoilage report on one order line, as the order page shows it — null until the
 * customer reports it. {@code spoiledOn} is "yyyy-MM-dd"; {@code status} is open, confirmed or
 * dismissed; {@code problem} is bruised, mold, smell, wilted or other.
 */
public record ItemQualityReportResource(Long id, String status, String spoiledOn, String problem) {}

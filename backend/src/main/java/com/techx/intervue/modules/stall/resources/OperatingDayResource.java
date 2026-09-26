package com.techx.intervue.modules.stall.resources;

/** Một ngày nhận hàng của stall tại một chợ; giờ "HH:mm" (contract §4). */
public record OperatingDayResource(int dayOfWeek, String pickupStartTime, String pickupEndTime) {}

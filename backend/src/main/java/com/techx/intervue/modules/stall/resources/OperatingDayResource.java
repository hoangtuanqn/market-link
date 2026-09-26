package com.techx.intervue.modules.stall.resources;

/** One pickup day of a stall at a market; times "HH:mm" (contract §4). */
public record OperatingDayResource(int dayOfWeek, String pickupStartTime, String pickupEndTime) {}

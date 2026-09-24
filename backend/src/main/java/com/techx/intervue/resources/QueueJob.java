package com.techx.intervue.resources;

import java.util.Map;

/** Một phần tử trong hàng đợi Redis, lưu dạng JSON. */
public record QueueJob(String type, Map<String, String> payload, int attempts) {}

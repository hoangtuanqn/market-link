package com.techx.intervue.resources;

import java.util.Map;

/** One element in the Redis queue, stored as JSON. */
public record QueueJob(String type, Map<String, String> payload, int attempts) {}

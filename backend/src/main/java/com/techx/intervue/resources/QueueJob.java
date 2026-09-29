package com.techx.intervue.resources;

import java.util.Map;

public record QueueJob(String type, Map<String, String> payload, int attempts) {}

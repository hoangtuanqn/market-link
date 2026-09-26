package com.techx.intervue.services.interfaces;

import java.util.Map;

/**
 * Handles one kind of job taken from the queue. If it throws, the worker retries (at most 3 times).
 */
public interface JobHandler {
    String type();

    void handle(Map<String, String> payload);
}

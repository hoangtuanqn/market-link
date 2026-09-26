package com.techx.intervue.services.interfaces;

import java.util.Map;

/**
 * The background job queue (a Redis list). The worker calls the JobHandler whose type() equals the
 * job's type.
 */
public interface JobQueueInterface {
    void enqueue(String type, Map<String, String> payload);
}

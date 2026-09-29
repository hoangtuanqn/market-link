package com.techx.intervue.services.interfaces;

import java.util.Map;

public interface JobQueueInterface {
    void enqueue(String type, Map<String, String> payload);
}

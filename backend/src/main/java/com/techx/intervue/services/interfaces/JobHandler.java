package com.techx.intervue.services.interfaces;

import java.util.Map;

public interface JobHandler {
    String type();

    void handle(Map<String, String> payload);
}

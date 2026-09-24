package com.techx.intervue.services.interfaces;

import java.util.Map;

/** Hàng đợi việc chạy nền (Redis list). Worker gọi JobHandler có type() trùng với type của job. */
public interface JobQueueInterface {
    void enqueue(String type, Map<String, String> payload);
}

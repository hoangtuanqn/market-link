package com.techx.intervue.services.interfaces;

import java.util.Map;

/** Xử lý một loại job lấy từ hàng đợi. Ném exception thì worker thử lại (tối đa 3 lần). */
public interface JobHandler {
    String type();

    void handle(Map<String, String> payload);
}

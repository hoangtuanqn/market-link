package com.techx.intervue.modules.user.resources;

import java.util.Map;
import lombok.Builder;

@Builder
public record SettingsResource(
        String theme,
        String language,
        String currency,
        String units,
        String dateFormat,
        String clock,
        String preferredMarket,
        /* thông báo và khối riêng của từng vai: đã lưu, chưa có tính năng dùng tới */
        Map<String, String> extras) {}

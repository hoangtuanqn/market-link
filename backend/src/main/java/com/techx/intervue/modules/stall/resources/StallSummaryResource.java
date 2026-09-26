package com.techx.intervue.modules.stall.resources;

import java.math.BigDecimal;
import java.util.List;

/**
 * Một stall trong danh sách của chợ hoặc kết quả tìm Farmer (contract §4). Khi lọc theo chợ, quầy
 * và khung giờ là của chợ đó; không lọc thì lấy theo chợ đầu tiên của stall. Thẻ stall trên trang
 * chợ cần người liên hệ và khung giờ nhận, nên hai thứ đó đi kèm luôn thay vì bắt FE gọi thêm một
 * request mỗi thẻ.
 */
public record StallSummaryResource(
        Long farmerId,
        String stallName,
        String contactPerson,
        String logoUrl,
        String stallCode,
        BigDecimal stallLatitude,
        BigDecimal stallLongitude,
        BigDecimal ratingAvg,
        int ratingCount,
        List<Integer> operatingDays,
        String pickupStartTime,
        String pickupEndTime) {}

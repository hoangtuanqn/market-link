package com.techx.intervue.modules.stall.services.interfaces;

import com.techx.intervue.modules.stall.requests.JoinMarketRequest;
import com.techx.intervue.modules.stall.requests.OperatingDaysRequest;
import com.techx.intervue.modules.stall.requests.StallProfileRequest;
import com.techx.intervue.modules.stall.resources.StallDetailResource;
import com.techx.intervue.modules.stall.resources.StallMarketResource;
import com.techx.intervue.modules.stall.resources.StallSummaryResource;
import com.techx.intervue.resources.PageResource;
import java.util.List;

public interface StallServiceInterface {
    /** Public — chỉ stall đã duyệt (D-09). page đếm từ 1, pageSize kẹp 1…50. */
    PageResource<StallSummaryResource> search(
            String q, Long marketId, Integer day, int page, int pageSize);

    /** Public — 404 khi stall chưa duyệt, bị từ chối hoặc đình chỉ (D-09). */
    StallDetailResource publicDetail(long farmerId);

    /**
     * Của chính mình, mọi trạng thái duyệt — Farmer cần thấy hồ sơ dù đang chờ (R-06: theo userId).
     */
    StallDetailResource myProfile(long userId);

    StallDetailResource updateProfile(long userId, StallProfileRequest request);

    StallMarketResource joinMarket(long userId, JoinMarketRequest request);

    /** Rời chợ = tắt dòng farmer_markets; slot và đơn cũ vẫn trỏ về được. */
    void leaveMarket(long userId, long farmerMarketId);

    StallMarketResource setDays(long userId, long farmerMarketId, OperatingDaysRequest request);

    /** Stall đang bán tại một chợ (FR-010), lọc theo thứ nếu có. */
    List<StallSummaryResource> atMarket(long marketId, Integer day);
}

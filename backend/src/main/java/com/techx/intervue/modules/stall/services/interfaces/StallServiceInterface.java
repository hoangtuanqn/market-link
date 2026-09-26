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
    /** Public — only approved stalls (D-09). page counts from 1, pageSize clamped to 1…50. */
    PageResource<StallSummaryResource> search(
            String q, Long marketId, Integer day, int page, int pageSize);

    /** Public — 404 when the stall is not approved, rejected or suspended (D-09). */
    StallDetailResource publicDetail(long farmerId);

    /**
     * Your own, in every approval state — the Farmer needs to see the profile even while pending
     * (R-06: by userId).
     */
    StallDetailResource myProfile(long userId);

    StallDetailResource updateProfile(long userId, StallProfileRequest request);

    StallMarketResource joinMarket(long userId, JoinMarketRequest request);

    /**
     * Leaving a market = turn off the farmer_markets row; old slots and orders can still point back
     * to it.
     */
    void leaveMarket(long userId, long farmerMarketId);

    StallMarketResource setDays(long userId, long farmerMarketId, OperatingDaysRequest request);

    /** Stalls selling at a market (FR-010), filtered by weekday if given. */
    List<StallSummaryResource> atMarket(long marketId, Integer day);
}

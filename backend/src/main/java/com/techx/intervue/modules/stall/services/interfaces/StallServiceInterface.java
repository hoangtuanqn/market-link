package com.techx.intervue.modules.stall.services.interfaces;

import com.techx.intervue.modules.stall.requests.JoinMarketRequest;
import com.techx.intervue.modules.stall.requests.OperatingDaysRequest;
import com.techx.intervue.modules.stall.requests.StallProfileRequest;
import com.techx.intervue.modules.stall.requests.UpdateStallMarketRequest;
import com.techx.intervue.modules.stall.resources.StallDetailResource;
import com.techx.intervue.modules.stall.resources.StallMarketResource;
import com.techx.intervue.modules.stall.resources.StallSummaryResource;
import com.techx.intervue.resources.PageResource;
import java.util.List;

public interface StallServiceInterface {
    PageResource<StallSummaryResource> search(
            String q, Long marketId, Integer day, int page, int pageSize);

    StallDetailResource publicDetail(long farmerId);

    StallDetailResource myProfile(long userId);

    StallDetailResource updateProfile(long userId, StallProfileRequest request);

    StallMarketResource joinMarket(long userId, JoinMarketRequest request);

    StallMarketResource updateMarket(
            long userId, long farmerMarketId, UpdateStallMarketRequest request);

    void leaveMarket(long userId, long farmerMarketId);

    StallMarketResource setDays(long userId, long farmerMarketId, OperatingDaysRequest request);

    List<StallSummaryResource> atMarket(long marketId, Integer day);
}

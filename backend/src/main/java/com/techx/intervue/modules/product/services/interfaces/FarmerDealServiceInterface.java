package com.techx.intervue.modules.product.services.interfaces;

import com.techx.intervue.modules.product.requests.DealRequest;
import com.techx.intervue.modules.product.resources.DailyStockResource;
import com.techx.intervue.modules.product.resources.FarmerDealResource;
import java.time.LocalDate;
import java.util.List;

public interface FarmerDealServiceInterface {

    DailyStockResource post(long userId, long productId, LocalDate date, DealRequest request);

    void remove(long userId, long productId, LocalDate date);

    List<FarmerDealResource> mine(long userId);

    List<DailyStockResource> upcomingDays(long userId, long productId);
}

package com.techx.intervue.modules.product.services.interfaces;

import com.techx.intervue.modules.product.requests.FarmerDailyStockRequest;
import com.techx.intervue.modules.product.resources.DailyStockResource;
import java.time.LocalDate;

public interface FarmerDailyStockServiceInterface {
    DailyStockResource override(
            long userId, long productId, LocalDate date, FarmerDailyStockRequest request);
}

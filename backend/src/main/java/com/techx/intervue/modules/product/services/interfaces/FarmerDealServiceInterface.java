package com.techx.intervue.modules.product.services.interfaces;

import com.techx.intervue.modules.product.requests.DealRequest;
import com.techx.intervue.modules.product.resources.DailyStockResource;
import com.techx.intervue.modules.product.resources.FarmerDealResource;
import java.time.LocalDate;
import java.util.List;

/** FR-124 — near-expiry deals of the Farmer's own products (spec §4.5.3). */
public interface FarmerDealServiceInterface {

    /** PUT …/daily-stock/{date}/deal: posts or changes that day's deal, returns the day's row. */
    DailyStockResource post(long userId, long productId, LocalDate date, DealRequest request);

    /** DELETE …/daily-stock/{date}/deal: back to the normal price; no deal → nothing changes. */
    void remove(long userId, long productId, LocalDate date);

    /** GET /farmer/deals: the stall's deal days from today on. */
    List<FarmerDealResource> mine(long userId);

    /** GET /farmer/products/{id}/daily-stock: the days the deal dialog can offer. */
    List<DailyStockResource> upcomingDays(long userId, long productId);
}

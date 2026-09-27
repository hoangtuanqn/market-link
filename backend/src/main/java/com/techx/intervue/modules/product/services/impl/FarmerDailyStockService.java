package com.techx.intervue.modules.product.services.impl;

import com.techx.intervue.modules.farmer.entities.FarmerProfile;
import com.techx.intervue.modules.farmer.enums.ApprovalStatus;
import com.techx.intervue.modules.farmer.exceptions.FarmerProfileNotFoundException;
import com.techx.intervue.modules.farmer.repositories.FarmerProfileRepository;
import com.techx.intervue.modules.product.entities.Product;
import com.techx.intervue.modules.product.entities.ProductDailyStock;
import com.techx.intervue.modules.product.exceptions.ProductNotFoundException;
import com.techx.intervue.modules.product.exceptions.ProductNotYoursException;
import com.techx.intervue.modules.product.repositories.ProductDailyStockRepository;
import com.techx.intervue.modules.product.repositories.ProductRepository;
import com.techx.intervue.modules.product.requests.FarmerDailyStockRequest;
import com.techx.intervue.modules.product.resources.DailyStockResource;
import com.techx.intervue.modules.product.services.interfaces.FarmerDailyStockServiceInterface;
import com.techx.intervue.modules.stall.exceptions.StallNotApprovedException;
import java.time.LocalDate;
import lombok.AllArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * FR-063 — lets a Farmer hand-adjust one pickup date without touching the recurring weekly
 * template. Only ever adjusts a date the template would already cover (materializes it first, same
 * as every other read/write path); it does not invent an orderable date out of nothing.
 */
@Service
@AllArgsConstructor
public class FarmerDailyStockService implements FarmerDailyStockServiceInterface {

    private final ProductDailyStockRepository dailyStock;
    private final ProductRepository products;
    private final FarmerProfileRepository farmers;

    @Override
    @Transactional
    public DailyStockResource override(
            long userId, long productId, LocalDate date, FarmerDailyStockRequest request) {
        FarmerProfile profile = mine(userId);
        requireApproved(profile);
        Product product =
                products.findByIdAndDeletedFalse(productId)
                        .orElseThrow(() -> new ProductNotFoundException(productId));
        if (!product.getFarmerId().equals(profile.getId())) {
            throw new ProductNotYoursException();
        }

        int dayOfWeek = date.getDayOfWeek().getValue() % 7;
        dailyStock.materialize(productId, date, dayOfWeek);
        ProductDailyStock row =
                dailyStock
                        .findByProductIdAndStockDate(productId, date)
                        .orElseThrow(
                                () ->
                                        new IllegalArgumentException(
                                                "No weekly template covers that weekday yet. Add"
                                                        + " one before overriding a date."));

        row.setQuantityAvailable(request.quantityAvailable());
        if (request.unitPrice() != null) {
            row.setUnitPrice(request.unitPrice());
        }
        ProductDailyStock saved = dailyStock.save(row);

        return new DailyStockResource(
                saved.getProductId(),
                saved.getStockDate(),
                saved.getQuantityAvailable(),
                saved.getUnitPrice());
    }

    private FarmerProfile mine(long userId) {
        return farmers.findByUserId(userId).orElseThrow(FarmerProfileNotFoundException::new);
    }

    private static void requireApproved(FarmerProfile profile) {
        if (profile.getApprovalStatus() != ApprovalStatus.APPROVED) {
            throw new StallNotApprovedException();
        }
    }
}

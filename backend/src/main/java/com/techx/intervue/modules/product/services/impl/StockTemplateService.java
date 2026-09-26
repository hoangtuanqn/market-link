package com.techx.intervue.modules.product.services.impl;

import com.techx.intervue.modules.farmer.entities.FarmerProfile;
import com.techx.intervue.modules.farmer.enums.ApprovalStatus;
import com.techx.intervue.modules.farmer.exceptions.FarmerProfileNotFoundException;
import com.techx.intervue.modules.farmer.repositories.FarmerProfileRepository;
import com.techx.intervue.modules.product.entities.Product;
import com.techx.intervue.modules.product.exceptions.ProductNotFoundException;
import com.techx.intervue.modules.product.exceptions.ProductNotYoursException;
import com.techx.intervue.modules.product.repositories.ProductRepository;
import com.techx.intervue.modules.product.repositories.WeeklyStockTemplateRepository;
import com.techx.intervue.modules.product.requests.StockTemplateRequest;
import com.techx.intervue.modules.product.resources.StockTemplateResource;
import com.techx.intervue.modules.product.services.interfaces.StockTemplateServiceInterface;
import com.techx.intervue.modules.stall.exceptions.StallNotApprovedException;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import lombok.AllArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@AllArgsConstructor
public class StockTemplateService implements StockTemplateServiceInterface {

    private final WeeklyStockTemplateRepository templates;
    private final ProductRepository products;
    private final FarmerProfileRepository farmers;

    @Override
    public List<StockTemplateResource> list(long userId) {
        FarmerProfile profile = mine(userId);
        return templates.findResourcesByFarmerId(profile.getId());
    }

    @Override
    @Transactional
    public List<StockTemplateResource> replace(long userId, StockTemplateRequest request) {
        FarmerProfile profile = mine(userId);
        requireApproved(profile);

        Set<String> seen = new HashSet<>();
        for (StockTemplateRequest.Item item : request.items()) {
            if (!seen.add(item.productId() + "@" + item.dayOfWeek())) {
                throw new IllegalArgumentException("Each product can appear once per weekday.");
            }
            Product product =
                    products.findByIdAndDeletedFalse(item.productId())
                            .orElseThrow(() -> new ProductNotFoundException(item.productId()));
            if (!product.getFarmerId().equals(profile.getId())) {
                throw new ProductNotYoursException();
            }
        }

        templates.replaceAll(profile.getId(), request.items());
        return templates.findResourcesByFarmerId(profile.getId());
    }

    /** R-06: hồ sơ luôn tra theo userId của token; không có đường nào nhận farmerId từ request. */
    private FarmerProfile mine(long userId) {
        return farmers.findByUserId(userId).orElseThrow(FarmerProfileNotFoundException::new);
    }

    /** D-09 / contract §4: chưa duyệt hoặc bị đình chỉ thì mọi thao tác ghi lịch tuần bị chặn. */
    private static void requireApproved(FarmerProfile profile) {
        if (profile.getApprovalStatus() != ApprovalStatus.APPROVED) {
            throw new StallNotApprovedException();
        }
    }
}

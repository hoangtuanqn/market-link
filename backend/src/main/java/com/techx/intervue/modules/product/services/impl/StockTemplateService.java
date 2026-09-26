package com.techx.intervue.modules.product.services.impl;

import com.techx.intervue.modules.farmer.entities.FarmerProfile;
import com.techx.intervue.modules.farmer.enums.ApprovalStatus;
import com.techx.intervue.modules.farmer.exceptions.FarmerProfileNotFoundException;
import com.techx.intervue.modules.farmer.repositories.FarmerProfileRepository;
import com.techx.intervue.modules.product.entities.Product;
import com.techx.intervue.modules.product.entities.WeeklyStockTemplate;
import com.techx.intervue.modules.product.enums.ProductStatus;
import com.techx.intervue.modules.product.exceptions.ProductNotFoundException;
import com.techx.intervue.modules.product.exceptions.ProductNotYoursException;
import com.techx.intervue.modules.product.repositories.ProductRepository;
import com.techx.intervue.modules.product.repositories.WeeklyStockTemplateRepository;
import com.techx.intervue.modules.product.requests.StockTemplateRequest;
import com.techx.intervue.modules.product.resources.StockTemplateApplyResultResource;
import com.techx.intervue.modules.product.resources.StockTemplateResource;
import com.techx.intervue.modules.product.services.interfaces.StockTemplateServiceInterface;
import com.techx.intervue.modules.stall.exceptions.StallNotApprovedException;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
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

    /** FR-063: "nạp tồn kho theo template của thứ tương ứng" — ghi đè lên chính product đang có. */
    @Override
    @Transactional
    public List<StockTemplateApplyResultResource> apply(long userId, LocalDate targetDate) {
        FarmerProfile profile = mine(userId);
        requireApproved(profile);

        // 0 = Chủ nhật … 6 = Thứ bảy, như farmer_operating_days; DayOfWeek của Java: T2 = 1 … CN =
        // 7
        int dayOfWeek = targetDate.getDayOfWeek().getValue() % 7;
        List<WeeklyStockTemplate> due =
                templates.findByFarmerIdAndDayOfWeekAndActiveTrue(profile.getId(), dayOfWeek);

        List<StockTemplateApplyResultResource> result = new ArrayList<>();
        for (WeeklyStockTemplate t : due) {
            Optional<Product> found = products.findByIdAndDeletedFalse(t.getProductId());
            if (found.isEmpty()) {
                continue;
            }
            Product product = found.get();
            product.setStockQuantity(t.getDefaultQuantity());
            if (t.getDefaultPrice() != null) {
                product.setPrice(t.getDefaultPrice());
            }
            product.setStatus(ProductStatus.AVAILABLE);
            Product saved = products.save(product);
            result.add(
                    new StockTemplateApplyResultResource(
                            saved.getId(),
                            saved.getName(),
                            saved.getStockQuantity(),
                            saved.getPrice(),
                            saved.getStatus().value()));
        }
        return result;
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

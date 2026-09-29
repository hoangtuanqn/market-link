package com.techx.intervue.modules.product.services.impl;

import com.techx.intervue.modules.farmer.entities.FarmerProfile;
import com.techx.intervue.modules.farmer.exceptions.FarmerProfileNotFoundException;
import com.techx.intervue.modules.farmer.repositories.FarmerProfileRepository;
import com.techx.intervue.modules.farmer.services.impl.StallSuspensionMessage;
import com.techx.intervue.modules.favorite.services.impl.RestockNotifier;
import com.techx.intervue.modules.product.entities.Product;
import com.techx.intervue.modules.product.entities.ProductDailyStock;
import com.techx.intervue.modules.product.entities.WeeklyStockTemplate;
import com.techx.intervue.modules.product.exceptions.ProductNotFoundException;
import com.techx.intervue.modules.product.exceptions.ProductNotYoursException;
import com.techx.intervue.modules.product.repositories.ProductRepository;
import com.techx.intervue.modules.product.repositories.WeeklyStockTemplateRepository;
import com.techx.intervue.modules.product.requests.StockTemplateRequest;
import com.techx.intervue.modules.product.resources.StockTemplateResource;
import com.techx.intervue.modules.product.services.interfaces.StockTemplateServiceInterface;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeMap;
import java.util.TreeSet;
import java.util.stream.Collectors;
import lombok.AllArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@AllArgsConstructor
public class StockTemplateService implements StockTemplateServiceInterface {

    private final WeeklyStockTemplateRepository templates;
    private final ProductRepository products;
    private final FarmerProfileRepository farmers;
    private final RestockNotifier restock;
    private final DailyStockTemplateSync dailyStockSync;

    @Override
    public List<StockTemplateResource> list(long userId) {
        FarmerProfile profile = mine(userId);
        return templates.findResourcesByFarmerId(profile.getId());
    }

    @Override
    @Transactional
    public List<StockTemplateResource> replace(long userId, StockTemplateRequest request) {
        FarmerProfile profile = mine(userId);
        StallSuspensionMessage.assertUsable(profile);

        Set<String> seen = new HashSet<>();
        Map<Long, Product> touched = new HashMap<>();
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
            touched.put(item.productId(), product);
        }

        Map<Long, Map<Integer, DailyStockTemplateSync.DayPlan>> oldByProduct = new HashMap<>();
        templates.findByFarmerIdAndActiveTrue(profile.getId()).stream()
                .collect(Collectors.groupingBy(WeeklyStockTemplate::getProductId))
                .forEach((id, rows) -> oldByProduct.put(id, DailyStockTemplateSync.plans(rows)));
        Map<Long, Map<Integer, DailyStockTemplateSync.DayPlan>> newByProduct = new HashMap<>();
        for (StockTemplateRequest.Item item : request.items()) {
            newByProduct
                    .computeIfAbsent(item.productId(), id -> new HashMap<>())
                    .put(
                            item.dayOfWeek(),
                            new DailyStockTemplateSync.DayPlan(
                                    item.defaultQuantity(), item.defaultPrice()));
        }
        Set<Long> changing = new TreeSet<>(oldByProduct.keySet());
        changing.addAll(newByProduct.keySet());
        Map<Long, Product> following = new TreeMap<>();
        Map<Long, List<ProductDailyStock>> lockedDays = new HashMap<>();
        for (Long id : changing) {
            Product product =
                    touched.containsKey(id)
                            ? touched.get(id)
                            : products.findByIdAndDeletedFalse(id).orElse(null);
            if (product != null) {
                following.put(id, product);
                lockedDays.put(id, dailyStockSync.lockUpcoming(id));
            }
        }

        Map<Long, Boolean> wasOrderable = new HashMap<>();
        touched.forEach((id, product) -> wasOrderable.put(id, restock.isOrderable(product)));

        templates.replaceAll(profile.getId(), request.items());
        following.forEach(
                (id, product) ->
                        dailyStockSync.followTemplate(
                                product,
                                lockedDays.get(id),
                                oldByProduct.getOrDefault(id, Map.of()),
                                newByProduct.getOrDefault(id, Map.of())));
        touched.forEach(
                (id, product) ->
                        restock.afterChange(
                                product, wasOrderable.get(id), restock.isOrderable(product)));

        return templates.findResourcesByFarmerId(profile.getId());
    }

    private FarmerProfile mine(long userId) {
        FarmerProfile profile =
                farmers.findByUserId(userId).orElseThrow(FarmerProfileNotFoundException::new);
        StallSuspensionMessage.assertUsable(profile);
        return profile;
    }
}

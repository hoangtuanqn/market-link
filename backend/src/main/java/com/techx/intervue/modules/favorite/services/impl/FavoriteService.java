package com.techx.intervue.modules.favorite.services.impl;

import com.techx.intervue.modules.catalog.repositories.MarketRepository;
import com.techx.intervue.modules.farmer.enums.ApprovalStatus;
import com.techx.intervue.modules.farmer.repositories.FarmerProfileRepository;
import com.techx.intervue.modules.favorite.entities.Favorite;
import com.techx.intervue.modules.favorite.enums.FavoriteTargetType;
import com.techx.intervue.modules.favorite.exceptions.FavoriteNotFoundException;
import com.techx.intervue.modules.favorite.exceptions.FavoriteNotYoursException;
import com.techx.intervue.modules.favorite.exceptions.FavoriteTargetNotFoundException;
import com.techx.intervue.modules.favorite.repositories.FavoriteQueryRepository;
import com.techx.intervue.modules.favorite.repositories.FavoriteRepository;
import com.techx.intervue.modules.favorite.requests.FavoriteRequest;
import com.techx.intervue.modules.favorite.resources.FavoriteResource;
import com.techx.intervue.modules.favorite.services.interfaces.FavoriteServiceInterface;
import com.techx.intervue.modules.product.entities.Product;
import com.techx.intervue.modules.product.repositories.ProductRepository;
import com.techx.intervue.modules.user.entities.User;
import com.techx.intervue.modules.user.enums.RoleType;
import com.techx.intervue.modules.user.repositories.UserRepository;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import lombok.AllArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@AllArgsConstructor
public class FavoriteService implements FavoriteServiceInterface {

    private final FavoriteRepository favorites;
    private final FavoriteQueryRepository query;
    private final UserRepository users;
    private final FarmerProfileRepository farmers;
    private final ProductRepository products;
    private final MarketRepository markets;
    private final RestockNotifier restock;

    @Override
    @Transactional(readOnly = true)
    public List<FavoriteResource> list(long userId, String targetType) {
        FavoriteTargetType type =
                targetType == null || targetType.isBlank()
                        ? null
                        : FavoriteTargetType.parse(targetType.trim());
        return withPerDateStock(query.list(userId, type));
    }

    private List<FavoriteResource> withPerDateStock(List<FavoriteResource> rows) {
        List<Long> ids =
                rows.stream()
                        .filter(FavoriteService::productStillListed)
                        .map(FavoriteResource::targetId)
                        .toList();
        if (ids.isEmpty()) {
            return rows;
        }
        Map<Long, Product> byId =
                products.findAllById(ids).stream()
                        .collect(Collectors.toMap(Product::getId, Function.identity()));
        return rows.stream()
                .map(
                        r -> {
                            if (!productStillListed(r)) {
                                return r;
                            }
                            Product p = byId.get(r.targetId());
                            boolean orderable = p != null && restock.isOrderable(p);
                            return orderable
                                    ? r
                                    : new FavoriteResource(
                                            r.id(),
                                            r.targetType(),
                                            r.targetId(),
                                            r.title(),
                                            r.subtitle(),
                                            r.imageUrl(),
                                            false);
                        })
                .toList();
    }

    private static boolean productStillListed(FavoriteResource r) {
        return r.available() && FavoriteTargetType.PRODUCT.value().equals(r.targetType());
    }

    @Override
    public FavoriteResource add(long userId, FavoriteRequest request) {
        requireBuyer(userId);
        FavoriteTargetType type = FavoriteTargetType.parse(request.targetType());
        Long targetId = targetIdOf(type, request);
        requirePublic(type, targetId);

        Favorite favorite =
                favorites
                        .findByCustomerIdAndTargetTypeAndTargetId(userId, type, targetId)
                        .orElseGet(() -> create(userId, type, targetId));
        FavoriteResource one =
                query.one(userId, favorite.getId()).orElseThrow(FavoriteNotFoundException::new);
        return withPerDateStock(List.of(one)).getFirst();
    }

    @Override
    @Transactional
    public void remove(long userId, long favoriteId) {
        Favorite favorite =
                favorites.findById(favoriteId).orElseThrow(FavoriteNotFoundException::new);
        if (!favorite.getCustomerId().equals(userId)) {
            throw new FavoriteNotYoursException();
        }
        favorites.delete(favorite);
    }

    private Favorite create(long userId, FavoriteTargetType type, Long targetId) {
        Favorite f = new Favorite();
        f.setCustomerId(userId);
        f.setTargetType(type);
        switch (type) {
            case FARMER -> f.setFarmerId(targetId);
            case PRODUCT -> f.setProductId(targetId);
            case MARKET -> f.setMarketId(targetId);
        }
        f.setTargetId(targetId);
        try {
            return favorites.saveAndFlush(f);
        } catch (DataIntegrityViolationException e) {
            return favorites
                    .findByCustomerIdAndTargetTypeAndTargetId(userId, type, targetId)
                    .orElseThrow(() -> e);
        }
    }

    private static Long targetIdOf(FavoriteTargetType type, FavoriteRequest r) {
        long sent =
                Stream.of(r.farmerId(), r.productId(), r.marketId())
                        .filter(java.util.Objects::nonNull)
                        .count();
        Long id =
                switch (type) {
                    case FARMER -> r.farmerId();
                    case PRODUCT -> r.productId();
                    case MARKET -> r.marketId();
                };
        if (sent != 1 || id == null) {
            throw new IllegalArgumentException("Send exactly the id that matches targetType.");
        }
        return id;
    }

    private void requirePublic(FavoriteTargetType type, Long id) {
        boolean visible =
                switch (type) {
                    case FARMER ->
                            farmers.findById(id)
                                    .filter(f -> f.getApprovalStatus() == ApprovalStatus.APPROVED)
                                    .isPresent();
                    case PRODUCT ->
                            products.findByIdAndDeletedFalse(id)
                                    .filter(p -> !p.isHidden())
                                    .isPresent();
                    case MARKET -> markets.findById(id).filter(m -> m.isActive()).isPresent();
                };
        if (!visible) {
            throw new FavoriteTargetNotFoundException();
        }
    }

    private void requireBuyer(long userId) {
        User user =
                users.findById(userId)
                        .orElseThrow(() -> new AccessDeniedException("Unknown user."));
        if (user.getRole() == RoleType.ADMIN) {
            throw new AccessDeniedException("Admin accounts cannot keep favourites.");
        }
    }
}

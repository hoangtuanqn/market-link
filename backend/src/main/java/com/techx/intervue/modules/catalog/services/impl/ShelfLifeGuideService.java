package com.techx.intervue.modules.catalog.services.impl;

import com.techx.intervue.modules.catalog.entities.ShelfLifeGuide;
import com.techx.intervue.modules.catalog.enums.StorageMode;
import com.techx.intervue.modules.catalog.exceptions.CategoryNotFoundException;
import com.techx.intervue.modules.catalog.exceptions.ShelfLifeGuideNotFoundException;
import com.techx.intervue.modules.catalog.repositories.CategoryRepository;
import com.techx.intervue.modules.catalog.repositories.ShelfLifeGuideRepository;
import com.techx.intervue.modules.catalog.repositories.ShelfLifePeerQueryRepository;
import com.techx.intervue.modules.catalog.requests.ShelfLifeGuideRequest;
import com.techx.intervue.modules.catalog.resources.ShelfLifeGuideGroupResource;
import com.techx.intervue.modules.catalog.resources.ShelfLifeGuideResource;
import com.techx.intervue.modules.catalog.resources.ShelfLifeModeResource;
import com.techx.intervue.modules.catalog.services.interfaces.ShelfLifeGuideServiceInterface;
import com.techx.intervue.modules.farmer.entities.FarmerProfile;
import com.techx.intervue.modules.farmer.repositories.FarmerProfileRepository;
import com.techx.intervue.modules.user.exceptions.InvalidFieldException;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import lombok.AllArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@AllArgsConstructor
public class ShelfLifeGuideService implements ShelfLifeGuideServiceInterface {

    static final int MIN_PEERS = 3;

    private final ShelfLifeGuideRepository guides;
    private final ShelfLifePeerQueryRepository peers;
    private final CategoryRepository categories;
    private final FarmerProfileRepository farmers;

    @Override
    public List<ShelfLifeGuideGroupResource> listForCategory(long categoryId, long viewerUserId) {
        Long ownStall = farmers.findByUserId(viewerUserId).map(FarmerProfile::getId).orElse(null);
        List<ShelfLifeGuide> rows =
                guides.findByCategoryIdAndActiveTrueOrderByGroupNameAscStorageModeAsc(categoryId);
        Map<Long, List<Integer>> peerDays =
                peers.daysByGuide(rows.stream().map(ShelfLifeGuide::getId).toList(), ownStall);
        Map<String, List<ShelfLifeGuide>> byGroup =
                rows.stream()
                        .collect(
                                Collectors.groupingBy(
                                        ShelfLifeGuide::getGroupName,
                                        LinkedHashMap::new,
                                        Collectors.toList()));
        return byGroup.values().stream()
                .map(
                        group ->
                                new ShelfLifeGuideGroupResource(
                                        group.getFirst().getGroupName(),
                                        group.getFirst().getExamples(),
                                        group.stream()
                                                .map(
                                                        g ->
                                                                mode(
                                                                        g,
                                                                        peerDays.getOrDefault(
                                                                                g.getId(),
                                                                                List.of())))
                                                .toList()))
                .toList();
    }

    private static ShelfLifeModeResource mode(ShelfLifeGuide g, List<Integer> days) {
        return new ShelfLifeModeResource(
                g.getId(),
                g.getStorageMode().value(),
                g.getSuggestedDays(),
                days.size() >= MIN_PEERS ? ShelfLifePolicy.median(days) : null,
                days.size());
    }

    @Override
    public List<ShelfLifeGuideResource> adminList(long categoryId) {
        return guides.findByCategoryIdOrderByGroupNameAscStorageModeAsc(categoryId).stream()
                .map(ShelfLifeGuideService::toResource)
                .toList();
    }

    @Override
    @Transactional
    public ShelfLifeGuideResource create(ShelfLifeGuideRequest request) {
        requireCategory(request.categoryId());
        ShelfLifeGuide guide = new ShelfLifeGuide();
        apply(guide, request);
        guides.findFirstByCategoryIdAndGroupNameOrderByIdAsc(
                        guide.getCategoryId(), guide.getGroupName())
                .ifPresent(same -> guide.setGroupName(same.getGroupName()));
        guide.setActive(request.active() == null || request.active());
        return toResource(guides.saveAndFlush(guide));
    }

    @Override
    @Transactional
    public ShelfLifeGuideResource update(long id, ShelfLifeGuideRequest request) {
        ShelfLifeGuide guide =
                guides.findById(id).orElseThrow(() -> new ShelfLifeGuideNotFoundException(id));
        if (!guide.getCategoryId().equals(request.categoryId())) {
            throw new InvalidFieldException(
                    "categoryId",
                    "A group cannot move to another category. Add it there as a new group.");
        }
        if (guide.getStorageMode() != StorageMode.parse(request.storageMode())) {
            throw new InvalidFieldException(
                    "storageMode",
                    "A group cannot change how it is kept. Add the other way as a new row.");
        }
        apply(guide, request);
        if (request.active() != null) {
            guide.setActive(request.active());
        }
        return toResource(guides.saveAndFlush(guide));
    }

    @Override
    @Transactional
    public void deactivate(long id) {
        ShelfLifeGuide guide =
                guides.findById(id).orElseThrow(() -> new ShelfLifeGuideNotFoundException(id));
        guide.setActive(false);
        guides.save(guide);
    }

    private void requireCategory(Long categoryId) {
        if (!categories.existsById(categoryId)) {
            throw new CategoryNotFoundException(categoryId);
        }
    }

    private static void apply(ShelfLifeGuide guide, ShelfLifeGuideRequest request) {
        guide.setCategoryId(request.categoryId());
        guide.setGroupName(request.groupName().trim());
        guide.setExamples(request.examples() == null ? "" : request.examples().trim());
        guide.setStorageMode(StorageMode.parse(request.storageMode()));
        guide.setSuggestedDays(request.suggestedDays());
    }

    private static ShelfLifeGuideResource toResource(ShelfLifeGuide g) {
        return new ShelfLifeGuideResource(
                g.getId(),
                g.getCategoryId(),
                g.getGroupName(),
                g.getExamples(),
                g.getStorageMode().value(),
                g.getSuggestedDays(),
                g.isActive());
    }
}

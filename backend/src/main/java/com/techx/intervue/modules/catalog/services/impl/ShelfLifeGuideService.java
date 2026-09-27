package com.techx.intervue.modules.catalog.services.impl;

import com.techx.intervue.modules.catalog.entities.ShelfLifeGuide;
import com.techx.intervue.modules.catalog.repositories.CategoryRepository;
import com.techx.intervue.modules.catalog.repositories.ShelfLifeGuideRepository;
import com.techx.intervue.modules.catalog.repositories.ShelfLifePeerQueryRepository;
import com.techx.intervue.modules.catalog.resources.ShelfLifeGuideGroupResource;
import com.techx.intervue.modules.catalog.resources.ShelfLifeModeResource;
import com.techx.intervue.modules.catalog.services.interfaces.ShelfLifeGuideServiceInterface;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import lombok.AllArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@AllArgsConstructor
public class ShelfLifeGuideService implements ShelfLifeGuideServiceInterface {

    /** Below this many products the median is hidden, so one stall's number never shows. */
    static final int MIN_PEERS = 3;

    private final ShelfLifeGuideRepository guides;
    private final ShelfLifePeerQueryRepository peers;
    private final CategoryRepository categories;

    @Override
    public List<ShelfLifeGuideGroupResource> listForCategory(long categoryId, Long viewerFarmerId) {
        List<ShelfLifeGuide> rows =
                guides.findByCategoryIdAndActiveTrueOrderByGroupNameAscStorageModeAsc(categoryId);
        Map<Long, List<Integer>> peerDays =
                peers.daysByGuide(
                        rows.stream().map(ShelfLifeGuide::getId).toList(), viewerFarmerId);
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
}

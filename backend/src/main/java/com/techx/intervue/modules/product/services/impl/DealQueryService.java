package com.techx.intervue.modules.product.services.impl;

import com.techx.intervue.modules.product.repositories.DealQueryRepository;
import com.techx.intervue.modules.product.repositories.DealQueryRepository.DealRow;
import com.techx.intervue.modules.product.requests.DealSearchCriteria;
import com.techx.intervue.modules.product.resources.DealResource;
import com.techx.intervue.modules.product.services.interfaces.DealQueryServiceInterface;
import com.techx.intervue.modules.stall.repositories.SlotQueryRepository;
import com.techx.intervue.resources.PageResource;
import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import lombok.AllArgsConstructor;
import org.springframework.stereotype.Service;

/**
 * FR-125 (spec §4.5.4): deal days a customer can still order for, nearest day first, then the
 * biggest discount. "Can still order" is the rule the product pages use (a free slot before its
 * cutoff on a day the market and the stall both open, SlotQueryRepository#orderableDates), so the
 * page, its total and the cart agree. Deal days inside 14 days are few, so that check and the
 * paging run here, after one SQL read.
 */
@Service
@AllArgsConstructor
public class DealQueryService implements DealQueryServiceInterface {

    private static final int MAX_PAGE_SIZE = 50;

    private final DealQueryRepository deals;
    private final SlotQueryRepository slots;
    private final Clock clock;

    @Override
    public PageResource<DealResource> search(DealSearchCriteria criteria) {
        int page = Math.max(1, criteria.page());
        int size = Math.min(MAX_PAGE_SIZE, Math.max(1, criteria.pageSize()));
        LocalDate today = LocalDate.now(clock);
        LocalDate lastDay = today.plusDays(ProductAvailabilityResolver.LOOKAHEAD_DAYS - 1);

        List<DealRow> rows = deals.openDeals(criteria, today, lastDay);
        Map<Long, Set<LocalDate>> orderable =
                slots.orderableDates(
                        rows.stream().map(DealRow::farmerId).collect(Collectors.toSet()),
                        today,
                        lastDay,
                        LocalDateTime.now(clock));
        List<DealRow> open =
                rows.stream()
                        .filter(
                                r ->
                                        orderable
                                                .getOrDefault(r.farmerId(), Set.of())
                                                .contains(r.stockDate()))
                        .toList();
        List<DealRow> shown = open.stream().skip((long) (page - 1) * size).limit(size).toList();
        Map<Long, Map<Integer, List<String>>> markets =
                deals.marketNamesByWeekday(
                        shown.stream().map(DealRow::farmerId).collect(Collectors.toSet()));
        return new PageResource<>(
                shown.stream().map(r -> toResource(r, markets)).toList(), page, size, open.size());
    }

    private static DealResource toResource(
            DealRow r, Map<Long, Map<Integer, List<String>>> markets) {
        int weekday = r.stockDate().getDayOfWeek().getValue() % 7;
        return new DealResource(
                r.productId(),
                r.name(),
                r.imageUrl(),
                r.unit(),
                r.stallName(),
                r.farmerId(),
                markets.getOrDefault(r.farmerId(), Map.of()).getOrDefault(weekday, List.of()),
                r.stockDate().toString(),
                r.listPrice(),
                r.unitPrice(),
                r.discountPercent(),
                r.bestBefore().toString(),
                r.daysLeft(),
                r.quantityAvailable(),
                r.storageMode());
    }
}

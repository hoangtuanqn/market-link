package com.techx.intervue.modules.catalog.services.impl;

import com.techx.intervue.modules.catalog.entities.Market;
import com.techx.intervue.modules.catalog.exceptions.MarketNotFoundException;
import com.techx.intervue.modules.catalog.repositories.MarketOperatingDayRepository;
import com.techx.intervue.modules.catalog.repositories.MarketQueryRepository;
import com.techx.intervue.modules.catalog.repositories.MarketRepository;
import com.techx.intervue.modules.catalog.requests.MarketRequest;
import com.techx.intervue.modules.catalog.resources.MarketDetailResource;
import com.techx.intervue.modules.catalog.resources.MarketResource;
import com.techx.intervue.modules.catalog.services.interfaces.MarketServiceInterface;
import com.techx.intervue.resources.PageResource;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import lombok.AllArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@AllArgsConstructor
public class MarketService implements MarketServiceInterface {

    private static final int MAX_PAGE_SIZE = 50;
    private static final String DEFAULT_CITY = "TP. Hồ Chí Minh";
    private static final DateTimeFormatter HHMM = DateTimeFormatter.ofPattern("HH:mm");

    private final MarketRepository repository;
    private final MarketOperatingDayRepository dayRepository;
    private final MarketQueryRepository queryRepository;

    @Override
    public PageResource<MarketResource> search(
            String q, Integer day, String city, String district, int page, int pageSize) {
        int safePage = Math.max(1, page);
        int safeSize = Math.min(MAX_PAGE_SIZE, Math.max(1, pageSize));
        return queryRepository.search(
                blankToNull(q),
                day,
                blankToNull(city),
                blankToNull(district),
                (safePage - 1) * safeSize,
                safeSize);
    }

    @Override
    public MarketDetailResource detail(long id) {
        MarketResource market =
                queryRepository.findById(id).orElseThrow(() -> new MarketNotFoundException(id));
        // farmers[] được module stall đổ vào ở cụm C2 (Task 2.2).
        return new MarketDetailResource(market, List.of());
    }

    @Override
    @Transactional
    public MarketResource create(MarketRequest request) {
        List<Integer> days = validDays(request.operatingDays());
        Market market = new Market();
        apply(market, request);
        Market saved = repository.save(market);
        dayRepository.replaceDays(saved.getId(), days);
        return toResource(saved, days, 0);
    }

    @Override
    @Transactional
    public MarketResource update(long id, MarketRequest request) {
        List<Integer> days = validDays(request.operatingDays());
        Market market = repository.findById(id).orElseThrow(() -> new MarketNotFoundException(id));
        apply(market, request);
        Market saved = repository.save(market);
        dayRepository.replaceDays(saved.getId(), days);
        long farmerCount = queryRepository.findById(id).map(MarketResource::farmerCount).orElse(0L);
        return toResource(saved, days, farmerCount);
    }

    /** Xoá mềm — đơn hàng cũ vẫn trỏ về chợ này. */
    @Override
    @Transactional
    public void deactivate(long id) {
        Market market = repository.findById(id).orElseThrow(() -> new MarketNotFoundException(id));
        market.setActive(false);
        repository.save(market);
    }

    private static List<Integer> validDays(List<Integer> days) {
        List<Integer> clean = days == null ? List.of() : days.stream().distinct().sorted().toList();
        for (Integer d : clean) {
            if (d == null || d < 0 || d > 6) {
                throw new IllegalArgumentException(
                        "Operating day must be between 0 (Sunday) and 6 (Saturday).");
            }
        }
        return clean;
    }

    private static void apply(Market market, MarketRequest request) {
        LocalTime opening = LocalTime.parse(request.openingTime(), HHMM);
        LocalTime closing = LocalTime.parse(request.closingTime(), HHMM);
        if (!closing.isAfter(opening)) {
            throw new IllegalArgumentException("The closing time must be after the opening time.");
        }
        market.setMarketName(request.marketName().trim());
        market.setAddress(request.address().trim());
        market.setDistrict(blankToNull(request.district()));
        market.setCity(blankToNull(request.city()) == null ? DEFAULT_CITY : request.city().trim());
        market.setLatitude(request.latitude());
        market.setLongitude(request.longitude());
        market.setOpeningTime(opening);
        market.setClosingTime(closing);
        market.setImageUrl(blankToNull(request.imageUrl()));
        // D-12: không đọc từ request — client không chọn được nhà cung cấp bản đồ.
        market.setMapProvider("osm");
    }

    private static MarketResource toResource(Market m, List<Integer> days, long farmerCount) {
        return new MarketResource(
                m.getId(),
                m.getMarketName(),
                m.getAddress(),
                m.getDistrict(),
                m.getCity(),
                m.getLatitude(),
                m.getLongitude(),
                m.getMapProvider(),
                m.getOpeningTime().format(HHMM),
                m.getClosingTime().format(HHMM),
                m.getImageUrl(),
                days,
                farmerCount);
    }

    private static String blankToNull(String s) {
        return s == null || s.isBlank() ? null : s.trim();
    }
}

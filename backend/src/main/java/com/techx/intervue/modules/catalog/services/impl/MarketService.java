package com.techx.intervue.modules.catalog.services.impl;

import com.techx.intervue.modules.catalog.entities.Market;
import com.techx.intervue.modules.catalog.exceptions.MarketNotFoundException;
import com.techx.intervue.modules.catalog.repositories.MarketImageRepository;
import com.techx.intervue.modules.catalog.repositories.MarketOperatingDayRepository;
import com.techx.intervue.modules.catalog.repositories.MarketQueryRepository;
import com.techx.intervue.modules.catalog.repositories.MarketRepository;
import com.techx.intervue.modules.catalog.requests.MarketRequest;
import com.techx.intervue.modules.catalog.resources.MarketDetailResource;
import com.techx.intervue.modules.catalog.resources.MarketResource;
import com.techx.intervue.modules.catalog.services.interfaces.MarketServiceInterface;
import com.techx.intervue.modules.stall.services.interfaces.StallServiceInterface;
import com.techx.intervue.modules.user.exceptions.InvalidFieldException;
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

    /**
     * Also the threshold of @Size on MarketRequest.images; repeated here for the length error
     * message.
     */
    private static final int MAX_IMAGES = 8;

    private static final int MAX_IMAGE_URL_LENGTH = 255;
    private static final String DEFAULT_CITY = "TP. Hồ Chí Minh";
    private static final DateTimeFormatter HHMM = DateTimeFormatter.ofPattern("HH:mm");

    private final MarketRepository repository;
    private final MarketOperatingDayRepository dayRepository;
    private final MarketImageRepository imageRepository;
    private final MarketQueryRepository queryRepository;

    /**
     * The only place where the catalog module reaches into the stall module; there is no reverse
     * direction.
     */
    private final StallServiceInterface stallService;

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
        return new MarketDetailResource(market, stallService.atMarket(id, null));
    }

    @Override
    @Transactional
    public MarketResource create(MarketRequest request) {
        List<Integer> days = validDays(request.operatingDays());
        List<String> images = validImages(request.images());
        Market market = new Market();
        apply(market, request, images);
        Market saved = repository.save(market);
        dayRepository.replaceDays(saved.getId(), days);
        imageRepository.replaceImages(saved.getId(), images);
        return toResource(saved, days, images, 0);
    }

    @Override
    @Transactional
    public MarketResource update(long id, MarketRequest request) {
        List<Integer> days = validDays(request.operatingDays());
        List<String> images = validImages(request.images());
        Market market = repository.findById(id).orElseThrow(() -> new MarketNotFoundException(id));
        apply(market, request, images);
        Market saved = repository.save(market);
        dayRepository.replaceDays(saved.getId(), days);
        imageRepository.replaceImages(saved.getId(), images);
        long farmerCount = queryRepository.findById(id).map(MarketResource::farmerCount).orElse(0L);
        return toResource(saved, days, images, farmerCount);
    }

    /** Soft delete — old orders still point to this market. */
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
                throw new InvalidFieldException(
                        "operatingDays",
                        "Operating day must be between 0 (Sunday) and 6 (Saturday).");
            }
        }
        return clean;
    }

    /**
     * @Size(max=8) on MarketRequest blocks the count; it cannot block each element's length, so it
     * is checked by hand here — the same lesson as the column-overflow bug in the Farmer
     * application ("categories", a fake 401 because DataIntegrityViolationException was not caught
     * early).
     */
    private static List<String> validImages(List<String> images) {
        List<String> clean =
                images == null
                        ? List.of()
                        : images.stream()
                                .filter(s -> s != null && !s.isBlank())
                                .map(String::trim)
                                .toList();
        // @NotEmpty on MarketRequest blocks null/an empty array; it cannot block an array of
        // all-blank strings.
        if (clean.isEmpty()) {
            throw new InvalidFieldException("images", "Add at least one photo.");
        }
        if (clean.size() > MAX_IMAGES) {
            throw new InvalidFieldException("images", "Add at most " + MAX_IMAGES + " images.");
        }
        for (String url : clean) {
            if (url.length() > MAX_IMAGE_URL_LENGTH) {
                throw new InvalidFieldException(
                        "images",
                        "Each image URL must be " + MAX_IMAGE_URL_LENGTH + " characters or fewer.");
            }
        }
        return clean;
    }

    private static void apply(Market market, MarketRequest request, List<String> images) {
        LocalTime opening = LocalTime.parse(request.openingTime(), HHMM);
        LocalTime closing = LocalTime.parse(request.closingTime(), HHMM);
        if (!closing.isAfter(opening)) {
            throw new InvalidFieldException(
                    "closingTime", "The closing time must be after the opening time.");
        }
        market.setMarketName(request.marketName().trim());
        market.setAddress(request.address().trim());
        market.setDistrict(blankToNull(request.district()));
        market.setCity(blankToNull(request.city()) == null ? DEFAULT_CITY : request.city().trim());
        market.setLatitude(request.latitude());
        market.setLongitude(request.longitude());
        market.setOpeningTime(opening);
        market.setClosingTime(closing);
        // markets.image_url (db/schema.sql) is the cover image: always the first image of
        // market_images.
        market.setImageUrl(images.isEmpty() ? null : images.get(0));
        // D-12: not read from the request — the client cannot choose the map provider.
        market.setMapProvider("osm");
    }

    private static MarketResource toResource(
            Market m, List<Integer> days, List<String> images, long farmerCount) {
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
                images,
                days,
                farmerCount);
    }

    private static String blankToNull(String s) {
        return s == null || s.isBlank() ? null : s.trim();
    }
}

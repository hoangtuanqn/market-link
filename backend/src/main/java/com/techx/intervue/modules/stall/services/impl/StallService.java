package com.techx.intervue.modules.stall.services.impl;

import com.techx.intervue.modules.farmer.entities.FarmerProfile;
import com.techx.intervue.modules.farmer.enums.ApprovalStatus;
import com.techx.intervue.modules.farmer.exceptions.FarmerProfileNotFoundException;
import com.techx.intervue.modules.farmer.repositories.FarmerProfileRepository;
import com.techx.intervue.modules.stall.entities.FarmerMarket;
import com.techx.intervue.modules.stall.exceptions.FarmerMarketNotFoundException;
import com.techx.intervue.modules.stall.exceptions.FarmerMarketNotYoursException;
import com.techx.intervue.modules.stall.exceptions.MarketAlreadyJoinedException;
import com.techx.intervue.modules.stall.exceptions.StallNotApprovedException;
import com.techx.intervue.modules.stall.repositories.FarmerMarketRepository;
import com.techx.intervue.modules.stall.repositories.FarmerOperatingDayRepository;
import com.techx.intervue.modules.stall.repositories.StallQueryRepository;
import com.techx.intervue.modules.stall.requests.JoinMarketRequest;
import com.techx.intervue.modules.stall.requests.OperatingDaysRequest;
import com.techx.intervue.modules.stall.requests.StallProfileRequest;
import com.techx.intervue.modules.stall.resources.StallDetailResource;
import com.techx.intervue.modules.stall.resources.StallMarketResource;
import com.techx.intervue.modules.stall.resources.StallSummaryResource;
import com.techx.intervue.modules.stall.services.interfaces.StallServiceInterface;
import com.techx.intervue.resources.PageResource;
import java.time.LocalTime;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import lombok.AllArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@AllArgsConstructor
public class StallService implements StallServiceInterface {

    private static final int MAX_PAGE_SIZE = 50;
    private static final int MIN_CUTOFF_HOURS = 1;
    private static final int MAX_CUTOFF_HOURS = 72;

    /**
     * Enough for every stall of a market in one pass — the market page does not paginate the Farmer
     * list.
     */
    private static final int AT_MARKET_LIMIT = 200;

    private final FarmerProfileRepository farmerProfileRepository;
    private final FarmerMarketRepository farmerMarketRepository;
    private final FarmerOperatingDayRepository operatingDayRepository;
    private final StallQueryRepository queryRepository;

    @Override
    public PageResource<StallSummaryResource> search(
            String q, Long marketId, Integer day, int page, int pageSize) {
        int safePage = Math.max(1, page);
        int safeSize = Math.min(MAX_PAGE_SIZE, Math.max(1, pageSize));
        return queryRepository.search(
                q == null || q.isBlank() ? null : q.trim(),
                marketId,
                day,
                (safePage - 1) * safeSize,
                safeSize);
    }

    /**
     * D-09: for customers, a stall that is not approved / is suspended simply does not exist — 404,
     * without revealing the reason.
     */
    @Override
    public StallDetailResource publicDetail(long farmerId) {
        FarmerProfile profile =
                farmerProfileRepository
                        .findById(farmerId)
                        .filter(f -> f.getApprovalStatus() == ApprovalStatus.APPROVED)
                        .orElseThrow(FarmerProfileNotFoundException::new);
        return toDetail(profile);
    }

    @Override
    public StallDetailResource myProfile(long userId) {
        return toDetail(mine(userId));
    }

    @Override
    @Transactional
    public StallDetailResource updateProfile(long userId, StallProfileRequest request) {
        FarmerProfile profile = mine(userId);
        int cutoff = request.orderCutoffHours();
        if (cutoff < MIN_CUTOFF_HOURS || cutoff > MAX_CUTOFF_HOURS) {
            throw new IllegalArgumentException("Order cutoff must be between 1 and 72 hours.");
        }
        profile.setStallName(request.stallName().trim());
        profile.setContactPerson(request.contactPerson().trim());
        profile.setDescription(blankToNull(request.description()));
        profile.setLogoUrl(blankToNull(request.logoUrl()));
        profile.setOrderCutoffHours(cutoff);
        return toDetail(farmerProfileRepository.save(profile));
    }

    @Override
    @Transactional
    public StallMarketResource joinMarket(long userId, JoinMarketRequest request) {
        FarmerProfile profile = mine(userId);
        requireApproved(profile);
        if (!queryRepository.marketExists(request.marketId())) {
            throw new IllegalArgumentException("Unknown market.");
        }
        FarmerMarket link =
                farmerMarketRepository
                        .findByFarmerIdAndMarketId(profile.getId(), request.marketId())
                        .orElse(null);
        if (link != null && link.isActive()) {
            throw new MarketAlreadyJoinedException();
        }
        if (link == null) {
            // Never sold here before
            link = new FarmerMarket();
            link.setFarmerId(profile.getId());
            link.setMarketId(request.marketId());
        }
        // Left and came back: turn the old row back on so historical slots/orders still point to
        // the right place
        link.setActive(true);
        link.setStallCode(blankToNull(request.stallCode()));
        link.setStallLatitude(request.stallLatitude());
        link.setStallLongitude(request.stallLongitude());
        FarmerMarket saved = farmerMarketRepository.save(link);
        return queryRepository.stallMarket(saved.getId()).orElse(null);
    }

    @Override
    @Transactional
    public void leaveMarket(long userId, long farmerMarketId) {
        FarmerProfile profile = mine(userId);
        FarmerMarket link = owned(profile, farmerMarketId);
        link.setActive(false);
        farmerMarketRepository.save(link);
    }

    @Override
    @Transactional
    public StallMarketResource setDays(
            long userId, long farmerMarketId, OperatingDaysRequest request) {
        FarmerProfile profile = mine(userId);
        requireApproved(profile);
        FarmerMarket link = owned(profile, farmerMarketId);

        Set<Integer> seen = new HashSet<>();
        for (OperatingDaysRequest.Day day : request.days()) {
            if (!seen.add(day.dayOfWeek())) {
                throw new IllegalArgumentException("Each weekday can appear once.");
            }
            LocalTime start = LocalTime.parse(day.pickupStartTime());
            LocalTime end = LocalTime.parse(day.pickupEndTime());
            if (!end.isAfter(start)) {
                throw new IllegalArgumentException("The pickup window must end after it starts.");
            }
        }
        operatingDayRepository.replaceDays(link.getId(), request.days());
        return queryRepository.stallMarket(link.getId()).orElse(null);
    }

    @Override
    public List<StallSummaryResource> atMarket(long marketId, Integer day) {
        return queryRepository.search(null, marketId, day, 0, AT_MARKET_LIMIT).items();
    }

    /**
     * R-06: the profile is always looked up by the token's userId; there is no path that takes a
     * farmerId from the request.
     */
    private FarmerProfile mine(long userId) {
        return farmerProfileRepository
                .findByUserId(userId)
                .orElseThrow(FarmerProfileNotFoundException::new);
    }

    private static void requireApproved(FarmerProfile profile) {
        if (profile.getApprovalStatus() != ApprovalStatus.APPROVED) {
            throw new StallNotApprovedException();
        }
    }

    private FarmerMarket owned(FarmerProfile profile, long farmerMarketId) {
        FarmerMarket link =
                farmerMarketRepository
                        .findById(farmerMarketId)
                        .orElseThrow(FarmerMarketNotFoundException::new);
        if (!link.getFarmerId().equals(profile.getId())) {
            throw new FarmerMarketNotYoursException();
        }
        return link;
    }

    private StallDetailResource toDetail(FarmerProfile p) {
        return new StallDetailResource(
                p.getId(),
                p.getStallName(),
                p.getContactPerson(),
                p.getDescription(),
                p.getLogoUrl(),
                p.getOrderCutoffHours(),
                p.getRatingAvg(),
                p.getRatingCount(),
                p.getApprovalStatus().name().toLowerCase(Locale.ROOT),
                queryRepository.marketsOf(p.getId()));
    }

    private static String blankToNull(String s) {
        return s == null || s.isBlank() ? null : s.trim();
    }
}

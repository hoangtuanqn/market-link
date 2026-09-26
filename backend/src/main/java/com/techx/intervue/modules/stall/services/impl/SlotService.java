package com.techx.intervue.modules.stall.services.impl;

import com.techx.intervue.modules.farmer.entities.FarmerProfile;
import com.techx.intervue.modules.farmer.enums.ApprovalStatus;
import com.techx.intervue.modules.farmer.exceptions.FarmerProfileNotFoundException;
import com.techx.intervue.modules.farmer.repositories.FarmerProfileRepository;
import com.techx.intervue.modules.stall.entities.FarmerMarket;
import com.techx.intervue.modules.stall.entities.FarmerOperatingDay;
import com.techx.intervue.modules.stall.entities.PickupSlot;
import com.techx.intervue.modules.stall.exceptions.FarmerMarketNotFoundException;
import com.techx.intervue.modules.stall.exceptions.FarmerMarketNotYoursException;
import com.techx.intervue.modules.stall.exceptions.SlotBelowBookedException;
import com.techx.intervue.modules.stall.exceptions.SlotNotFoundException;
import com.techx.intervue.modules.stall.exceptions.SlotNotYoursException;
import com.techx.intervue.modules.stall.exceptions.StallNotApprovedException;
import com.techx.intervue.modules.stall.repositories.FarmerMarketRepository;
import com.techx.intervue.modules.stall.repositories.FarmerOperatingDayRepository;
import com.techx.intervue.modules.stall.repositories.PickupSlotRepository;
import com.techx.intervue.modules.stall.repositories.SlotQueryRepository;
import com.techx.intervue.modules.stall.requests.GenerateSlotsRequest;
import com.techx.intervue.modules.stall.requests.UpdateSlotRequest;
import com.techx.intervue.modules.stall.resources.SlotResource;
import com.techx.intervue.modules.stall.services.interfaces.SlotServiceInterface;
import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;
import lombok.AllArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * FR-032, FR-067 — a Farmer generates slots from their weekday time windows
 * (farmer_operating_days), edits a slot's capacity or turns it off; a customer views a stall's
 * still-open slots.
 */
@Service
@AllArgsConstructor
public class SlotService implements SlotServiceInterface {

    /** One click of "Generate" must not spawn thousands of rows. */
    private static final int MAX_RANGE_DAYS = 60;

    /**
     * No date given: from today through the next 14 days — enough for the cart to build its
     * pickup-day list.
     */
    private static final int DEFAULT_PUBLIC_DAYS = 14;

    private final FarmerProfileRepository farmerProfileRepository;
    private final FarmerMarketRepository farmerMarketRepository;
    private final FarmerOperatingDayRepository operatingDayRepository;
    private final PickupSlotRepository slotRepository;
    private final SlotQueryRepository queryRepository;
    private final Clock clock;

    /**
     * Cuts [start, end) of one day into slotMinutes-minute windows; a leftover partial window at
     * the end is dropped. Computed in minutes of the day: LocalTime.plusMinutes wraps past 00:00,
     * so a loop written in LocalTime could run forever for a window right up against midnight.
     */
    static List<LocalTime[]> windows(LocalTime start, LocalTime end, int slotMinutes) {
        List<LocalTime[]> out = new ArrayList<>();
        int endMinute = end.getHour() * 60 + end.getMinute();
        for (int m = start.getHour() * 60 + start.getMinute();
                m + slotMinutes <= endMinute;
                m += slotMinutes) {
            out.add(new LocalTime[] {minuteOfDay(m), minuteOfDay(m + slotMinutes)});
        }
        return out;
    }

    private static LocalTime minuteOfDay(int m) {
        return LocalTime.of(m / 60, m % 60);
    }

    @Override
    @Transactional
    public List<SlotResource> generateSlots(long userId, GenerateSlotsRequest request) {
        FarmerProfile profile = mine(userId);
        requireApproved(profile);
        FarmerMarket link = owned(profile, request.farmerMarketId());
        if (!link.isActive()) {
            throw new IllegalArgumentException("You no longer sell at this market.");
        }
        LocalDate from = request.fromDate();
        LocalDate to = request.toDate();
        if (from.isBefore(today())) {
            throw new IllegalArgumentException("Slots cannot start in the past.");
        }
        if (to.isBefore(from)) {
            throw new IllegalArgumentException("The end date must not be before the start date.");
        }
        if (ChronoUnit.DAYS.between(from, to) >= MAX_RANGE_DAYS) {
            throw new IllegalArgumentException(
                    "Generate at most " + MAX_RANGE_DAYS + " days at a time.");
        }

        // 0 = Sunday … 6 = Saturday, like farmer_operating_days; Java's DayOfWeek: Mon = 1 … Sun =
        // 7
        Map<Integer, FarmerOperatingDay> byWeekday =
                operatingDayRepository.findByFarmerMarketId(link.getId()).stream()
                        .collect(
                                Collectors.toMap(
                                        FarmerOperatingDay::getDayOfWeek, Function.identity()));
        List<PickupSlot> existing =
                slotRepository.findByFarmerMarketIdAndSlotDateBetween(link.getId(), from, to);
        // Idempotent: an existing slot (even a disabled one, or one whose capacity was already
        // edited) is left unchanged; uq_slot also blocks
        // two simultaneous requests
        Set<String> taken = new HashSet<>();
        for (PickupSlot s : existing) {
            taken.add(s.getSlotDate() + "@" + s.getStartTime());
        }

        List<PickupSlot> fresh = new ArrayList<>();
        for (LocalDate d = from; !d.isAfter(to); d = d.plusDays(1)) {
            FarmerOperatingDay day = byWeekday.get(d.getDayOfWeek().getValue() % 7);
            if (day == null) {
                continue;
            }
            for (LocalTime[] w :
                    windows(
                            day.getPickupStartTime(),
                            day.getPickupEndTime(),
                            request.slotMinutes())) {
                if (taken.contains(d + "@" + w[0])) {
                    continue;
                }
                PickupSlot slot = new PickupSlot();
                slot.setFarmerMarketId(link.getId());
                slot.setSlotDate(d);
                slot.setStartTime(w[0]);
                slot.setEndTime(w[1]);
                slot.setMaxOrders(request.maxOrders());
                fresh.add(slot);
            }
        }

        List<PickupSlot> all = new ArrayList<>(existing);
        if (!fresh.isEmpty()) {
            all.addAll(slotRepository.saveAll(fresh));
        }
        return all.stream()
                .sorted(
                        Comparator.comparing(PickupSlot::getSlotDate)
                                .thenComparing(PickupSlot::getStartTime))
                .map(s -> SlotResource.of(s, link.getMarketId()))
                .toList();
    }

    @Override
    @Transactional
    public SlotResource updateSlot(long userId, long slotId, UpdateSlotRequest request) {
        FarmerProfile profile = mine(userId);
        // Locked the same way as placing an order (C5): the order count read here cannot change
        // until this write finishes
        PickupSlot slot = slotRepository.lockById(slotId).orElseThrow(SlotNotFoundException::new);
        FarmerMarket link =
                farmerMarketRepository
                        .findById(slot.getFarmerMarketId())
                        .orElseThrow(SlotNotFoundException::new);
        if (!link.getFarmerId().equals(profile.getId())) {
            throw new SlotNotYoursException();
        }
        if (request.maxOrders() != null) {
            if (request.maxOrders() < slot.getBookedCount()) {
                throw new SlotBelowBookedException(slot.getBookedCount());
            }
            slot.setMaxOrders(request.maxOrders());
        }
        if (request.isActive() != null) {
            slot.setActive(request.isActive());
        }
        return SlotResource.of(slotRepository.save(slot), link.getMarketId());
    }

    /**
     * D-09: a stall not approved / suspended has no slots for customers → 404, without revealing
     * the reason.
     */
    @Override
    public List<SlotResource> publicSlots(long farmerId, Long marketId, LocalDate date) {
        farmerProfileRepository
                .findById(farmerId)
                .filter(f -> f.getApprovalStatus() == ApprovalStatus.APPROVED)
                .orElseThrow(FarmerProfileNotFoundException::new);
        LocalDate from = date != null ? date : today();
        LocalDate to = date != null ? date : from.plusDays(DEFAULT_PUBLIC_DAYS - 1L);
        return queryRepository.publicSlots(farmerId, marketId, from, to);
    }

    private LocalDate today() {
        return LocalDate.now(clock);
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
}

package com.techx.intervue.modules.stall.repositories;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.techx.intervue.modules.catalog.entities.Market;
import com.techx.intervue.modules.catalog.repositories.MarketOperatingDayRepository;
import com.techx.intervue.modules.catalog.repositories.MarketRepository;
import com.techx.intervue.modules.farmer.entities.FarmerProfile;
import com.techx.intervue.modules.farmer.enums.ApprovalStatus;
import com.techx.intervue.modules.farmer.repositories.FarmerProfileRepository;
import com.techx.intervue.modules.stall.entities.FarmerMarket;
import com.techx.intervue.modules.stall.entities.PickupSlot;
import com.techx.intervue.modules.stall.requests.OperatingDaysRequest;
import com.techx.intervue.modules.stall.resources.SlotResource;
import com.techx.intervue.modules.user.entities.User;
import com.techx.intervue.modules.user.enums.RoleType;
import com.techx.intervue.modules.user.repositories.UserRepository;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.IntStream;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.transaction.annotation.Transactional;

/**
 * Runs on real MySQL: the public-slot statement is plain SQL, and the D-06 guardrail is a database
 * CHECK — both are only checkable on the real engine.
 */
@SpringBootTest
@Transactional
class SlotQueryRepositoryTest {

    private static final LocalDate DAY = LocalDate.of(2031, 3, 2);

    /** Long before DAY: no slot of DAY has reached its cutoff yet. */
    private static final LocalDateTime EARLY = LocalDateTime.of(2031, 1, 1, 0, 0);

    @Autowired UserRepository users;
    @Autowired FarmerProfileRepository farmers;
    @Autowired MarketRepository markets;
    @Autowired FarmerMarketRepository farmerMarkets;
    @Autowired PickupSlotRepository slots;
    @Autowired SlotQueryRepository query;
    @Autowired MarketOperatingDayRepository marketDays;
    @Autowired FarmerOperatingDayRepository farmerDays;
    @Autowired org.springframework.jdbc.core.JdbcTemplate jdbc;

    private String tag() {
        return UUID.randomUUID().toString().substring(0, 8);
    }

    private FarmerProfile approvedFarmer() {
        String tag = tag();
        User u =
                users.save(
                        User.builder()
                                .fullName("Slot " + tag)
                                .email(tag + "@slot.test")
                                .phone(
                                        "08"
                                                + String.format(
                                                        "%08d",
                                                        Math.abs(tag.hashCode()) % 100_000_000))
                                .passwordHash("x")
                                .role(RoleType.FARMER)
                                .build());
        return farmers.save(
                FarmerProfile.builder()
                        .userId(u.getId())
                        .stallName("Stall " + tag)
                        .contactPerson("Người bán " + tag)
                        .approvalStatus(ApprovalStatus.APPROVED)
                        .build());
    }

    private Market market() {
        Market m = new Market();
        m.setMarketName("Chợ slot " + tag());
        m.setAddress("Test");
        m.setLatitude(new BigDecimal("10.80000000"));
        m.setLongitude(new BigDecimal("106.70000000"));
        m.setOpeningTime(LocalTime.of(6, 0));
        m.setClosingTime(LocalTime.of(18, 0));
        return markets.save(m);
    }

    /**
     * The market is held every day and the stall attends every day, so only the rule a test is
     * about can hide a slot (FR-032, FR-060, FR-073).
     */
    private FarmerMarket link(FarmerProfile f, Market m) {
        FarmerMarket fm = new FarmerMarket();
        fm.setFarmerId(f.getId());
        fm.setMarketId(m.getId());
        FarmerMarket saved = farmerMarkets.save(fm);
        marketDays.replaceDays(m.getId(), IntStream.range(0, 7).boxed().toList());
        farmerDays.replaceDays(saved.getId(), everyDay());
        return saved;
    }

    private static List<OperatingDaysRequest.Day> everyDay() {
        return IntStream.range(0, 7)
                .mapToObj(d -> new OperatingDaysRequest.Day(d, "06:00", "11:00"))
                .toList();
    }

    /** 0 = Sunday … 6 = Saturday, the day_of_week convention of both operating-day tables. */
    private static int weekdayOf(LocalDate date) {
        return date.getDayOfWeek().getValue() % 7;
    }

    private PickupSlot slot(FarmerMarket fm, LocalDate date, int hour, int booked, boolean active) {
        PickupSlot s = new PickupSlot();
        s.setFarmerMarketId(fm.getId());
        s.setSlotDate(date);
        s.setStartTime(LocalTime.of(hour, 0));
        s.setEndTime(LocalTime.of(hour + 1, 0));
        s.setMaxOrders(5);
        s.setBookedCount(booked);
        s.setActive(active);
        return slots.saveAndFlush(s);
    }

    @Test
    void publicSlotsShowOpenAndFullSlotsButNeverTurnedOffOnes() {
        FarmerProfile f = approvedFarmer();
        Market m = market();
        FarmerMarket fm = link(f, m);
        slot(fm, DAY, 7, 2, true);
        slot(fm, DAY, 8, 5, true);
        slot(fm, DAY, 9, 0, false);
        slot(fm, DAY.plusDays(1), 7, 0, true);

        List<SlotResource> out = query.publicSlots(f.getId(), null, DAY, DAY, EARLY);

        assertThat(out)
                .extracting(SlotResource::startTime, SlotResource::isFull, SlotResource::marketId)
                .containsExactly(
                        org.assertj.core.groups.Tuple.tuple("07:00", false, m.getId()),
                        org.assertj.core.groups.Tuple.tuple("08:00", true, m.getId()));
        assertThat(query.publicSlots(f.getId(), m.getId() + 100_000, DAY, DAY, EARLY)).isEmpty();
    }

    /**
     * Leaving a market (fm.is_active = FALSE) makes a slot there disappear from the customer's
     * page.
     */
    @Test
    void publicSlotsHideAMarketTheStallHasLeft() {
        FarmerProfile f = approvedFarmer();
        FarmerMarket fm = link(f, market());
        slot(fm, DAY, 7, 0, true);
        fm.setActive(false);
        farmerMarkets.saveAndFlush(fm);

        assertThat(query.publicSlots(f.getId(), null, DAY, DAY, EARLY)).isEmpty();
    }

    /**
     * FR-032/D-05: a slot whose cutoff (start − the stall's order_cutoff_hours) has passed no
     * longer takes orders, so the customer never gets it to pick — placing it would only answer 409
     * CUTOFF_PASSED.
     */
    @Test
    void publicSlotsHideSlotsPastTheirCutoff() {
        FarmerProfile f = approvedFarmer(); // order_cutoff_hours = 12
        FarmerMarket fm = link(f, market());
        slot(fm, DAY, 7, 0, true); // cutoff DAY-1 19:00
        slot(fm, DAY, 8, 0, true); // cutoff DAY-1 20:00
        slot(fm, DAY, 9, 0, true); // cutoff DAY-1 21:00

        List<SlotResource> out =
                query.publicSlots(f.getId(), null, DAY, DAY, DAY.minusDays(1).atTime(20, 0));

        assertThat(out).extracting(SlotResource::startTime).containsExactly("09:00");
    }

    /** D-06: even with a code bug, the database does not let booked_count exceed max_orders. */
    @Test
    void databaseRefusesMoreBookingsThanCapacity() {
        FarmerMarket fm = link(approvedFarmer(), market());

        assertThatThrownBy(() -> slot(fm, DAY, 7, 6, true))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    /**
     * FR-073: the admin stopped holding the market on DAY's weekday. Slots already generated for
     * that day must no longer be offered.
     */
    @Test
    void publicSlotsHideADayTheMarketIsNoLongerHeld() {
        FarmerProfile f = approvedFarmer();
        Market m = market();
        FarmerMarket fm = link(f, m);
        slot(fm, DAY, 7, 0, true);
        slot(fm, DAY.plusDays(1), 7, 0, true);
        marketDays.replaceDays(
                m.getId(), IntStream.range(0, 7).filter(d -> d != weekdayOf(DAY)).boxed().toList());

        List<SlotResource> out = query.publicSlots(f.getId(), null, DAY, DAY.plusDays(1), EARLY);

        assertThat(out)
                .extracting(SlotResource::slotDate)
                .containsExactly(DAY.plusDays(1).toString());
    }

    /**
     * FR-060: the stall took DAY's weekday out of its operating days at this market. Slots it had
     * generated for that day must no longer be offered.
     */
    @Test
    void publicSlotsHideADayTheStallNoLongerAttends() {
        FarmerProfile f = approvedFarmer();
        FarmerMarket fm = link(f, market());
        slot(fm, DAY, 7, 0, true);
        slot(fm, DAY.plusDays(1), 7, 0, true);
        farmerDays.replaceDays(
                fm.getId(),
                everyDay().stream().filter(d -> d.dayOfWeek() != weekdayOf(DAY)).toList());

        List<SlotResource> out = query.publicSlots(f.getId(), null, DAY, DAY.plusDays(1), EARLY);

        assertThat(out)
                .extracting(SlotResource::slotDate)
                .containsExactly(DAY.plusDays(1).toString());
    }

    /**
     * The slot-booking check reads the same rule: a slot on a weekday the market or the stall has
     * dropped is not on an open day any more.
     */
    @Test
    void aSlotIsOnAnOpenDayOnlyWhileBothTheMarketAndTheStallStillOpenThatWeekday() {
        FarmerProfile f = approvedFarmer();
        Market m = market();
        FarmerMarket fm = link(f, m);
        PickupSlot open = slot(fm, DAY, 7, 0, true);
        PickupSlot marketClosed = slot(fm, DAY.plusDays(1), 7, 0, true);
        PickupSlot stallAway = slot(fm, DAY.plusDays(2), 7, 0, true);
        marketDays.replaceDays(
                m.getId(),
                IntStream.range(0, 7)
                        .filter(d -> d != weekdayOf(DAY.plusDays(1)))
                        .boxed()
                        .toList());
        farmerDays.replaceDays(
                fm.getId(),
                everyDay().stream()
                        .filter(d -> d.dayOfWeek() != weekdayOf(DAY.plusDays(2)))
                        .toList());

        assertThat(slots.isOnOpenDay(open.getId())).isTrue();
        assertThat(slots.isOnOpenDay(marketClosed.getId())).isFalse();
        assertThat(slots.isOnOpenDay(stallAway.getId())).isFalse();
    }

    /**
     * A date counts as orderable only when a slot still has room, is switched on and is before its
     * cutoff — the dates the availability resolver may show stock for.
     */
    @Test
    void orderableDatesKeepOnlyDatesWithAFreeSlotBeforeItsCutoff() {
        FarmerProfile f = approvedFarmer();
        FarmerMarket fm = link(f, market());
        slot(fm, DAY, 7, 2, true); // open
        slot(fm, DAY.plusDays(1), 7, 5, true); // full
        slot(fm, DAY.plusDays(2), 7, 0, false); // turned off
        slot(fm, DAY.plusDays(3), 7, 0, true); // past its cutoff at "now" below

        // 12 hours (the default cutoff) before DAY+3 07:00 is DAY+2 19:00
        LocalDateTime now = DAY.plusDays(2).atTime(20, 0);
        assertThat(query.orderableDates(List.of(f.getId()), DAY, DAY.plusDays(6), EARLY))
                .containsEntry(f.getId(), java.util.Set.of(DAY, DAY.plusDays(3)));
        assertThat(query.orderableDates(List.of(f.getId()), DAY, DAY.plusDays(6), now))
                .doesNotContainKey(f.getId());
        assertThat(query.orderableDates(List.of(), DAY, DAY, EARLY)).isEmpty();
    }

    /**
     * The availability resolver reads the same open-day rule: a dropped weekday is not orderable.
     */
    @Test
    void orderableDatesSkipAWeekdayTheMarketNoLongerHolds() {
        FarmerProfile f = approvedFarmer();
        Market m = market();
        FarmerMarket fm = link(f, m);
        slot(fm, DAY, 7, 0, true);
        slot(fm, DAY.plusDays(1), 7, 0, true);
        marketDays.replaceDays(
                m.getId(), IntStream.range(0, 7).filter(d -> d != weekdayOf(DAY)).boxed().toList());

        assertThat(query.orderableDates(List.of(f.getId()), DAY, DAY.plusDays(1), EARLY))
                .containsEntry(f.getId(), Set.of(DAY.plusDays(1)));
    }
}

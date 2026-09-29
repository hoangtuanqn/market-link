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

@SpringBootTest
@Transactional
class SlotQueryRepositoryTest {

    private static final LocalDate DAY = LocalDate.of(2031, 3, 2);

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

    @Test
    void publicSlotsHideAMarketTheStallHasLeft() {
        FarmerProfile f = approvedFarmer();
        FarmerMarket fm = link(f, market());
        slot(fm, DAY, 7, 0, true);
        fm.setActive(false);
        farmerMarkets.saveAndFlush(fm);

        assertThat(query.publicSlots(f.getId(), null, DAY, DAY, EARLY)).isEmpty();
    }

    @Test
    void publicSlotsHideSlotsPastTheirCutoff() {
        FarmerProfile f = approvedFarmer();
        FarmerMarket fm = link(f, market());
        slot(fm, DAY, 7, 0, true);
        slot(fm, DAY, 8, 0, true);
        slot(fm, DAY, 9, 0, true);

        List<SlotResource> out =
                query.publicSlots(f.getId(), null, DAY, DAY, DAY.minusDays(1).atTime(20, 0));

        assertThat(out).extracting(SlotResource::startTime).containsExactly("09:00");
    }

    @Test
    void databaseRefusesMoreBookingsThanCapacity() {
        FarmerMarket fm = link(approvedFarmer(), market());

        assertThatThrownBy(() -> slot(fm, DAY, 7, 6, true))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

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

    @Test
    void aSlotOutsideTheStallsCurrentTimeWindowIsNotOfferedNorBookable() {
        FarmerProfile f = approvedFarmer();
        FarmerMarket fm = link(f, market());
        PickupSlot early = slot(fm, DAY, 7, 0, true);
        PickupSlot inside = slot(fm, DAY, 8, 0, true);
        PickupSlot late = slot(fm, DAY, 10, 0, true);
        farmerDays.replaceDays(
                fm.getId(),
                everyDay().stream()
                        .map(
                                d ->
                                        d.dayOfWeek() == weekdayOf(DAY)
                                                ? new OperatingDaysRequest.Day(
                                                        d.dayOfWeek(), "08:00", "10:00")
                                                : d)
                        .toList());

        assertThat(query.publicSlots(f.getId(), null, DAY, DAY, EARLY))
                .extracting(SlotResource::startTime)
                .containsExactly("08:00");
        assertThat(slots.isOnOpenDay(early.getId())).isFalse();
        assertThat(slots.isOnOpenDay(inside.getId())).isTrue();
        assertThat(slots.isOnOpenDay(late.getId())).isFalse();
    }

    @Test
    void orderableDatesKeepOnlyDatesWithAFreeSlotBeforeItsCutoff() {
        FarmerProfile f = approvedFarmer();
        FarmerMarket fm = link(f, market());
        slot(fm, DAY, 7, 2, true);
        slot(fm, DAY.plusDays(1), 7, 5, true);
        slot(fm, DAY.plusDays(2), 7, 0, false);
        slot(fm, DAY.plusDays(3), 7, 0, true);

        LocalDateTime now = DAY.plusDays(2).atTime(20, 0);
        assertThat(query.orderableDates(List.of(f.getId()), DAY, DAY.plusDays(6), EARLY))
                .containsEntry(f.getId(), java.util.Set.of(DAY, DAY.plusDays(3)));
        assertThat(query.orderableDates(List.of(f.getId()), DAY, DAY.plusDays(6), now))
                .doesNotContainKey(f.getId());
        assertThat(query.orderableDates(List.of(), DAY, DAY, EARLY)).isEmpty();
    }

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

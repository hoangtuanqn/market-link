package com.techx.intervue.modules.stall.repositories;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.techx.intervue.modules.catalog.entities.Market;
import com.techx.intervue.modules.catalog.repositories.MarketRepository;
import com.techx.intervue.modules.farmer.entities.FarmerProfile;
import com.techx.intervue.modules.farmer.enums.ApprovalStatus;
import com.techx.intervue.modules.farmer.repositories.FarmerProfileRepository;
import com.techx.intervue.modules.stall.entities.FarmerMarket;
import com.techx.intervue.modules.stall.entities.PickupSlot;
import com.techx.intervue.modules.stall.resources.SlotResource;
import com.techx.intervue.modules.user.entities.User;
import com.techx.intervue.modules.user.enums.RoleType;
import com.techx.intervue.modules.user.repositories.UserRepository;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.UUID;
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

    @Autowired UserRepository users;
    @Autowired FarmerProfileRepository farmers;
    @Autowired MarketRepository markets;
    @Autowired FarmerMarketRepository farmerMarkets;
    @Autowired PickupSlotRepository slots;
    @Autowired SlotQueryRepository query;

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
        m.setCity("TP. Hồ Chí Minh");
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
        return farmerMarkets.save(fm);
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

        List<SlotResource> out = query.publicSlots(f.getId(), null, DAY, DAY);

        assertThat(out)
                .extracting(SlotResource::startTime, SlotResource::isFull, SlotResource::marketId)
                .containsExactly(
                        org.assertj.core.groups.Tuple.tuple("07:00", false, m.getId()),
                        org.assertj.core.groups.Tuple.tuple("08:00", true, m.getId()));
        assertThat(query.publicSlots(f.getId(), m.getId() + 100_000, DAY, DAY)).isEmpty();
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

        assertThat(query.publicSlots(f.getId(), null, DAY, DAY)).isEmpty();
    }

    /** D-06: even with a code bug, the database does not let booked_count exceed max_orders. */
    @Test
    void databaseRefusesMoreBookingsThanCapacity() {
        FarmerMarket fm = link(approvedFarmer(), market());

        assertThatThrownBy(() -> slot(fm, DAY, 7, 6, true))
                .isInstanceOf(DataIntegrityViolationException.class);
    }
}

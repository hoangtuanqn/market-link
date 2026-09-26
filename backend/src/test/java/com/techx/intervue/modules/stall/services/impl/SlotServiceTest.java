package com.techx.intervue.modules.stall.services.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.techx.intervue.modules.farmer.entities.FarmerProfile;
import com.techx.intervue.modules.farmer.enums.ApprovalStatus;
import com.techx.intervue.modules.farmer.exceptions.FarmerProfileNotFoundException;
import com.techx.intervue.modules.farmer.repositories.FarmerProfileRepository;
import com.techx.intervue.modules.stall.entities.FarmerMarket;
import com.techx.intervue.modules.stall.entities.FarmerOperatingDay;
import com.techx.intervue.modules.stall.entities.PickupSlot;
import com.techx.intervue.modules.stall.exceptions.FarmerMarketNotYoursException;
import com.techx.intervue.modules.stall.exceptions.SlotBelowBookedException;
import com.techx.intervue.modules.stall.exceptions.SlotNotYoursException;
import com.techx.intervue.modules.stall.repositories.FarmerMarketRepository;
import com.techx.intervue.modules.stall.repositories.FarmerOperatingDayRepository;
import com.techx.intervue.modules.stall.repositories.PickupSlotRepository;
import com.techx.intervue.modules.stall.repositories.SlotQueryRepository;
import com.techx.intervue.modules.stall.requests.GenerateSlotsRequest;
import com.techx.intervue.modules.stall.requests.UpdateSlotRequest;
import com.techx.intervue.modules.stall.resources.SlotResource;
import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

/** FR-032, FR-067 — sinh và quản slot. Hôm nay (theo Clock) là thứ Bảy 26/09/2026. */
class SlotServiceTest {

    private static final long USER_ID = 1L;
    private static final long FARMER_ID = 10L;
    private static final long MARKET_ID = 2L;
    private static final long FARMER_MARKET_ID = 55L;
    private static final ZoneId HCM = ZoneId.of("Asia/Ho_Chi_Minh");
    private static final LocalDate TODAY = LocalDate.of(2026, 9, 26);

    private FarmerProfileRepository farmerProfileRepository;
    private FarmerMarketRepository farmerMarketRepository;
    private FarmerOperatingDayRepository operatingDayRepository;
    private PickupSlotRepository slotRepository;
    private SlotQueryRepository queryRepository;
    private SlotService service;

    /** Bảng pickup_slots giả: saveAll ghi vào đây, tìm theo khoảng ngày đọc từ đây. */
    private final List<PickupSlot> table = new ArrayList<>();

    @BeforeEach
    void setUp() {
        farmerProfileRepository = mock(FarmerProfileRepository.class);
        farmerMarketRepository = mock(FarmerMarketRepository.class);
        operatingDayRepository = mock(FarmerOperatingDayRepository.class);
        slotRepository = mock(PickupSlotRepository.class);
        queryRepository = mock(SlotQueryRepository.class);
        Clock clock =
                Clock.fixed(ZonedDateTime.of(TODAY, LocalTime.of(9, 0), HCM).toInstant(), HCM);
        service =
                new SlotService(
                        farmerProfileRepository,
                        farmerMarketRepository,
                        operatingDayRepository,
                        slotRepository,
                        queryRepository,
                        clock);

        when(farmerProfileRepository.findByUserId(USER_ID))
                .thenReturn(Optional.of(stall(ApprovalStatus.APPROVED)));
        when(farmerMarketRepository.findById(FARMER_MARKET_ID))
                .thenReturn(Optional.of(link(FARMER_ID, true)));
        when(slotRepository.findByFarmerMarketIdAndSlotDateBetween(any(), any(), any()))
                .thenAnswer(
                        inv -> {
                            LocalDate from = inv.getArgument(1);
                            LocalDate to = inv.getArgument(2);
                            return table.stream()
                                    .filter(
                                            s ->
                                                    !s.getSlotDate().isBefore(from)
                                                            && !s.getSlotDate().isAfter(to))
                                    .toList();
                        });
        when(slotRepository.saveAll(any()))
                .thenAnswer(
                        inv -> {
                            Collection<PickupSlot> rows = inv.getArgument(0);
                            table.addAll(rows);
                            return List.copyOf(rows);
                        });
    }

    private static FarmerProfile stall(ApprovalStatus status) {
        return FarmerProfile.builder()
                .id(FARMER_ID)
                .userId(USER_ID)
                .stallName("Vườn Út Hiền")
                .contactPerson("Lê Thị Út Hiền")
                .approvalStatus(status)
                .build();
    }

    private static FarmerMarket link(long farmerId, boolean active) {
        FarmerMarket fm = new FarmerMarket();
        fm.setId(FARMER_MARKET_ID);
        fm.setFarmerId(farmerId);
        fm.setMarketId(MARKET_ID);
        fm.setActive(active);
        return fm;
    }

    /** 0 = Chủ nhật … 6 = Thứ bảy, như farmer_operating_days. */
    private void operatingDays(int dayOfWeek, String start, String end) {
        FarmerOperatingDay d = new FarmerOperatingDay();
        d.setFarmerMarketId(FARMER_MARKET_ID);
        d.setDayOfWeek(dayOfWeek);
        d.setPickupStartTime(LocalTime.parse(start));
        d.setPickupEndTime(LocalTime.parse(end));
        when(operatingDayRepository.findByFarmerMarketId(FARMER_MARKET_ID)).thenReturn(List.of(d));
    }

    private static GenerateSlotsRequest generate(LocalDate from, LocalDate to) {
        return new GenerateSlotsRequest(FARMER_MARKET_ID, from, to, 60, 5);
    }

    private static PickupSlot slot(int maxOrders, int bookedCount, boolean active) {
        PickupSlot s = new PickupSlot();
        s.setId(900L);
        s.setFarmerMarketId(FARMER_MARKET_ID);
        s.setSlotDate(TODAY.plusDays(1));
        s.setStartTime(LocalTime.of(7, 0));
        s.setEndTime(LocalTime.of(8, 0));
        s.setMaxOrders(maxOrders);
        s.setBookedCount(bookedCount);
        s.setActive(active);
        return s;
    }

    /** CN 07:00–11:00, khung 60 phút, khoảng T2 28/09 → CN 04/10: đúng 4 slot, tất cả vào CN. */
    @Test
    void generateCreatesOneSlotPerWindowPerMatchingWeekday() {
        operatingDays(0, "07:00", "11:00");

        List<SlotResource> slots =
                service.generateSlots(
                        USER_ID, generate(LocalDate.of(2026, 9, 28), LocalDate.of(2026, 10, 4)));

        assertThat(slots).extracting(SlotResource::slotDate).containsOnly("2026-10-04").hasSize(4);
        assertThat(slots)
                .extracting(SlotResource::startTime, SlotResource::endTime)
                .containsExactly(
                        org.assertj.core.groups.Tuple.tuple("07:00", "08:00"),
                        org.assertj.core.groups.Tuple.tuple("08:00", "09:00"),
                        org.assertj.core.groups.Tuple.tuple("09:00", "10:00"),
                        org.assertj.core.groups.Tuple.tuple("10:00", "11:00"));
        assertThat(slots)
                .allSatisfy(
                        s -> {
                            assertThat(s.maxOrders()).isEqualTo(5);
                            assertThat(s.bookedCount()).isZero();
                            assertThat(s.marketId()).isEqualTo(MARKET_ID);
                        });
    }

    /** Chỉ khai giờ thứ Bảy → khoảng T3 29/09 … T7 03/10 không có slot nào ngoài thứ Bảy. */
    @Test
    void generateSkipsWeekdaysWithNoOperatingDay() {
        operatingDays(6, "07:00", "09:00");

        List<SlotResource> slots =
                service.generateSlots(
                        USER_ID, generate(LocalDate.of(2026, 9, 29), LocalDate.of(2026, 10, 3)));

        assertThat(slots).extracting(SlotResource::slotDate).containsOnly("2026-10-03");
        assertThat(table)
                .extracting(PickupSlot::getSlotDate)
                .noneMatch(d -> d.equals(LocalDate.of(2026, 9, 29)));
    }

    /** Bấm "Generate" hai lần cùng tham số: không có slot trùng, trả về đúng ngần ấy slot. */
    @Test
    void generateIsIdempotent() {
        operatingDays(0, "07:00", "11:00");
        GenerateSlotsRequest request =
                generate(LocalDate.of(2026, 9, 28), LocalDate.of(2026, 10, 4));

        service.generateSlots(USER_ID, request);
        List<SlotResource> again = service.generateSlots(USER_ID, request);

        assertThat(table).hasSize(4);
        assertThat(again).hasSize(4);
    }

    @Test
    void generateRejectsRangeLongerThanSixtyDays() {
        operatingDays(0, "07:00", "11:00");

        assertThatThrownBy(
                        () ->
                                service.generateSlots(
                                        USER_ID, generate(TODAY.plusDays(1), TODAY.plusDays(91))))
                .isInstanceOf(IllegalArgumentException.class);
        verify(slotRepository, never()).saveAll(any());
    }

    @Test
    void generateRejectsPastFromDate() {
        operatingDays(0, "07:00", "11:00");

        assertThatThrownBy(
                        () -> service.generateSlots(USER_ID, generate(TODAY.minusDays(1), TODAY)))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("past");
        verify(slotRepository, never()).saveAll(any());
    }

    /** R-06: farmerMarketId có thật nhưng của stall khác → 403, không sinh gì. */
    @Test
    void generateOnAnotherFarmersMarketIs403() {
        when(farmerMarketRepository.findById(FARMER_MARKET_ID))
                .thenReturn(Optional.of(link(99L, true)));

        assertThatThrownBy(
                        () ->
                                service.generateSlots(
                                        USER_ID, generate(TODAY.plusDays(1), TODAY.plusDays(7))))
                .isInstanceOf(FarmerMarketNotYoursException.class);
        verify(slotRepository, never()).saveAll(any());
    }

    /** Đã rời chợ (fm.is_active = FALSE) thì slot sinh ra không ai thấy — từ chối ngay. */
    @Test
    void generateRejectsAMarketTheStallHasLeft() {
        when(farmerMarketRepository.findById(FARMER_MARKET_ID))
                .thenReturn(Optional.of(link(FARMER_ID, false)));

        assertThatThrownBy(
                        () ->
                                service.generateSlots(
                                        USER_ID, generate(TODAY.plusDays(1), TODAY.plusDays(7))))
                .isInstanceOf(IllegalArgumentException.class);
        verify(slotRepository, never()).saveAll(any());
    }

    /** Khung giờ sát nửa đêm: cộng phút không được vòng về 00:00 rồi chạy mãi. Khung lẻ bị bỏ. */
    @Test
    void windowsNeverWrapPastMidnightAndDropTheOddTail() {
        assertThat(SlotService.windows(LocalTime.of(23, 0), LocalTime.of(23, 59), 60)).isEmpty();
        assertThat(SlotService.windows(LocalTime.of(7, 0), LocalTime.of(11, 30), 60)).hasSize(4);
    }

    /** D-06: đã có 3 đơn thì không hạ sức chứa xuống 2 — 409, không phá đơn đã có. */
    @Test
    void updateSlotRejectsMaxOrdersBelowBookedCount() {
        PickupSlot booked = slot(5, 3, true);
        when(slotRepository.lockById(900L)).thenReturn(Optional.of(booked));

        assertThatThrownBy(() -> service.updateSlot(USER_ID, 900L, new UpdateSlotRequest(2, null)))
                .isInstanceOf(SlotBelowBookedException.class);
        assertThat(booked.getMaxOrders()).isEqualTo(5);
        verify(slotRepository, never()).save(any());
    }

    /** R-06: slot của stall khác → 403, dù id có thật. */
    @Test
    void updateSlotOfAnotherFarmerIs403() {
        when(slotRepository.lockById(900L)).thenReturn(Optional.of(slot(5, 0, true)));
        when(farmerMarketRepository.findById(FARMER_MARKET_ID))
                .thenReturn(Optional.of(link(99L, true)));

        assertThatThrownBy(() -> service.updateSlot(USER_ID, 900L, new UpdateSlotRequest(3, false)))
                .isInstanceOf(SlotNotYoursException.class);
        verify(slotRepository, never()).save(any());
    }

    @Test
    void updateSlotTurnsASlotOffAndChangesCapacity() {
        PickupSlot s = slot(5, 1, true);
        when(slotRepository.lockById(900L)).thenReturn(Optional.of(s));
        when(slotRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        SlotResource out = service.updateSlot(USER_ID, 900L, new UpdateSlotRequest(3, false));

        assertThat(out.maxOrders()).isEqualTo(3);
        assertThat(out.isActive()).isFalse();
        assertThat(out.marketId()).isEqualTo(MARKET_ID);
    }

    /**
     * Slot đầy → isFull; slot đã tắt không lọt ra ngoài. Câu SQL là hằng số nên đọc thẳng, không
     * cần database (test tích hợp SlotQueryRepositoryTest chạy nó trên MySQL thật).
     */
    @Test
    void publicSlotsMarksFullSlots() {
        assertThat(SlotResource.of(slot(5, 5, true), MARKET_ID).isFull()).isTrue();
        assertThat(SlotResource.of(slot(5, 4, true), MARKET_ID).isFull()).isFalse();
        assertThat(SlotQueryRepository.PUBLIC_SLOTS).contains("s.is_active = TRUE");
        when(farmerProfileRepository.findById(FARMER_ID))
                .thenReturn(Optional.of(stall(ApprovalStatus.APPROVED)));
        SlotResource full = SlotResource.of(slot(5, 5, true), MARKET_ID);
        when(queryRepository.publicSlots(FARMER_ID, MARKET_ID, TODAY, TODAY))
                .thenReturn(List.of(full));

        assertThat(service.publicSlots(FARMER_ID, MARKET_ID, TODAY)).containsExactly(full);
    }

    /**
     * Không truyền ngày → từ hôm nay tới hết 14 ngày, để giỏ hàng dựng được danh sách ngày nhận.
     */
    @Test
    void publicSlotsWithoutDateCoverTheNextTwoWeeks() {
        when(farmerProfileRepository.findById(FARMER_ID))
                .thenReturn(Optional.of(stall(ApprovalStatus.APPROVED)));

        service.publicSlots(FARMER_ID, null, null);

        verify(queryRepository).publicSlots(FARMER_ID, null, TODAY, TODAY.plusDays(13));
    }

    /** D-09: stall chưa duyệt / bị đình chỉ không có slot với khách — 404 như trang stall. */
    @Test
    void publicSlotsOfASuspendedStallIs404() {
        when(farmerProfileRepository.findById(FARMER_ID))
                .thenReturn(Optional.of(stall(ApprovalStatus.SUSPENDED)));

        assertThatThrownBy(() -> service.publicSlots(FARMER_ID, null, TODAY))
                .isInstanceOf(FarmerProfileNotFoundException.class);
        verify(queryRepository, never()).publicSlots(anyLong(), any(), any(), any());
    }
}

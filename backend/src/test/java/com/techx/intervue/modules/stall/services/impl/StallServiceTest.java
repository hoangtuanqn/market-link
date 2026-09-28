package com.techx.intervue.modules.stall.services.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.techx.intervue.modules.farmer.entities.FarmerProfile;
import com.techx.intervue.modules.farmer.enums.ApprovalStatus;
import com.techx.intervue.modules.farmer.exceptions.FarmerProfileNotFoundException;
import com.techx.intervue.modules.farmer.repositories.FarmerProfileRepository;
import com.techx.intervue.modules.stall.entities.FarmerMarket;
import com.techx.intervue.modules.stall.exceptions.MarketAlreadyJoinedException;
import com.techx.intervue.modules.stall.exceptions.StallNotApprovedException;
import com.techx.intervue.modules.stall.repositories.FarmerMarketRepository;
import com.techx.intervue.modules.stall.repositories.FarmerOperatingDayRepository;
import com.techx.intervue.modules.stall.repositories.StallQueryRepository;
import com.techx.intervue.modules.stall.requests.JoinMarketRequest;
import com.techx.intervue.modules.stall.requests.OperatingDaysRequest;
import com.techx.intervue.modules.stall.requests.StallProfileRequest;
import com.techx.intervue.modules.stall.requests.UpdateStallMarketRequest;
import com.techx.intervue.modules.stall.resources.StallDetailResource;
import com.techx.intervue.modules.stall.resources.StallMarketResource;
import com.techx.intervue.resources.PageResource;
import java.math.BigDecimal;
import java.time.LocalTime;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

class StallServiceTest {

    private static final long USER_ID = 1L;
    private static final long FARMER_ID = 10L;
    private static final long MARKET_ID = 2L;
    private static final long FARMER_MARKET_ID = 55L;

    private FarmerProfileRepository farmerProfileRepository;
    private FarmerMarketRepository farmerMarketRepository;
    private FarmerOperatingDayRepository operatingDayRepository;
    private StallQueryRepository queryRepository;
    private StallService service;

    @BeforeEach
    void setUp() {
        farmerProfileRepository = mock(FarmerProfileRepository.class);
        farmerMarketRepository = mock(FarmerMarketRepository.class);
        operatingDayRepository = mock(FarmerOperatingDayRepository.class);
        queryRepository = mock(StallQueryRepository.class);
        service =
                new StallService(
                        farmerProfileRepository,
                        farmerMarketRepository,
                        operatingDayRepository,
                        queryRepository);
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

    private static FarmerMarket ownStall() {
        FarmerMarket fm = new FarmerMarket();
        fm.setId(FARMER_MARKET_ID);
        fm.setFarmerId(FARMER_ID);
        fm.setMarketId(MARKET_ID);
        fm.setActive(true);
        return fm;
    }

    private static StallProfileRequest profile(int cutoffHours) {
        return new StallProfileRequest("Vườn Út Hiền", "Lê Thị Út Hiền", null, null, cutoffHours);
    }

    /**
     * D-09: only approved stalls show to customers. The SQL statement is a constant so read it
     * directly, needing no database.
     */
    @Test
    void searchReturnsOnlyApprovedStalls() {
        assertThat(StallQueryRepository.SEARCH_STALLS).contains("f.approval_status = 'approved'");
        when(queryRepository.search(any(), any(), any(), anyInt(), anyInt()))
                .thenReturn(new PageResource<>(List.of(), 1, 12, 0));

        service.search(null, null, null, 0, 12);

        verify(queryRepository).search(null, null, null, 0, 12);
    }

    /** D-09: customers no longer see a suspended stall — 404, not 403 (no reason revealed). */
    @Test
    void publicDetailHidesSuspendedStall() {
        when(farmerProfileRepository.findById(FARMER_ID))
                .thenReturn(Optional.of(stall(ApprovalStatus.SUSPENDED)));

        assertThatThrownBy(() -> service.publicDetail(FARMER_ID))
                .isInstanceOf(FarmerProfileNotFoundException.class);
    }

    @Test
    void myProfileWorksWhilePending() {
        when(farmerProfileRepository.findByUserId(USER_ID))
                .thenReturn(Optional.of(stall(ApprovalStatus.PENDING)));
        when(queryRepository.marketsOf(FARMER_ID)).thenReturn(List.of());

        StallDetailResource me = service.myProfile(USER_ID);

        assertThat(me.stallName()).isEqualTo("Vườn Út Hiền");
        assertThat(me.markets()).isEmpty();
    }

    @Test
    void updateProfileRejectsCutoffHoursOutsideOneToSeventyTwo() {
        when(farmerProfileRepository.findByUserId(USER_ID))
                .thenReturn(Optional.of(stall(ApprovalStatus.APPROVED)));

        assertThatThrownBy(() -> service.updateProfile(USER_ID, profile(0)))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> service.updateProfile(USER_ID, profile(100)))
                .isInstanceOf(IllegalArgumentException.class);
        verify(farmerProfileRepository, never()).save(any());
    }

    /**
     * R-06: the profile is looked up by the userId taken from the token; there is no path to pass
     * another person's farmerId in.
     */
    @Test
    void updateProfileOnAnotherUsersStallIsImpossible() {
        when(farmerProfileRepository.findByUserId(USER_ID)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.updateProfile(USER_ID, profile(12)))
                .isInstanceOf(FarmerProfileNotFoundException.class);
    }

    @Test
    void joinMarketRejectsStallNotApproved() {
        when(farmerProfileRepository.findByUserId(USER_ID))
                .thenReturn(Optional.of(stall(ApprovalStatus.PENDING)));

        assertThatThrownBy(
                        () ->
                                service.joinMarket(
                                        USER_ID,
                                        new JoinMarketRequest(MARKET_ID, "A-12", null, null)))
                .isInstanceOf(StallNotApprovedException.class)
                .hasMessageContaining("pending admin approval");
        verify(farmerMarketRepository, never()).save(any());
    }

    private static StallQueryRepository.MarketSchedule sampleSchedule() {
        return new StallQueryRepository.MarketSchedule(
                true,
                LocalTime.of(6, 0),
                LocalTime.of(18, 0),
                Set.of(0, 1, 2, 3, 4, 5, 6),
                new BigDecimal("10.80290000"),
                new BigDecimal("106.69920000"));
    }

    @Test
    void joinMarketRejectsDuplicateMarket() {
        when(farmerProfileRepository.findByUserId(USER_ID))
                .thenReturn(Optional.of(stall(ApprovalStatus.APPROVED)));
        when(queryRepository.findMarketSchedule(MARKET_ID))
                .thenReturn(Optional.of(sampleSchedule()));
        when(farmerMarketRepository.findByFarmerIdAndMarketId(FARMER_ID, MARKET_ID))
                .thenReturn(Optional.of(ownStall()));

        assertThatThrownBy(
                        () ->
                                service.joinMarket(
                                        USER_ID,
                                        new JoinMarketRequest(
                                                MARKET_ID,
                                                "A-12",
                                                new BigDecimal("10.80290000"),
                                                new BigDecimal("106.69920000"))))
                .isInstanceOf(MarketAlreadyJoinedException.class);
        verify(farmerMarketRepository, never()).save(any());
    }

    @Test
    void joinMarketRejectsUnpairedCoordinates() {
        when(farmerProfileRepository.findByUserId(USER_ID))
                .thenReturn(Optional.of(stall(ApprovalStatus.APPROVED)));

        assertThatThrownBy(
                        () ->
                                service.joinMarket(
                                        USER_ID,
                                        new JoinMarketRequest(
                                                MARKET_ID,
                                                "A-12",
                                                new BigDecimal("10.80290000"),
                                                null)))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("together");
        verify(farmerMarketRepository, never()).save(any());
    }

    @Test
    void joinMarketDefaultsCoordinatesToMarketCenterWhenNull() {
        when(farmerProfileRepository.findByUserId(USER_ID))
                .thenReturn(Optional.of(stall(ApprovalStatus.APPROVED)));
        when(queryRepository.findMarketSchedule(MARKET_ID))
                .thenReturn(Optional.of(sampleSchedule()));
        when(farmerMarketRepository.findByFarmerIdAndMarketId(FARMER_ID, MARKET_ID))
                .thenReturn(Optional.empty());
        when(farmerMarketRepository.save(any()))
                .thenAnswer(
                        invocation -> {
                            FarmerMarket fm = invocation.getArgument(0);
                            fm.setId(FARMER_MARKET_ID);
                            return fm;
                        });
        when(queryRepository.stallMarket(FARMER_MARKET_ID))
                .thenReturn(
                        Optional.of(
                                new StallMarketResource(
                                        FARMER_MARKET_ID,
                                        MARKET_ID,
                                        "Chợ Bà Chiểu",
                                        "A-12",
                                        new BigDecimal("10.80290000"),
                                        new BigDecimal("106.69920000"),
                                        List.of())));

        StallMarketResource res =
                service.joinMarket(USER_ID, new JoinMarketRequest(MARKET_ID, "A-12", null, null));

        assertThat(res).isNotNull();
        ArgumentCaptor<FarmerMarket> captor = ArgumentCaptor.forClass(FarmerMarket.class);
        verify(farmerMarketRepository).save(captor.capture());
        assertThat(captor.getValue().getStallLatitude()).isEqualTo(new BigDecimal("10.80290000"));
        assertThat(captor.getValue().getStallLongitude()).isEqualTo(new BigDecimal("106.69920000"));
    }

    @Test
    void updateMarketUpdatesStallCodeAndLocation() {
        when(farmerProfileRepository.findByUserId(USER_ID))
                .thenReturn(Optional.of(stall(ApprovalStatus.APPROVED)));
        when(farmerMarketRepository.findById(FARMER_MARKET_ID)).thenReturn(Optional.of(ownStall()));
        when(farmerMarketRepository.save(any())).thenAnswer(i -> i.getArgument(0));
        when(queryRepository.stallMarket(FARMER_MARKET_ID))
                .thenReturn(
                        Optional.of(
                                new StallMarketResource(
                                        FARMER_MARKET_ID,
                                        MARKET_ID,
                                        "Chợ Bà Chiểu",
                                        "B-99",
                                        new BigDecimal("10.80500000"),
                                        new BigDecimal("106.70000000"),
                                        List.of())));

        StallMarketResource updated =
                service.updateMarket(
                        USER_ID,
                        FARMER_MARKET_ID,
                        new UpdateStallMarketRequest(
                                "B-99",
                                new BigDecimal("10.80500000"),
                                new BigDecimal("106.70000000")));

        assertThat(updated).isNotNull();
        ArgumentCaptor<FarmerMarket> captor = ArgumentCaptor.forClass(FarmerMarket.class);
        verify(farmerMarketRepository).save(captor.capture());
        assertThat(captor.getValue().getStallCode()).isEqualTo("B-99");
        assertThat(captor.getValue().getStallLatitude()).isEqualTo(new BigDecimal("10.80500000"));
        assertThat(captor.getValue().getStallLongitude()).isEqualTo(new BigDecimal("106.70000000"));
    }

    @Test
    void updateMarketRejectsInactiveMarketLink() {
        FarmerMarket inactive = ownStall();
        inactive.setActive(false);
        when(farmerProfileRepository.findByUserId(USER_ID))
                .thenReturn(Optional.of(stall(ApprovalStatus.APPROVED)));
        when(farmerMarketRepository.findById(FARMER_MARKET_ID)).thenReturn(Optional.of(inactive));

        assertThatThrownBy(
                        () ->
                                service.updateMarket(
                                        USER_ID,
                                        FARMER_MARKET_ID,
                                        new UpdateStallMarketRequest("B-99", null, null)))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("no longer sell");
        verify(farmerMarketRepository, never()).save(any());
    }

    @Test
    void updateMarketRejectsUnpairedCoordinates() {
        when(farmerProfileRepository.findByUserId(USER_ID))
                .thenReturn(Optional.of(stall(ApprovalStatus.APPROVED)));
        when(farmerMarketRepository.findById(FARMER_MARKET_ID)).thenReturn(Optional.of(ownStall()));

        assertThatThrownBy(
                        () ->
                                service.updateMarket(
                                        USER_ID,
                                        FARMER_MARKET_ID,
                                        new UpdateStallMarketRequest(
                                                "B-99", new BigDecimal("10.80500000"), null)))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("together");
        verify(farmerMarketRepository, never()).save(any());
    }

    @Test
    void setDaysRejectsInactiveMarketLink() {
        FarmerMarket inactive = ownStall();
        inactive.setActive(false);
        when(farmerProfileRepository.findByUserId(USER_ID))
                .thenReturn(Optional.of(stall(ApprovalStatus.APPROVED)));
        when(farmerMarketRepository.findById(FARMER_MARKET_ID)).thenReturn(Optional.of(inactive));

        OperatingDaysRequest req =
                new OperatingDaysRequest(
                        List.of(new OperatingDaysRequest.Day(6, "07:00", "11:00")));

        assertThatThrownBy(() -> service.setDays(USER_ID, FARMER_MARKET_ID, req))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("no longer sell");
        verify(operatingDayRepository, never()).replaceDays(anyLong(), any());
    }

    @Test
    void setDaysRejectsEmptyDays() {
        when(farmerProfileRepository.findByUserId(USER_ID))
                .thenReturn(Optional.of(stall(ApprovalStatus.APPROVED)));
        when(farmerMarketRepository.findById(FARMER_MARKET_ID)).thenReturn(Optional.of(ownStall()));

        OperatingDaysRequest empty = new OperatingDaysRequest(List.of());

        assertThatThrownBy(() -> service.setDays(USER_ID, FARMER_MARKET_ID, empty))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("At least one operating day");
        verify(operatingDayRepository, never()).replaceDays(anyLong(), any());
    }

    @Test
    void setDaysRejectsDayWhenMarketClosed() {
        when(farmerProfileRepository.findByUserId(USER_ID))
                .thenReturn(Optional.of(stall(ApprovalStatus.APPROVED)));
        when(farmerMarketRepository.findById(FARMER_MARKET_ID)).thenReturn(Optional.of(ownStall()));
        // Market only held on Saturday (6) and Sunday (0)
        when(queryRepository.findMarketSchedule(MARKET_ID))
                .thenReturn(
                        Optional.of(
                                new StallQueryRepository.MarketSchedule(
                                        true,
                                        LocalTime.of(6, 0),
                                        LocalTime.of(18, 0),
                                        Set.of(0, 6),
                                        new BigDecimal("10.80"),
                                        new BigDecimal("106.70"))));

        OperatingDaysRequest wednesday =
                new OperatingDaysRequest(
                        List.of(new OperatingDaysRequest.Day(3, "07:00", "11:00")));

        assertThatThrownBy(() -> service.setDays(USER_ID, FARMER_MARKET_ID, wednesday))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Market is not held on weekday 3");
        verify(operatingDayRepository, never()).replaceDays(anyLong(), any());
    }

    @Test
    void setDaysRejectsPickupWindowOutsideMarketHours() {
        when(farmerProfileRepository.findByUserId(USER_ID))
                .thenReturn(Optional.of(stall(ApprovalStatus.APPROVED)));
        when(farmerMarketRepository.findById(FARMER_MARKET_ID)).thenReturn(Optional.of(ownStall()));
        when(queryRepository.findMarketSchedule(MARKET_ID))
                .thenReturn(
                        Optional.of(
                                new StallQueryRepository.MarketSchedule(
                                        true,
                                        LocalTime.of(7, 0),
                                        LocalTime.of(12, 0),
                                        Set.of(6),
                                        new BigDecimal("10.80"),
                                        new BigDecimal("106.70"))));

        // Starts before market opens (06:00 < 07:00)
        OperatingDaysRequest tooEarly =
                new OperatingDaysRequest(
                        List.of(new OperatingDaysRequest.Day(6, "06:00", "11:00")));
        assertThatThrownBy(() -> service.setDays(USER_ID, FARMER_MARKET_ID, tooEarly))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("within market operating hours");

        // Ends after market closes (13:00 > 12:00)
        OperatingDaysRequest tooLate =
                new OperatingDaysRequest(
                        List.of(new OperatingDaysRequest.Day(6, "08:00", "13:00")));
        assertThatThrownBy(() -> service.setDays(USER_ID, FARMER_MARKET_ID, tooLate))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("within market operating hours");

        verify(operatingDayRepository, never()).replaceDays(anyLong(), any());
    }

    @Test
    void setDaysRejectsPickupEndBeforeStart() {
        when(farmerProfileRepository.findByUserId(USER_ID))
                .thenReturn(Optional.of(stall(ApprovalStatus.APPROVED)));
        when(farmerMarketRepository.findById(FARMER_MARKET_ID)).thenReturn(Optional.of(ownStall()));
        when(queryRepository.findMarketSchedule(MARKET_ID))
                .thenReturn(Optional.of(sampleSchedule()));
        OperatingDaysRequest bad =
                new OperatingDaysRequest(
                        List.of(new OperatingDaysRequest.Day(6, "08:00", "07:00")));

        assertThatThrownBy(() -> service.setDays(USER_ID, FARMER_MARKET_ID, bad))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("pickup");
        verify(operatingDayRepository, never()).replaceDays(anyLong(), any());
    }

    /** Overwrite the whole set: sending [Sat] when [Sun, Sat] exists makes Sunday disappear. */
    @Test
    void setDaysReplacesTheWholeSet() {
        when(farmerProfileRepository.findByUserId(USER_ID))
                .thenReturn(Optional.of(stall(ApprovalStatus.APPROVED)));
        when(farmerMarketRepository.findById(FARMER_MARKET_ID)).thenReturn(Optional.of(ownStall()));
        when(queryRepository.findMarketSchedule(MARKET_ID))
                .thenReturn(Optional.of(sampleSchedule()));
        when(queryRepository.stallMarket(FARMER_MARKET_ID))
                .thenReturn(
                        Optional.of(
                                new StallMarketResource(
                                        FARMER_MARKET_ID,
                                        MARKET_ID,
                                        "Chợ Bà Chiểu",
                                        "A-12",
                                        new BigDecimal("10.80290000"),
                                        new BigDecimal("106.69920000"),
                                        List.of())));
        OperatingDaysRequest saturdayOnly =
                new OperatingDaysRequest(
                        List.of(new OperatingDaysRequest.Day(6, "07:00", "11:00")));

        assertThatCode(() -> service.setDays(USER_ID, FARMER_MARKET_ID, saturdayOnly))
                .doesNotThrowAnyException();

        @SuppressWarnings("unchecked")
        ArgumentCaptor<List<OperatingDaysRequest.Day>> captor = ArgumentCaptor.forClass(List.class);
        verify(operatingDayRepository, times(1))
                .replaceDays(eq(FARMER_MARKET_ID), captor.capture());
        assertThat(captor.getValue())
                .extracting(OperatingDaysRequest.Day::dayOfWeek)
                .containsExactly(6);
    }
}

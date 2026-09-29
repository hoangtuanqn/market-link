package com.techx.intervue.modules.quality.services.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.techx.intervue.modules.farmer.entities.FarmerProfile;
import com.techx.intervue.modules.farmer.enums.ApprovalStatus;
import com.techx.intervue.modules.farmer.repositories.FarmerProfileRepository;
import com.techx.intervue.modules.notification.enums.NotificationKind;
import com.techx.intervue.modules.notification.services.interfaces.NotificationServiceInterface;
import com.techx.intervue.modules.order.entities.Order;
import com.techx.intervue.modules.order.entities.OrderItem;
import com.techx.intervue.modules.order.enums.OrderStatus;
import com.techx.intervue.modules.order.exceptions.OrderNotYoursException;
import com.techx.intervue.modules.order.repositories.OrderItemRepository;
import com.techx.intervue.modules.order.repositories.OrderRepository;
import com.techx.intervue.modules.order.resources.ItemQualityReportResource;
import com.techx.intervue.modules.quality.entities.QualityReport;
import com.techx.intervue.modules.quality.enums.QualityProblem;
import com.techx.intervue.modules.quality.enums.QualityReportStatus;
import com.techx.intervue.modules.quality.exceptions.ItemAlreadyReportedException;
import com.techx.intervue.modules.quality.exceptions.ReportNeedsCompletedOrderException;
import com.techx.intervue.modules.quality.exceptions.ReportWindowClosedException;
import com.techx.intervue.modules.quality.exceptions.ReportedItemNotFoundException;
import com.techx.intervue.modules.quality.repositories.QualityReportRepository;
import com.techx.intervue.modules.quality.requests.CreateQualityReportRequest;
import com.techx.intervue.modules.user.exceptions.InvalidFieldException;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

class CustomerQualityReportServiceTest {

    private static final long CUSTOMER = 1L;
    private static final long STALL_OWNER = 30L;
    private static final long FARMER_ID = 10L;
    private static final long ORDER_ID = 21L;
    private static final long ITEM_ID = 501L;

    private static final Clock CLOCK =
            Clock.fixed(Instant.parse("2026-10-06T03:00:00Z"), ZoneId.of("Asia/Ho_Chi_Minh"));

    private OrderRepository orders;
    private OrderItemRepository orderItems;
    private QualityReportRepository reports;
    private FarmerProfileRepository farmers;
    private QualityReportPhotoService photos;
    private NotificationServiceInterface notifications;
    private CustomerQualityReportService service;
    private Order order;
    private OrderItem line;

    @BeforeEach
    void setUp() {
        orders = mock(OrderRepository.class);
        orderItems = mock(OrderItemRepository.class);
        reports = mock(QualityReportRepository.class);
        farmers = mock(FarmerProfileRepository.class);
        photos = mock(QualityReportPhotoService.class);
        notifications = mock(NotificationServiceInterface.class);
        service =
                new CustomerQualityReportService(
                        orders, orderItems, reports, farmers, photos, notifications, CLOCK);

        order = new Order();
        order.setId(ORDER_ID);
        order.setOrderCode("ML-20260920-0007");
        order.setCustomerId(CUSTOMER);
        order.setFarmerId(FARMER_ID);
        order.setStatus(OrderStatus.COMPLETED);
        order.setPickupDate(LocalDate.of(2026, 10, 3));
        line = new OrderItem();
        line.setId(ITEM_ID);
        line.setOrderId(ORDER_ID);
        line.setProductId(3L);
        line.setProductName("Rau muống");
        line.setBestBefore(LocalDate.of(2026, 10, 7));
        line.setShelfLifeExtended(true);
        line.setExtendedByDays(2);

        when(orders.findById(ORDER_ID)).thenReturn(Optional.of(order));
        when(orderItems.findById(ITEM_ID)).thenReturn(Optional.of(line));
        when(farmers.findById(FARMER_ID))
                .thenReturn(
                        Optional.of(
                                FarmerProfile.builder()
                                        .id(FARMER_ID)
                                        .userId(STALL_OWNER)
                                        .stallName("Vườn Út Hiền")
                                        .contactPerson("Hiền")
                                        .approvalStatus(ApprovalStatus.APPROVED)
                                        .build()));
        when(reports.save(any(QualityReport.class)))
                .thenAnswer(
                        i -> {
                            QualityReport r = i.getArgument(0);
                            r.setId(77L);
                            return r;
                        });
        when(photos.isOwnedBy(any(), anyLong())).thenReturn(true);
    }

    private static CreateQualityReportRequest spoiledOn(LocalDate day) {
        return new CreateQualityReportRequest(day, QualityProblem.MOLD, "  Lá úng đen  ", null);
    }

    private QualityReport saved() {
        ArgumentCaptor<QualityReport> captor = ArgumentCaptor.forClass(QualityReport.class);
        verify(reports).save(captor.capture());
        return captor.getValue();
    }

    @Test
    void aCustomerReportsASpoiledLineAndTheStallIsTold() {
        ItemQualityReportResource result =
                service.report(CUSTOMER, ORDER_ID, ITEM_ID, spoiledOn(LocalDate.of(2026, 10, 5)));

        QualityReport r = saved();
        assertThat(r.getOrderItemId()).isEqualTo(ITEM_ID);
        assertThat(r.getOrderId()).isEqualTo(ORDER_ID);
        assertThat(r.getCustomerId()).isEqualTo(CUSTOMER);
        assertThat(r.getFarmerId()).isEqualTo(FARMER_ID);
        assertThat(r.getProductId()).isEqualTo(3L);
        assertThat(r.getNote()).isEqualTo("Lá úng đen");
        assertThat(r.getPhotoUrl()).isNull();
        assertThat(r.isBeforePromise()).isTrue();
        assertThat(r.getStatus()).isEqualTo(QualityReportStatus.OPEN);
        assertThat(r.getCreatedAt()).isEqualTo(Instant.parse("2026-10-06T03:00:00Z"));
        assertThat(result)
                .isEqualTo(new ItemQualityReportResource(77L, "open", "2026-10-05", "mold"));
        verify(notifications)
                .dispatch(
                        eq(List.of(STALL_OWNER)),
                        argThat(
                                e ->
                                        e.kind() == NotificationKind.QUALITY_REPORTED
                                                && e.link().equals("/farmer/reviews?tab=spoiled")
                                                && e.params().get("product").equals("Rau muống")
                                                && e.params()
                                                        .get("order")
                                                        .equals("ML-20260920-0007")));
    }

    @Test
    void theReportCopiesThePromiseFromTheOrderLine() {
        service.report(CUSTOMER, ORDER_ID, ITEM_ID, spoiledOn(LocalDate.of(2026, 10, 5)));

        QualityReport r = saved();
        assertThat(r.isShelfLifeExtended()).isTrue();
        assertThat(r.getExtendedByDays()).isEqualTo(2);
    }

    @Test
    void anExtendedLineThatSpoiledEarlyReachesTheAdmins() {
        service.report(CUSTOMER, ORDER_ID, ITEM_ID, spoiledOn(LocalDate.of(2026, 10, 5)));

        verify(notifications)
                .notifyAdmins(
                        argThat(
                                e ->
                                        e.kind() == NotificationKind.QUALITY_ESCALATED
                                                && e.link().equals("/admin/moderation?tab=quality")
                                                && e.params().get("stall").equals("Vườn Út Hiền")
                                                && e.params().get("product").equals("Rau muống")
                                                && e.params().get("days").equals("2")));
    }

    @Test
    void aLineWithinItsSuggestionDoesNotReachTheAdmins() {
        line.setShelfLifeExtended(false);
        line.setExtendedByDays(0);

        service.report(CUSTOMER, ORDER_ID, ITEM_ID, spoiledOn(LocalDate.of(2026, 10, 5)));

        saved();
        verify(notifications, never()).notifyAdmins(any());
    }

    @Test
    void spoiledAfterItsDateDoesNotReachTheAdmins() {
        line.setBestBefore(LocalDate.of(2026, 10, 5));

        service.report(CUSTOMER, ORDER_ID, ITEM_ID, spoiledOn(LocalDate.of(2026, 10, 6)));

        assertThat(saved().isBeforePromise()).isFalse();
        verify(notifications, never()).notifyAdmins(any());
    }

    @Test
    void someoneElsesOrderIs403() {
        order.setStatus(OrderStatus.READY);

        assertThatThrownBy(
                        () ->
                                service.report(
                                        2L,
                                        ORDER_ID,
                                        ITEM_ID,
                                        spoiledOn(LocalDate.of(2026, 10, 5))))
                .isInstanceOf(OrderNotYoursException.class);
        verify(reports, never()).save(any());
    }

    @Test
    void aLineOfAnotherOrderIs404() {
        line.setOrderId(99L);

        assertThatThrownBy(
                        () ->
                                service.report(
                                        CUSTOMER,
                                        ORDER_ID,
                                        ITEM_ID,
                                        spoiledOn(LocalDate.of(2026, 10, 5))))
                .isInstanceOf(ReportedItemNotFoundException.class);
    }

    @Test
    void anOrderThatIsNotCompletedIs409() {
        order.setStatus(OrderStatus.READY);

        assertThatThrownBy(
                        () ->
                                service.report(
                                        CUSTOMER,
                                        ORDER_ID,
                                        ITEM_ID,
                                        spoiledOn(LocalDate.of(2026, 10, 5))))
                .isInstanceOf(ReportNeedsCompletedOrderException.class);
    }

    @Test
    void aLineWithoutAGoodUntilDateCannotBeReported() {
        line.setBestBefore(null);

        assertThatThrownBy(
                        () ->
                                service.report(
                                        CUSTOMER,
                                        ORDER_ID,
                                        ITEM_ID,
                                        spoiledOn(LocalDate.of(2026, 10, 5))))
                .isInstanceOf(ReportWindowClosedException.class);
    }

    @Test
    void aSecondReportOnTheSameLineIsRefused() {
        when(reports.existsByOrderItemId(ITEM_ID)).thenReturn(true);

        assertThatThrownBy(
                        () ->
                                service.report(
                                        CUSTOMER,
                                        ORDER_ID,
                                        ITEM_ID,
                                        spoiledOn(LocalDate.of(2026, 10, 5))))
                .isInstanceOf(ItemAlreadyReportedException.class);
        verify(reports, never()).save(any());
    }

    @Test
    void theWindowClosesTwoDaysAfterTheGoodUntilDate() {
        line.setBestBefore(LocalDate.of(2026, 10, 4));
        assertThat(
                        service.report(
                                        CUSTOMER,
                                        ORDER_ID,
                                        ITEM_ID,
                                        spoiledOn(LocalDate.of(2026, 10, 4)))
                                .status())
                .isEqualTo("open");

        line.setBestBefore(LocalDate.of(2026, 10, 3));
        assertThatThrownBy(
                        () ->
                                service.report(
                                        CUSTOMER,
                                        ORDER_ID,
                                        ITEM_ID,
                                        spoiledOn(LocalDate.of(2026, 10, 4))))
                .isInstanceOf(ReportWindowClosedException.class)
                .hasMessageContaining("2026-10-05");
    }

    @Test
    void aSpoiledDayOutsidePickupToTodayIs400() {
        assertThatThrownBy(
                        () ->
                                service.report(
                                        CUSTOMER,
                                        ORDER_ID,
                                        ITEM_ID,
                                        spoiledOn(LocalDate.of(2026, 10, 2))))
                .isInstanceOf(InvalidFieldException.class)
                .extracting("field")
                .isEqualTo("spoiledOn");
        assertThatThrownBy(
                        () ->
                                service.report(
                                        CUSTOMER,
                                        ORDER_ID,
                                        ITEM_ID,
                                        spoiledOn(LocalDate.of(2026, 10, 7))))
                .isInstanceOf(InvalidFieldException.class)
                .extracting("field")
                .isEqualTo("spoiledOn");
    }

    @Test
    void somebodyElsesPhotoIs400() {
        String other = "/uploads/quality-report-photos/8-3f2a1b4c-5d6e-4f70-8a9b-0c1d2e3f4a5b.jpg";
        when(photos.isOwnedBy(other, CUSTOMER)).thenReturn(false);

        assertThatThrownBy(
                        () ->
                                service.report(
                                        CUSTOMER,
                                        ORDER_ID,
                                        ITEM_ID,
                                        new CreateQualityReportRequest(
                                                LocalDate.of(2026, 10, 5),
                                                QualityProblem.MOLD,
                                                null,
                                                other)))
                .isInstanceOf(InvalidFieldException.class)
                .extracting("field")
                .isEqualTo("photoUrl");
        verify(reports, never()).save(any());
    }

    @Test
    void theirOwnPhotoIsKeptAndABlankNoteIsDropped() {
        String own = "/uploads/quality-report-photos/1-3f2a1b4c-5d6e-4f70-8a9b-0c1d2e3f4a5b.jpg";

        service.report(
                CUSTOMER,
                ORDER_ID,
                ITEM_ID,
                new CreateQualityReportRequest(
                        LocalDate.of(2026, 10, 5), QualityProblem.SMELL, "   ", own));

        QualityReport r = saved();
        assertThat(r.getPhotoUrl()).isEqualTo(own);
        assertThat(r.getNote()).isNull();
        assertThat(r.getProblem()).isEqualTo(QualityProblem.SMELL);
    }
}

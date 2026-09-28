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
import com.techx.intervue.modules.order.repositories.OrderItemRepository;
import com.techx.intervue.modules.order.repositories.OrderRepository;
import com.techx.intervue.modules.product.entities.Product;
import com.techx.intervue.modules.product.repositories.ProductRepository;
import com.techx.intervue.modules.quality.entities.FarmerViolation;
import com.techx.intervue.modules.quality.entities.QualityReport;
import com.techx.intervue.modules.quality.enums.QualityReportStatus;
import com.techx.intervue.modules.quality.exceptions.QualityReportNotFoundException;
import com.techx.intervue.modules.quality.exceptions.ReportAlreadyDecidedException;
import com.techx.intervue.modules.quality.repositories.FarmerViolationRepository;
import com.techx.intervue.modules.quality.repositories.QualityReportQueryRepository;
import com.techx.intervue.modules.quality.repositories.QualityReportRepository;
import com.techx.intervue.modules.quality.resources.QualityReportResource;
import com.techx.intervue.modules.user.exceptions.InvalidFieldException;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

/** FR-123 (spec §4.4.3, §4.4.4): the admin's decision and what it does to the stall. */
class AdminQualityReportServiceTest {

    private static final long ADMIN = 99L;
    private static final long REPORT = 9L;
    private static final long CUSTOMER = 1L;
    private static final long FARMER_ID = 10L;
    private static final long STALL_OWNER = 30L;
    private static final long PRODUCT = 3L;
    private static final Clock CLOCK =
            Clock.fixed(Instant.parse("2026-10-06T03:00:00Z"), ZoneId.of("Asia/Ho_Chi_Minh"));
    private static final Instant NOW = Instant.parse("2026-10-06T03:00:00Z");

    /** CLOCK minus 90 days. */
    private static final Instant SINCE = Instant.parse("2026-07-08T03:00:00Z");

    private QualityReportRepository reports;
    private QualityReportQueryRepository queries;
    private FarmerViolationRepository violations;
    private ProductRepository products;
    private FarmerProfileRepository farmers;
    private OrderRepository orders;
    private OrderItemRepository orderItems;
    private NotificationServiceInterface notifications;
    private AdminQualityReportService service;
    private QualityReport report;
    private Product product;

    @BeforeEach
    void setUp() {
        reports = mock(QualityReportRepository.class);
        queries = mock(QualityReportQueryRepository.class);
        violations = mock(FarmerViolationRepository.class);
        products = mock(ProductRepository.class);
        farmers = mock(FarmerProfileRepository.class);
        orders = mock(OrderRepository.class);
        orderItems = mock(OrderItemRepository.class);
        notifications = mock(NotificationServiceInterface.class);
        service =
                new AdminQualityReportService(
                        reports,
                        queries,
                        violations,
                        products,
                        farmers,
                        orders,
                        orderItems,
                        notifications,
                        CLOCK);

        // Rau muống set to 5 days against a suggestion of 3, spoiled before its date
        report = new QualityReport();
        report.setId(REPORT);
        report.setOrderId(21L);
        report.setOrderItemId(501L);
        report.setCustomerId(CUSTOMER);
        report.setFarmerId(FARMER_ID);
        report.setProductId(PRODUCT);
        report.setShelfLifeExtended(true);
        report.setExtendedByDays(2);
        report.setBeforePromise(true);
        product = new Product();
        product.setId(PRODUCT);
        product.setName("Rau muống");
        product.setShelfLifeDays(5);
        product.setSuggestedShelfLifeDays(3);
        product.setShelfLifeExtended(true);
        product.setShelfLifeAckAt(LocalDateTime.of(2026, 9, 27, 10, 0));
        Order order = new Order();
        order.setId(21L);
        order.setOrderCode("ML-20260920-0007");
        OrderItem line = new OrderItem();
        line.setId(501L);
        line.setProductName("Rau muống");

        when(reports.lockById(REPORT)).thenReturn(Optional.of(report));
        when(products.lockAllById(List.of(PRODUCT))).thenReturn(List.of(product));
        when(violations.activeTimes(FARMER_ID, SINCE)).thenReturn(List.of());
        when(orders.findById(21L)).thenReturn(Optional.of(order));
        when(orderItems.findById(501L)).thenReturn(Optional.of(line));
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
        when(queries.findById(eq(REPORT), any())).thenReturn(Optional.of(row("confirmed")));
    }

    private static QualityReportResource row(String status) {
        return new QualityReportResource(
                REPORT,
                21L,
                "ML-20260920-0007",
                FARMER_ID,
                "Vườn Út Hiền",
                "approved",
                "Nguyễn Văn An",
                PRODUCT,
                "Rau muống",
                "2026-10-03",
                "2026-10-07",
                "chilled",
                "2026-10-05",
                true,
                "mold",
                null,
                null,
                true,
                2,
                status,
                null,
                null,
                null,
                NOW,
                Instant.parse("2026-10-05T13:00:00Z"),
                1);
    }

    /** Spec §4.4.3 steps 1–2: extended and spoiled early → a strike, back to the suggestion. */
    @Test
    void confirmingAnExtendedLineThatSpoiledEarlyRecordsAStrikeAndResetsTheProduct() {
        service.confirm(ADMIN, REPORT, "  Lá úng đen trước hạn  ");

        assertThat(report.getStatus()).isEqualTo(QualityReportStatus.CONFIRMED);
        assertThat(report.getDecidedBy()).isEqualTo(ADMIN);
        assertThat(report.getDecidedAt()).isEqualTo(NOW);
        assertThat(report.getDecisionNote()).isEqualTo("Lá úng đen trước hạn");
        ArgumentCaptor<FarmerViolation> strike = ArgumentCaptor.forClass(FarmerViolation.class);
        verify(violations).saveAndFlush(strike.capture());
        assertThat(strike.getValue().getFarmerId()).isEqualTo(FARMER_ID);
        assertThat(strike.getValue().getQualityReportId()).isEqualTo(REPORT);
        assertThat(strike.getValue().getProductId()).isEqualTo(PRODUCT);
        assertThat(strike.getValue().getExtendedByDays()).isEqualTo(2);
        assertThat(strike.getValue().getCreatedBy()).isEqualTo(ADMIN);
        assertThat(strike.getValue().getCreatedAt()).isEqualTo(NOW);
        assertThat(product.getShelfLifeDays()).isEqualTo(3);
        assertThat(product.isShelfLifeExtended()).isFalse();
        assertThat(product.getShelfLifeAckAt()).isNull();
        verify(notifications)
                .dispatch(
                        eq(List.of(STALL_OWNER)),
                        argThat(
                                e ->
                                        e.kind() == NotificationKind.SHELF_LIFE_VIOLATION
                                                && e.link().equals("/farmer/products/3/edit")
                                                && e.params().get("count").equals("1")));
        verify(notifications, never())
                .dispatch(any(), argThat(e -> e.kind() == NotificationKind.SHELF_LIFE_LOCKED));
    }

    /** Spec §4.4.3: a line within its suggestion only closes the report. */
    @Test
    void confirmingALineWithinItsSuggestionOnlyClosesTheReport() {
        report.setShelfLifeExtended(false);
        report.setExtendedByDays(0);

        service.confirm(ADMIN, REPORT, null);

        assertThat(report.getStatus()).isEqualTo(QualityReportStatus.CONFIRMED);
        verify(violations, never()).saveAndFlush(any());
        verify(products, never()).lockAllById(any());
    }

    @Test
    void spoiledAfterItsDateIsNotAStrike() {
        report.setBeforePromise(false);

        service.confirm(ADMIN, REPORT, null);

        verify(violations, never()).saveAndFlush(any());
    }

    /** Ruling 8: a stall that already went back down keeps its own number. */
    @Test
    void aProductNoLongerExtendedKeepsItsShelfLife() {
        product.setShelfLifeDays(2);
        product.setShelfLifeExtended(false);

        service.confirm(ADMIN, REPORT, null);

        assertThat(product.getShelfLifeDays()).isEqualTo(2);
        verify(products, never()).saveAndFlush(any());
    }

    /** Spec §4.4.3 step 3: the third strike in 90 days locks longer shelf lives. */
    @Test
    void theThirdStrikeLocksLongerShelfLivesAndSaysUntilWhen() {
        when(violations.activeTimes(FARMER_ID, SINCE))
                .thenReturn(
                        List.of(
                                Instant.parse("2026-10-01T03:00:00Z"),
                                Instant.parse("2026-09-10T03:00:00Z")));

        service.confirm(ADMIN, REPORT, null);

        verify(notifications)
                .dispatch(
                        eq(List.of(STALL_OWNER)),
                        argThat(
                                e ->
                                        e.kind() == NotificationKind.SHELF_LIFE_LOCKED
                                                && e.link().equals("/farmer")
                                                && e.params().get("until").equals("09/12/2026")));
    }

    @Test
    void theCustomerAndTheStallAreToldOfTheDecision() {
        service.confirm(ADMIN, REPORT, null);

        verify(notifications)
                .dispatch(
                        eq(List.of(CUSTOMER)),
                        argThat(
                                e ->
                                        e.kind() == NotificationKind.QUALITY_DECIDED
                                                && e.link().equals("/orders/21")
                                                && e.params().get("product").equals("Rau muống")
                                                && e.params()
                                                        .get("order")
                                                        .equals("ML-20260920-0007")));
        verify(notifications)
                .dispatch(
                        eq(List.of(STALL_OWNER)),
                        argThat(
                                e ->
                                        e.kind() == NotificationKind.QUALITY_DECIDED
                                                && e.link().equals("/farmer/reviews?tab=spoiled")));
    }

    /** Spec §4.4.3: "Not the stall's fault" needs a note. */
    @Test
    void dismissingNeedsANote() {
        assertThatThrownBy(() -> service.dismiss(ADMIN, REPORT, "   "))
                .isInstanceOf(InvalidFieldException.class)
                .extracting("field")
                .isEqualTo("note");
        verify(reports, never()).lockById(anyLong());
    }

    @Test
    void dismissingClosesTheReportWithoutAStrike() {
        service.dismiss(ADMIN, REPORT, "Khách để nhiệt độ thường.");

        assertThat(report.getStatus()).isEqualTo(QualityReportStatus.DISMISSED);
        assertThat(report.getDecisionNote()).isEqualTo("Khách để nhiệt độ thường.");
        verify(violations, never()).saveAndFlush(any());
        verify(notifications)
                .dispatch(
                        eq(List.of(CUSTOMER)),
                        argThat(e -> e.kind() == NotificationKind.QUALITY_DECIDED));
    }

    /** Review Focus #1: the second of two admins gets a 409 and records nothing. */
    @Test
    void aDecidedReportCannotBeDecidedAgain() {
        report.setStatus(QualityReportStatus.CONFIRMED);

        assertThatThrownBy(() -> service.confirm(ADMIN, REPORT, null))
                .isInstanceOf(ReportAlreadyDecidedException.class);
        assertThatThrownBy(() -> service.dismiss(ADMIN, REPORT, "x"))
                .isInstanceOf(ReportAlreadyDecidedException.class);
        verify(violations, never()).saveAndFlush(any());
    }

    @Test
    void aMissingReportIs404() {
        when(reports.lockById(REPORT)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.confirm(ADMIN, REPORT, null))
                .isInstanceOf(QualityReportNotFoundException.class);
    }

    /** Ruling 6: the queue filters are whitelisted; "decided" means confirmed or dismissed. */
    @Test
    void theQueueFiltersAreWhitelisted() {
        service.list("decided", null, 1, 20);
        verify(queries).forAdmin(null, true, null, SINCE, 0, 20);

        service.list(" OPEN ", true, 2, 10);
        verify(queries).forAdmin("open", false, true, SINCE, 10, 10);

        assertThatThrownBy(() -> service.list("nope", null, 1, 20))
                .isInstanceOf(InvalidFieldException.class)
                .extracting("field")
                .isEqualTo("status");
    }
}

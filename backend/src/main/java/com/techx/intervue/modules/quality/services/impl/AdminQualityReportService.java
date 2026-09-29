package com.techx.intervue.modules.quality.services.impl;

import com.techx.intervue.modules.farmer.repositories.FarmerProfileRepository;
import com.techx.intervue.modules.notification.enums.NotificationKind;
import com.techx.intervue.modules.notification.resources.NotificationEvent;
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
import com.techx.intervue.modules.quality.services.interfaces.AdminQualityReportServiceInterface;
import com.techx.intervue.modules.user.exceptions.InvalidFieldException;
import com.techx.intervue.resources.PageResource;
import java.time.Clock;
import java.time.Instant;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import lombok.AllArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@AllArgsConstructor
public class AdminQualityReportService implements AdminQualityReportServiceInterface {

    private static final int MAX_PAGE_SIZE = 50;
    private static final Set<String> STATUSES = Set.of("open", "confirmed", "dismissed");

    private static final DateTimeFormatter DAY = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    private final QualityReportRepository reports;
    private final QualityReportQueryRepository queries;
    private final FarmerViolationRepository violations;
    private final ProductRepository products;
    private final FarmerProfileRepository farmers;
    private final OrderRepository orders;
    private final OrderItemRepository orderItems;
    private final NotificationServiceInterface notifications;
    private final Clock clock;

    @Override
    @Transactional(readOnly = true)
    public PageResource<QualityReportResource> list(
            String status, Boolean escalated, int page, int pageSize) {
        String s =
                status == null || status.isBlank() ? null : status.trim().toLowerCase(Locale.ROOT);
        boolean decided = "decided".equals(s);
        if (s != null && !decided && !STATUSES.contains(s)) {
            throw new InvalidFieldException(
                    "status", "Status must be open, confirmed, dismissed or decided.");
        }
        int safePage = Math.max(1, page);
        int safeSize = Math.min(MAX_PAGE_SIZE, Math.max(1, pageSize));
        return queries.forAdmin(
                decided ? null : s,
                decided,
                escalated,
                SpoilagePolicy.strikeWindowStart(clock.instant()),
                (safePage - 1) * safeSize,
                safeSize);
    }

    @Override
    @Transactional
    public QualityReportResource confirm(long adminId, long reportId, String note) {
        QualityReport report = openReport(reportId);
        Instant now = clock.instant();
        report.decide(QualityReportStatus.CONFIRMED, adminId, blankToNull(note), now);
        reports.saveAndFlush(report);
        if (SpoilagePolicy.escalates(report.isShelfLifeExtended(), report.isBeforePromise())) {
            recordStrike(report, adminId, now);
        }
        tellCustomerAndStall(report);
        return reload(reportId, now);
    }

    @Override
    @Transactional
    public QualityReportResource dismiss(long adminId, long reportId, String note) {
        String reason = blankToNull(note);
        if (reason == null) {
            throw new InvalidFieldException("note", "Say why this is not the stall's fault.");
        }
        QualityReport report = openReport(reportId);
        Instant now = clock.instant();
        report.decide(QualityReportStatus.DISMISSED, adminId, reason, now);
        reports.saveAndFlush(report);
        tellCustomerAndStall(report);
        return reload(reportId, now);
    }

    private QualityReport openReport(long reportId) {
        QualityReport report =
                reports.lockById(reportId).orElseThrow(QualityReportNotFoundException::new);
        if (!report.isOpen()) {
            throw new ReportAlreadyDecidedException();
        }
        return report;
    }

    private void recordStrike(QualityReport report, long adminId, Instant now) {
        List<Instant> before =
                violations.activeTimes(report.getFarmerId(), SpoilagePolicy.strikeWindowStart(now));
        FarmerViolation strike = new FarmerViolation();
        strike.setFarmerId(report.getFarmerId());
        strike.setQualityReportId(report.getId());
        strike.setProductId(report.getProductId());
        strike.setExtendedByDays(report.getExtendedByDays());
        strike.setNote(report.getDecisionNote());
        strike.setCreatedBy(adminId);
        strike.setCreatedAt(now);
        violations.saveAndFlush(strike);

        Product product = resetShelfLife(report.getProductId());
        List<Instant> after = new ArrayList<>(before.size() + 1);
        after.add(now);
        after.addAll(before);
        Instant lockedUntil = SpoilagePolicy.lockedUntil(after);
        farmers.findById(report.getFarmerId())
                .ifPresent(
                        stall -> {
                            notifications.dispatch(
                                    List.of(stall.getUserId()),
                                    NotificationEvent.of(
                                            NotificationKind.SHELF_LIFE_VIOLATION,
                                            QualityLinks.farmerProduct(report.getProductId()),
                                            Map.of(
                                                    "product",
                                                    product == null ? "" : product.getName(),
                                                    "count",
                                                    String.valueOf(after.size()))));
                            if (lockedUntil != null) {
                                notifications.dispatch(
                                        List.of(stall.getUserId()),
                                        NotificationEvent.of(
                                                NotificationKind.SHELF_LIFE_LOCKED,
                                                QualityLinks.FARMER_HOME,
                                                Map.of(
                                                        "until",
                                                        DAY.format(
                                                                lockedUntil.atZone(
                                                                        clock.getZone())))));
                            }
                        });
    }

    private Product resetShelfLife(long productId) {
        Product product =
                products.lockAllById(List.of(productId)).stream().findFirst().orElse(null);
        if (product != null
                && product.isShelfLifeExtended()
                && product.getSuggestedShelfLifeDays() != null) {
            product.setShelfLifeDays(product.getSuggestedShelfLifeDays());
            product.setShelfLifeExtended(false);
            product.setShelfLifeAckAt(null);
            products.saveAndFlush(product);
        }
        return product;
    }

    private void tellCustomerAndStall(QualityReport report) {
        Map<String, String> params =
                Map.of(
                        "product",
                        orderItems
                                .findById(report.getOrderItemId())
                                .map(OrderItem::getProductName)
                                .orElse(""),
                        "order",
                        orders.findById(report.getOrderId()).map(Order::getOrderCode).orElse(""));
        notifications.dispatch(
                List.of(report.getCustomerId()),
                NotificationEvent.of(
                        NotificationKind.QUALITY_DECIDED,
                        QualityLinks.order(report.getOrderId()),
                        params));
        farmers.findById(report.getFarmerId())
                .ifPresent(
                        stall ->
                                notifications.dispatch(
                                        List.of(stall.getUserId()),
                                        NotificationEvent.of(
                                                NotificationKind.QUALITY_DECIDED,
                                                QualityLinks.FARMER_REPORTS,
                                                params)));
    }

    private QualityReportResource reload(long reportId, Instant now) {
        return queries.findById(reportId, SpoilagePolicy.strikeWindowStart(now))
                .orElseThrow(QualityReportNotFoundException::new);
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}

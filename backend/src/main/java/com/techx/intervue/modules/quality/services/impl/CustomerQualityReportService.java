package com.techx.intervue.modules.quality.services.impl;

import com.techx.intervue.modules.farmer.entities.FarmerProfile;
import com.techx.intervue.modules.farmer.repositories.FarmerProfileRepository;
import com.techx.intervue.modules.notification.enums.NotificationKind;
import com.techx.intervue.modules.notification.resources.NotificationEvent;
import com.techx.intervue.modules.notification.services.interfaces.NotificationServiceInterface;
import com.techx.intervue.modules.order.entities.Order;
import com.techx.intervue.modules.order.entities.OrderItem;
import com.techx.intervue.modules.order.enums.OrderStatus;
import com.techx.intervue.modules.order.exceptions.OrderNotFoundException;
import com.techx.intervue.modules.order.exceptions.OrderNotYoursException;
import com.techx.intervue.modules.order.repositories.OrderItemRepository;
import com.techx.intervue.modules.order.repositories.OrderRepository;
import com.techx.intervue.modules.order.resources.ItemQualityReportResource;
import com.techx.intervue.modules.quality.entities.QualityReport;
import com.techx.intervue.modules.quality.exceptions.ItemAlreadyReportedException;
import com.techx.intervue.modules.quality.exceptions.ReportNeedsCompletedOrderException;
import com.techx.intervue.modules.quality.exceptions.ReportWindowClosedException;
import com.techx.intervue.modules.quality.exceptions.ReportedItemNotFoundException;
import com.techx.intervue.modules.quality.repositories.QualityReportRepository;
import com.techx.intervue.modules.quality.requests.CreateQualityReportRequest;
import com.techx.intervue.modules.quality.services.interfaces.CustomerQualityReportServiceInterface;
import com.techx.intervue.modules.user.exceptions.InvalidFieldException;
import java.time.Clock;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import lombok.AllArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@AllArgsConstructor
public class CustomerQualityReportService implements CustomerQualityReportServiceInterface {

    private final OrderRepository orders;
    private final OrderItemRepository orderItems;
    private final QualityReportRepository reports;
    private final FarmerProfileRepository farmers;
    private final QualityReportPhotoService photos;
    private final NotificationServiceInterface notifications;
    private final Clock clock;

    @Override
    @Transactional
    public ItemQualityReportResource report(
            long userId, long orderId, long itemId, CreateQualityReportRequest request) {
        Order order =
                orders.findById(orderId).orElseThrow(() -> new OrderNotFoundException(orderId));
        if (!Objects.equals(order.getCustomerId(), userId)) {
            throw new OrderNotYoursException();
        }
        OrderItem line =
                orderItems
                        .findById(itemId)
                        .filter(i -> Objects.equals(i.getOrderId(), orderId))
                        .orElseThrow(ReportedItemNotFoundException::new);
        if (order.getStatus() != OrderStatus.COMPLETED) {
            throw new ReportNeedsCompletedOrderException();
        }
        LocalDate bestBefore = line.getBestBefore();
        if (bestBefore == null) {
            throw ReportWindowClosedException.noPromise();
        }
        if (reports.existsByOrderItemId(itemId)) {
            throw new ItemAlreadyReportedException();
        }
        LocalDate today = LocalDate.now(clock);
        if (!SpoilagePolicy.windowOpen(bestBefore, today)) {
            throw ReportWindowClosedException.closed(SpoilagePolicy.reportDeadline(bestBefore));
        }
        LocalDate spoiledOn = request.spoiledOn();
        if (spoiledOn.isBefore(order.getPickupDate()) || spoiledOn.isAfter(today)) {
            throw new InvalidFieldException("spoiledOn", "Pick a day between pickup and today.");
        }
        String photoUrl = blankToNull(request.photoUrl());
        if (photoUrl != null && !photos.isOwnedBy(photoUrl, userId)) {
            throw new InvalidFieldException("photoUrl", "Upload the photo again.");
        }

        QualityReport report = new QualityReport();
        report.setOrderItemId(line.getId());
        report.setOrderId(order.getId());
        report.setCustomerId(userId);
        report.setFarmerId(order.getFarmerId());
        report.setProductId(line.getProductId());
        report.setSpoiledOn(spoiledOn);
        report.setProblem(request.problem());
        report.setNote(blankToNull(request.note()));
        report.setPhotoUrl(photoUrl);
        report.setBeforePromise(SpoilagePolicy.beforePromise(spoiledOn, bestBefore));
        report.setShelfLifeExtended(line.isShelfLifeExtended());
        report.setExtendedByDays(line.getExtendedByDays());
        report.setCreatedAt(clock.instant());
        QualityReport saved = reports.save(report);

        tellStallAndAdmins(order, line, saved);
        return new ItemQualityReportResource(
                saved.getId(),
                saved.getStatus().value(),
                saved.getSpoiledOn().toString(),
                saved.getProblem().value());
    }

    private void tellStallAndAdmins(Order order, OrderItem line, QualityReport report) {
        FarmerProfile stall = farmers.findById(order.getFarmerId()).orElse(null);
        if (stall == null) {
            return;
        }
        notifications.dispatch(
                List.of(stall.getUserId()),
                NotificationEvent.of(
                        NotificationKind.QUALITY_REPORTED,
                        QualityLinks.FARMER_REPORTS,
                        Map.of("product", line.getProductName(), "order", order.getOrderCode())));
        if (SpoilagePolicy.escalates(report.isShelfLifeExtended(), report.isBeforePromise())) {
            notifications.notifyAdmins(
                    NotificationEvent.of(
                            NotificationKind.QUALITY_ESCALATED,
                            QualityLinks.ADMIN_QUEUE,
                            Map.of(
                                    "stall", stall.getStallName(),
                                    "product", line.getProductName(),
                                    "days", String.valueOf(report.getExtendedByDays()),
                                    "order", order.getOrderCode())));
        }
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}

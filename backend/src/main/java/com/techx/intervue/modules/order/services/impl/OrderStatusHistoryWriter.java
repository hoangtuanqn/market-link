package com.techx.intervue.modules.order.services.impl;

import com.techx.intervue.modules.order.entities.OrderStatusHistory;
import com.techx.intervue.modules.order.enums.OrderStatus;
import com.techx.intervue.modules.order.repositories.OrderStatusHistoryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/**
 * FR-038 (C5-1): the only place that writes order_status_history. Runs in the caller's transaction,
 * so the history row and the status change are written together or dropped together.
 */
@Component
@RequiredArgsConstructor
public class OrderStatusHistoryWriter {

    private final OrderStatusHistoryRepository repository;

    /**
     * @param from null on the first row (at order time)
     * @param changedBy users.id of who changed it; null when the system changes it itself
     */
    public void record(
            long orderId, OrderStatus from, OrderStatus to, Long changedBy, String note) {
        OrderStatusHistory row = new OrderStatusHistory();
        row.setOrderId(orderId);
        row.setFromStatus(from);
        row.setToStatus(to);
        row.setChangedBy(changedBy);
        row.setNote(note);
        repository.save(row);
    }
}

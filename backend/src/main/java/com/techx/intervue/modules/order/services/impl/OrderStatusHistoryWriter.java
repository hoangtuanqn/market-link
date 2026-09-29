package com.techx.intervue.modules.order.services.impl;

import com.techx.intervue.modules.order.entities.OrderStatusHistory;
import com.techx.intervue.modules.order.enums.OrderStatus;
import com.techx.intervue.modules.order.repositories.OrderStatusHistoryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class OrderStatusHistoryWriter {

    private final OrderStatusHistoryRepository repository;

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

package com.techx.intervue.modules.order.services.impl;

import com.techx.intervue.modules.order.entities.OrderStatusHistory;
import com.techx.intervue.modules.order.enums.OrderStatus;
import com.techx.intervue.modules.order.repositories.OrderStatusHistoryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/**
 * FR-038 (C5-1): chỗ duy nhất ghi order_status_history. Chạy trong transaction của người gọi, nên
 * dòng lịch sử và lần đổi trạng thái cùng được ghi hoặc cùng bị bỏ.
 */
@Component
@RequiredArgsConstructor
public class OrderStatusHistoryWriter {

    private final OrderStatusHistoryRepository repository;

    /**
     * @param from null ở dòng đầu tiên (lúc đặt đơn)
     * @param changedBy users.id của người đổi; null khi hệ thống tự đổi
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

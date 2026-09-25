package com.techx.intervue.modules.achievement.resources;

/**
 * Số đơn của một người mua theo kết cục. declined (sạp từ chối) và inProgress (placed / accepted /
 * ready) không tính vào tỉ lệ hoàn tất: chỉ đơn hoàn tất và đơn khách tự huỷ mới nói lên độ tin cậy
 * của người mua. totalSpent chỉ cộng đơn hoàn tất, vì tiền trả tại sạp khi nhận hàng.
 */
public record OrderStats(
        long completed, long cancelled, long declined, long inProgress, long totalSpent) {

    public static final OrderStats EMPTY = new OrderStats(0, 0, 0, 0, 0);

    /** Phần trăm làm tròn xuống; null khi chưa có đơn nào kết thúc (hoàn tất hoặc tự huỷ). */
    public Integer completionRate() {
        long finished = completed + cancelled;
        return finished == 0 ? null : (int) (completed * 100 / finished);
    }
}

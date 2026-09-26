package com.techx.intervue.modules.achievement.resources;

/**
 * A buyer's order counts by outcome. declined (rejected by the stall) and inProgress (placed /
 * accepted / ready) do not count toward the completion rate: only completed orders and orders the
 * customer cancels themselves show how reliable the buyer is. totalSpent only sums completed
 * orders, because payment is made at the stall on pickup.
 */
public record OrderStats(
        long completed, long cancelled, long declined, long inProgress, long totalSpent) {

    public static final OrderStats EMPTY = new OrderStats(0, 0, 0, 0, 0);

    /** Percentage rounded down; null when no order has ended yet (completed or self-cancelled). */
    public Integer completionRate() {
        long finished = completed + cancelled;
        return finished == 0 ? null : (int) (completed * 100 / finished);
    }
}

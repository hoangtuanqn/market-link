package com.techx.intervue.modules.achievement.resources;

public record OrderStats(
        long completed, long cancelled, long declined, long inProgress, long totalSpent) {

    public static final OrderStats EMPTY = new OrderStats(0, 0, 0, 0, 0);

    public Integer completionRate() {
        long finished = completed + cancelled;
        return finished == 0 ? null : (int) (completed * 100 / finished);
    }
}

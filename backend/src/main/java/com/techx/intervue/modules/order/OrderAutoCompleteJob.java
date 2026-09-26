package com.techx.intervue.modules.order;

import com.techx.intervue.modules.order.repositories.OrderQueryRepository;
import com.techx.intervue.modules.order.services.interfaces.OrderServiceInterface;
import java.time.Clock;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * FR-039, D-03 — a ready order nobody marked as picked up becomes completed 24 hours after its
 * pickup window ends. Runs every hour at minute 15 (Vietnam time), in batches so the orders table
 * is never locked wholesale; each order is completed in its own transaction.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class OrderAutoCompleteJob {

    static final int BATCH_SIZE = 200;
    private static final Duration GRACE = Duration.ofHours(24);

    private final OrderQueryRepository queries;
    private final OrderServiceInterface orders;
    private final Clock clock;

    @Scheduled(cron = "0 15 * * * *", zone = "Asia/Ho_Chi_Minh")
    public void run() {
        int completed = sweep();
        if (completed > 0) {
            log.info("Auto-completed {} ready orders after their pickup window", completed);
        }
    }

    /** Returns how many orders were completed (for tests and the log). */
    public int sweep() {
        LocalDateTime threshold = LocalDateTime.now(clock).minus(GRACE);
        Set<Long> seen = new HashSet<>();
        int completed = 0;
        while (true) {
            List<Long> batch = queries.readyPastPickup(threshold, BATCH_SIZE);
            // An order that cannot be completed would come back in every batch: stop instead of
            // looping forever
            List<Long> fresh = batch.stream().filter(seen::add).toList();
            if (fresh.isEmpty()) {
                return completed;
            }
            for (Long id : fresh) {
                if (orders.autoComplete(id)) {
                    completed++;
                }
            }
            if (batch.size() < BATCH_SIZE) {
                return completed;
            }
        }
    }
}

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

    public int sweep() {
        LocalDateTime threshold = LocalDateTime.now(clock).minus(GRACE);
        Set<Long> seen = new HashSet<>();
        int completed = 0;
        while (true) {
            List<Long> batch = queries.readyPastPickup(threshold, BATCH_SIZE);
            List<Long> fresh = batch.stream().filter(seen::add).toList();
            if (fresh.isEmpty()) {
                return completed;
            }
            for (Long id : fresh) {
                try {
                    if (orders.autoComplete(id)) {
                        completed++;
                    }
                } catch (RuntimeException e) {
                    log.warn("Could not auto-complete order {}: {}", id, e.getMessage());
                }
            }
            if (batch.size() < BATCH_SIZE) {
                return completed;
            }
        }
    }
}

package com.techx.intervue.modules.order;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.techx.intervue.modules.order.repositories.OrderQueryRepository;
import com.techx.intervue.modules.order.services.interfaces.OrderServiceInterface;
import java.time.Clock;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.List;
import java.util.stream.LongStream;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

/** FR-039 — how the sweep walks the due orders: batches of 200, one transaction per order. */
class OrderAutoCompleteJobBatchTest {

    private static final ZoneId HCM = ZoneId.of("Asia/Ho_Chi_Minh");
    private static final LocalDateTime NOW = LocalDateTime.of(2026, 9, 26, 10, 15);

    private OrderQueryRepository queries;
    private OrderServiceInterface orders;
    private OrderAutoCompleteJob job;

    @BeforeEach
    void setUp() {
        queries = mock(OrderQueryRepository.class);
        orders = mock(OrderServiceInterface.class);
        Clock clock = Clock.fixed(ZonedDateTime.of(NOW, HCM).toInstant(), HCM);
        job = new OrderAutoCompleteJob(queries, orders, clock);
        when(orders.autoComplete(anyLong())).thenReturn(true);
    }

    private static List<Long> ids(long from, long to) {
        return LongStream.rangeClosed(from, to).boxed().toList();
    }

    /** D-03: due = pickup end + 24 hours is before now, in Vietnam local time. */
    @Test
    void sweepAsksForReadyOrdersWhosePickupEndedMoreThanADayAgo() {
        when(queries.readyPastPickup(eq(NOW.minusHours(24)), anyInt())).thenReturn(List.of());

        assertThat(job.sweep()).isZero();

        verify(queries).readyPastPickup(NOW.minusHours(24), OrderAutoCompleteJob.BATCH_SIZE);
    }

    @Test
    void sweepKeepsGoingUntilABatchComesBackShort() {
        when(queries.readyPastPickup(eq(NOW.minusHours(24)), anyInt()))
                .thenReturn(ids(1, 200), ids(201, 203));

        assertThat(job.sweep()).isEqualTo(203);

        verify(orders, times(203)).autoComplete(anyLong());
    }

    /** An order that can never be completed must not make the sweep loop forever. */
    @Test
    void sweepStopsWhenTheSameOrdersComeBackAgain() {
        when(queries.readyPastPickup(eq(NOW.minusHours(24)), anyInt())).thenReturn(ids(1, 200));
        when(orders.autoComplete(anyLong())).thenReturn(false);

        assertThat(job.sweep()).isZero();

        verify(orders, times(200)).autoComplete(anyLong());
    }
}

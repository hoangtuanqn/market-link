package com.techx.intervue.modules.order.services.impl;

import com.techx.intervue.modules.order.repositories.OrderRepository;
import java.security.SecureRandom;
import java.time.Clock;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/**
 * C5-6: the order code {@code ML-yyyyMMdd-XXXX}, the date in Vietnam time, XXXX is 4 random
 * unambiguous characters (0/O/1/I dropped). Does not count that day's orders: two place-order calls
 * at the same time would count the same number, and a UNIQUE violation breaks the whole JPA
 * transaction so it cannot be retried. Asks before inserting; UNIQUE(order_code) is the last
 * backstop (→ 409 in OrderExceptionHandler).
 */
@Component
@RequiredArgsConstructor
public class OrderCodeGenerator {

    static final String ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    private static final int SUFFIX_LENGTH = 4;
    private static final int MAX_ATTEMPTS = 5;
    private static final DateTimeFormatter DAY = DateTimeFormatter.ofPattern("yyyyMMdd");

    private final OrderRepository orderRepository;
    private final Clock clock;
    private final SecureRandom random = new SecureRandom();

    public String next() {
        String prefix = "ML-" + LocalDate.now(clock).format(DAY) + "-";
        for (int attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
            String code = prefix + suffix();
            if (!orderRepository.existsByOrderCode(code)) {
                return code;
            }
        }
        // 32^4 ≈ 1 million codes a day: five collisions in a row only happens with a real bug
        throw new IllegalStateException(
                "No free order code after " + MAX_ATTEMPTS + " attempts for " + prefix);
    }

    private String suffix() {
        StringBuilder out = new StringBuilder(SUFFIX_LENGTH);
        for (int i = 0; i < SUFFIX_LENGTH; i++) {
            out.append(ALPHABET.charAt(random.nextInt(ALPHABET.length())));
        }
        return out.toString();
    }
}

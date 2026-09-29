package com.techx.intervue.modules.user.services.impl;

import com.techx.intervue.modules.user.entities.UserStatusHistory;
import com.techx.intervue.modules.user.enums.UserStatus;
import com.techx.intervue.modules.user.repositories.UserStatusHistoryRepository;
import java.time.Instant;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class UserStatusHistoryWriter {

    private final UserStatusHistoryRepository repository;

    public void record(
            long userId,
            UserStatus from,
            UserStatus to,
            String reason,
            Instant until,
            Long changedBy) {
        UserStatusHistory row = new UserStatusHistory();
        row.setUserId(userId);
        row.setFromStatus(from);
        row.setToStatus(to);
        row.setReason(reason);
        row.setUntil(until);
        row.setChangedBy(changedBy);
        repository.save(row);
    }
}

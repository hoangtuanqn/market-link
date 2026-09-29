package com.techx.intervue.modules.farmer.services.impl;

import com.techx.intervue.modules.farmer.entities.FarmerStatusHistory;
import com.techx.intervue.modules.farmer.enums.ApprovalStatus;
import com.techx.intervue.modules.farmer.repositories.FarmerStatusHistoryRepository;
import java.time.Instant;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class FarmerStatusHistoryWriter {

    private final FarmerStatusHistoryRepository repository;

    public void record(
            long farmerId,
            ApprovalStatus from,
            ApprovalStatus to,
            String reason,
            Instant until,
            Long changedBy) {
        FarmerStatusHistory row = new FarmerStatusHistory();
        row.setFarmerId(farmerId);
        row.setFromStatus(from);
        row.setToStatus(to);
        row.setReason(reason);
        row.setUntil(until);
        row.setChangedBy(changedBy);
        repository.save(row);
    }
}

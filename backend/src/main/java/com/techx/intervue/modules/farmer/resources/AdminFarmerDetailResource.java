package com.techx.intervue.modules.farmer.resources;

import com.techx.intervue.modules.farmer.enums.ApprovalStatus;
import com.techx.intervue.modules.user.enums.UserStatus;
import java.time.Instant;
import java.util.List;
import lombok.Builder;

/** §6.2 — chi tiết đầy đủ để Admin duyệt hoặc đình chỉ. */
@Builder
public record AdminFarmerDetailResource(
        Long id,
        Long userId,
        String stallName,
        String contactPerson,
        String description,
        List<String> photoUrls,
        String videoUrl,
        String email,
        String phone,
        String address,
        ApprovalStatus approvalStatus,
        String rejectReason,
        Instant approvedAt,
        Instant createdAt,
        /** Tài khoản Customer đã có từ trước — không phải ngày tạo hồ sơ Farmer này. */
        Instant customerSince,
        UserStatus accountStatus) {}

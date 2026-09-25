package com.techx.intervue.modules.farmer.resources;

import com.techx.intervue.modules.farmer.enums.ApprovalStatus;
import java.time.Instant;
import lombok.Builder;

/**
 * §6.1 — một dòng trong danh sách Farmer của Admin. Thứ tự tham số là thứ tự trong câu JPQL {@code
 * FarmerProfileRepository#search}: đổi chỗ ở đây thì phải đổi cả ở đó.
 */
@Builder
public record AdminFarmerListItemResource(
        Long id,
        String stallName,
        String contactPerson,
        String email,
        /**
         * docs/prototype/admin/farmers.html: dòng phụ dưới tên sạp là "người liên hệ · điện thoại".
         */
        String phone,
        ApprovalStatus approvalStatus,
        Instant createdAt) {}

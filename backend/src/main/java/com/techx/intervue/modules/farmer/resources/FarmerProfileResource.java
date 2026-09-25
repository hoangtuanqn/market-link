package com.techx.intervue.modules.farmer.resources;

import com.techx.intervue.modules.farmer.enums.ApprovalStatus;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import lombok.Builder;

/** Hồ sơ Farmer của chính người gọi (Customer đang chờ duyệt hoặc Farmer đã duyệt/bị đình chỉ). */
@Builder
public record FarmerProfileResource(
        Long id,
        String stallName,
        String contactPerson,
        String description,
        List<String> categories,
        String mainCrops,
        String weeklyVolume,
        String growingMethod,
        String plotAddress,
        String plotSize,
        Integer growingSinceYear,
        BigDecimal plotLatitude,
        BigDecimal plotLongitude,
        List<String> photoUrls,
        String videoUrl,
        String preferredMarketName,
        ApprovalStatus approvalStatus,
        Instant createdAt) {}

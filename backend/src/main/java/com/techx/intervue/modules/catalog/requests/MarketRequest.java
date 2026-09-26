package com.techx.intervue.modules.catalog.requests;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.util.List;

/**
 * Body của POST/PUT /api/v1/admin/markets (contract §3). Giờ là chuỗi "HH:mm"; ngày họp là mảng 0…6
 * (0 = Chủ nhật). Không có mapProvider: D-12 chốt cứng 'osm' ở server.
 *
 * <p>{@code images} là URL trả về từ POST /admin/markets/images (đã tải file lên trước); tối đa 8
 * cái, độ dài từng cái được kiểm ở service vì @Size trên record không phủ được phần tử của List.
 */
public record MarketRequest(
        @NotBlank(message = "Market name is required.") @Size(max = 150) String marketName,
        @NotBlank(message = "Address is required.") @Size(max = 255) String address,
        @Size(max = 100) String district,
        @Size(max = 100) String city,
        @NotNull(message = "Latitude is required.") @DecimalMin("-90") @DecimalMax("90")
                BigDecimal latitude,
        @NotNull(message = "Longitude is required.") @DecimalMin("-180") @DecimalMax("180")
                BigDecimal longitude,
        @NotBlank(message = "Opening time is required.")
                @Pattern(regexp = "^\\d{2}:\\d{2}$", message = "Use HH:mm.")
                String openingTime,
        @NotBlank(message = "Closing time is required.")
                @Pattern(regexp = "^\\d{2}:\\d{2}$", message = "Use HH:mm.")
                String closingTime,
        @NotEmpty(message = "Add at least one photo.")
                @Size(max = 8, message = "Add at most 8 images.")
                List<String> images,
        @NotNull(message = "Operating days are required.") List<Integer> operatingDays) {}

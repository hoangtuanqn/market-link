package com.techx.intervue.modules.farmer.requests;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.util.List;

/**
 * Customer đang đăng nhập nộp đơn xin thành Farmer. Email/phone/address dùng lại từ users (đã có ở
 * bước đăng ký Customer) — không lặp trong request này (§9 nguyên tắc bố trí thông tin liên hệ).
 *
 * <p>Các trường từ {@code description} trở xuống theo prototype
 * (docs/prototype/customer/become-farmer.html), tất cả optional: chưa có bảng categories/markets
 * thật nên {@code categories}/{@code preferredMarketName} là text tự do, không phải khoá ngoại.
 */
public record FarmerApplicationRequest(
        @NotBlank(message = "Enter your stall name.")
                @Size(max = 120, message = "Stall name can be at most 120 characters.")
                String stallName,
        @NotBlank(message = "Enter a contact person.")
                @Size(max = 100, message = "Contact person can be at most 100 characters.")
                String contactPerson,
        @Size(max = 2000, message = "Keep the description under 2000 characters.")
                String description,
        @Size(max = 20, message = "At most 20 categories.") List<String> categories,
        @Size(max = 255, message = "Keep main crops under 255 characters.") String mainCrops,
        @Size(max = 100, message = "Keep the weekly volume under 100 characters.")
                String weeklyVolume,
        @Size(max = 2000, message = "Keep the growing method under 2000 characters.")
                String growingMethod,
        @Size(max = 255, message = "Keep the plot address under 255 characters.")
                String plotAddress,
        @Size(max = 50, message = "Keep the plot size under 50 characters.") String plotSize,
        @Min(value = 1900, message = "Enter a realistic year.")
                @Max(value = 2100, message = "Enter a realistic year.")
                Integer growingSinceYear,
        @DecimalMin(value = "-90", message = "Latitude must be between -90 and 90.")
                @DecimalMax(value = "90", message = "Latitude must be between -90 and 90.")
                BigDecimal plotLatitude,
        @DecimalMin(value = "-180", message = "Longitude must be between -180 and 180.")
                @DecimalMax(value = "180", message = "Longitude must be between -180 and 180.")
                BigDecimal plotLongitude,
        // Độ dài từng URL phải khớp cột lưu: dài hơn thì DB ném lỗi và FE đọc thành 401, không
        // phải 400.
        @Size(max = 5, message = "At most 5 photos.")
                List<@Size(max = 255, message = "Photo link is too long.") String> photoUrls,
        @Size(max = 255, message = "Video link is too long.") String videoUrl,
        @Size(max = 120, message = "Keep the market name under 120 characters.")
                String preferredMarketName) {}

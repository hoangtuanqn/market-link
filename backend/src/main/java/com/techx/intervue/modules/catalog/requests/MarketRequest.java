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
 * Body of POST/PUT /api/v1/admin/markets (contract §3). Times are "HH:mm" strings; operating days
 * are an array 0…6 (0 = Sunday). No mapProvider: D-12 hard-fixes 'osm' on the server.
 *
 * <p>{@code images} are URLs returned by POST /admin/markets/images (the file was already
 * uploaded); at most 8 of them, each one's length is checked in the service because @Size on a
 * record cannot cover a List's elements.
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

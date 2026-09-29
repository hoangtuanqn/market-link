package com.techx.intervue.modules.catalog.requests;

import com.techx.intervue.modules.geo.requests.AddressPartsRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.util.List;

public record MarketRequest(
        @NotBlank(message = "Market name is required.") @Size(max = 150) String marketName,
        @NotNull(message = "Choose the market's address.") @Valid AddressPartsRequest addressParts,
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

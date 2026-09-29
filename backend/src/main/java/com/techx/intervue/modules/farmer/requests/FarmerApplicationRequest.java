package com.techx.intervue.modules.farmer.requests;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;
import java.util.List;

public record FarmerApplicationRequest(
        @NotBlank(message = "Enter your stall name.")
                @Size(max = 120, message = "Stall name can be at most 120 characters.")
                String stallName,
        @NotBlank(message = "Enter a contact person.")
                @Size(max = 100, message = "Contact person can be at most 100 characters.")
                String contactPerson,
        @Size(max = 2000, message = "Keep the description under 2000 characters.")
                String description,
        @NotEmpty(message = "Add at least one photo of the plot.")
                @Size(max = 5, message = "At most 5 photos.")
                List<
                                @NotBlank(message = "Upload the photos again.")
                                @Size(max = 255, message = "Photo link is too long.") String>
                        photoUrls,
        @Size(max = 255, message = "Video link is too long.") String videoUrl) {}

package com.techx.intervue.modules.farmer.requests;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;
import java.util.List;

/**
 * A signed-in Customer applies to become a Farmer. Email/phone/address are reused from users
 * (already there from the Customer sign-up step) — not repeated in this request (§9 principle for
 * laying out contact information).
 *
 * <p>The application only asks three things an Admin needs to approve: who the stall is,
 * images/videos as evidence, and the commitments in the last step. What the Farmer sells, at which
 * market, and the stock are declared <b>after approval</b> in the Farmer panel (FR-060…FR-064) —
 * asking earlier only makes the form long for data that may not be used.
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
        // Images are the evidence an admin looks at to approve: at least one is required, matching
        // the become-farmer form.
        // Each URL's length must match the storing column: longer and the DB throws and the FE
        // reads it as 401, not
        // 400.
        @NotEmpty(message = "Add at least one photo of the plot.")
                @Size(max = 5, message = "At most 5 photos.")
                List<
                                @NotBlank(message = "Upload the photos again.")
                                @Size(max = 255, message = "Photo link is too long.") String>
                        photoUrls,
        @Size(max = 255, message = "Video link is too long.") String videoUrl) {}

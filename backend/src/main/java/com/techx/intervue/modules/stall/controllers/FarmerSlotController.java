package com.techx.intervue.modules.stall.controllers;

import com.techx.intervue.controllers.BaseController;
import com.techx.intervue.modules.stall.requests.GenerateSlotsRequest;
import com.techx.intervue.modules.stall.requests.UpdateSlotRequest;
import com.techx.intervue.modules.stall.resources.SlotResource;
import com.techx.intervue.modules.stall.services.interfaces.SlotServiceInterface;
import com.techx.intervue.modules.user.resources.CustomUserDetails;
import com.techx.intervue.resources.ApiResource;
import jakarta.validation.Valid;
import java.util.List;
import lombok.AllArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** FR-032, FR-067 — Farmer sinh và quản slot nhận hàng của mình (contract §6, R-06). */
@RestController
@RequestMapping("/api/v1/farmer/slots")
@PreAuthorize("hasRole('FARMER')")
@AllArgsConstructor
public class FarmerSlotController extends BaseController {

    private final SlotServiceInterface slotService;

    @PostMapping("/generate")
    public ResponseEntity<ApiResource<List<SlotResource>>> generate(
            @AuthenticationPrincipal CustomUserDetails user,
            @Valid @RequestBody GenerateSlotsRequest request) {
        return created(slotService.generateSlots(user.getId(), request), "Pickup slots generated.");
    }

    @PatchMapping("/{slotId}")
    public ResponseEntity<ApiResource<SlotResource>> update(
            @AuthenticationPrincipal CustomUserDetails user,
            @PathVariable long slotId,
            @Valid @RequestBody UpdateSlotRequest request) {
        return ok(slotService.updateSlot(user.getId(), slotId, request), "Pickup slot saved.");
    }
}

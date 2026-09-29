package com.techx.intervue.modules.stall.controllers;

import com.techx.intervue.controllers.BaseController;
import com.techx.intervue.modules.stall.requests.GenerateSlotsRequest;
import com.techx.intervue.modules.stall.requests.UpdateSlotRequest;
import com.techx.intervue.modules.stall.resources.SlotResource;
import com.techx.intervue.modules.stall.services.interfaces.SlotServiceInterface;
import com.techx.intervue.modules.user.resources.CustomUserDetails;
import com.techx.intervue.resources.ApiResource;
import jakarta.validation.Valid;
import java.time.LocalDate;
import java.util.List;
import lombok.AllArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/farmer/slots")
@PreAuthorize("hasRole('FARMER')")
@AllArgsConstructor
public class FarmerSlotController extends BaseController {

    private final SlotServiceInterface slotService;

    @GetMapping
    public ResponseEntity<ApiResource<List<SlotResource>>> mySlots(
            @AuthenticationPrincipal CustomUserDetails user,
            @RequestParam long farmerMarketId,
            @RequestParam(required = false) LocalDate date) {
        return ok(slotService.farmerSlots(user.getId(), farmerMarketId, date), "");
    }

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

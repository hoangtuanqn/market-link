package com.techx.intervue.modules.stall.controllers;

import com.techx.intervue.controllers.BaseController;
import com.techx.intervue.modules.stall.resources.SlotResource;
import com.techx.intervue.modules.stall.resources.StallDetailResource;
import com.techx.intervue.modules.stall.resources.StallSummaryResource;
import com.techx.intervue.modules.stall.services.interfaces.SlotServiceInterface;
import com.techx.intervue.modules.stall.services.interfaces.StallServiceInterface;
import com.techx.intervue.resources.ApiResource;
import com.techx.intervue.resources.PageResource;
import java.time.LocalDate;
import java.util.List;
import lombok.AllArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * GET /api/v1/farmers, /api/v1/farmers/{id}, /api/v1/farmers/{id}/slots — Public (khai trong
 * SecurityConfig). FR-011, FR-032.
 */
@RestController
@RequestMapping("/api/v1/farmers")
@AllArgsConstructor
public class PublicFarmerController extends BaseController {

    private final StallServiceInterface stallService;
    private final SlotServiceInterface slotService;

    @GetMapping
    public ResponseEntity<ApiResource<PageResource<StallSummaryResource>>> search(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) Long marketId,
            @RequestParam(required = false) Integer day,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "12") int pageSize) {
        return ok(stallService.search(q, marketId, day, page, pageSize), "");
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResource<StallDetailResource>> detail(@PathVariable long id) {
        return ok(stallService.publicDetail(id), "");
    }

    /** Slot còn nhận đơn của stall; không có `date` thì từ hôm nay tới hết 14 ngày. */
    @GetMapping("/{id}/slots")
    public ResponseEntity<ApiResource<List<SlotResource>>> slots(
            @PathVariable long id,
            @RequestParam(required = false) Long marketId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
                    LocalDate date) {
        return ok(slotService.publicSlots(id, marketId, date), "");
    }
}

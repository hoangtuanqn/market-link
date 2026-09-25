package com.techx.intervue.modules.conversation;

import com.techx.intervue.modules.farmer.repositories.FarmerProfileRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

/**
 * Spec §8.1 bắt StallAccessPolicy fail-closed: một tài khoản role farmer mà không có hàng
 * farmer_profiles thì không phải stall đang mở, nên không nhắn được — cả gửi lẫn nhận.
 *
 * <p>Đó là hành vi đúng, nhưng nó hỏng theo kiểu im lặng: khách chỉ thấy "stall chưa mở" và không
 * ai biết nguyên nhân là một hàng DB thiếu. Cách duy nhất sinh ra dữ liệu đó là seed sai hoặc sửa
 * DB tay (FarmerService chỉ đặt role = FARMER lúc approve). Một dòng WARN lúc khởi động là đủ để
 * người dựng seed thấy ngay thay vì đi tìm trong lúc demo.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class ChatStallConsistencyCheck {

    private final FarmerProfileRepository farmerProfiles;

    @EventListener(ApplicationReadyEvent.class)
    public void warnAboutFarmersWithoutAStallProfile() {
        long broken = farmerProfiles.countFarmersWithoutAProfile();
        if (broken > 0) {
            log.warn(
                    "{} account(s) have role=farmer but no farmer_profiles row. Chat is closed for"
                            + " them (spec 8.1): customers get 403 opening a thread and 409"
                            + " sending. Add an approved farmer_profiles row for each.",
                    broken);
        }
    }
}

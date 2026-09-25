package com.techx.intervue.modules.user.services.impl;

import com.techx.intervue.modules.user.repositories.RefreshTokenRepository;
import java.time.Instant;
import lombok.AllArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Mỗi lần đăng nhập / refresh sinh một dòng refresh_tokens; token hết hạn không còn dùng được (kể
 * cả để phát hiện dùng lại) nên xoá hằng đêm để bảng không phình mãi.
 */
@Slf4j
@Component
@AllArgsConstructor
public class RefreshTokenCleanupJob {

    private final RefreshTokenRepository repository;

    /** 03:00 mỗi ngày giờ Việt Nam. */
    @Scheduled(cron = "0 0 3 * * *", zone = "Asia/Ho_Chi_Minh")
    @Transactional
    public void deleteExpiredTokens() {
        Long deleted = repository.deleteByExpiryDateBefore(Instant.now());
        log.info("Deleted {} expired refresh tokens", deleted);
    }
}

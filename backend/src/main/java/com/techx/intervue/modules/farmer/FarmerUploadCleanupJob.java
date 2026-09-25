package com.techx.intervue.modules.farmer;

import com.techx.intervue.modules.farmer.entities.FarmerApplicationHistory;
import com.techx.intervue.modules.farmer.entities.FarmerProfile;
import com.techx.intervue.modules.farmer.repositories.FarmerApplicationHistoryRepository;
import com.techx.intervue.modules.farmer.repositories.FarmerProfileRepository;
import com.techx.intervue.modules.farmer.services.impl.FarmerUploadService;
import java.time.Clock;
import java.time.Duration;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Người dùng tải ảnh lên rồi bỏ ngang, không bấm gửi: file nằm lại trên ổ đĩa mãi. Mỗi giờ quét một
 * lần, xoá ảnh/video cũ hơn 24 giờ mà không đơn nào — hiện tại hay trong lịch sử — còn trỏ tới.
 * Cùng cách làm với {@code ChatAttachmentCleanupJob}. @EnableScheduling đã bật ở AppConfig.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class FarmerUploadCleanupJob {

    static final Duration KEEP_ORPHANS_FOR = Duration.ofHours(24);

    private static final String SEPARATOR = ";";

    private final FarmerProfileRepository profiles;
    private final FarmerApplicationHistoryRepository history;
    private final FarmerUploadService uploads;
    private final Clock clock;

    @Scheduled(fixedDelayString = "PT1H", initialDelayString = "PT15M")
    @Transactional(readOnly = true)
    public void run() {
        int removed = 0;
        for (Long userId : uploads.usersWithFiles()) {
            removed +=
                    uploads.deleteUnreferenced(
                            userId, referencedBy(userId), clock.instant().minus(KEEP_ORPHANS_FOR));
        }
        if (removed > 0) {
            log.info("Cleaned up {} farmer application files that were never sent", removed);
        }
    }

    /** Mọi đường dẫn tài khoản này còn dùng: đơn hiện tại cộng mọi lần đã nộp. */
    private Set<String> referencedBy(Long userId) {
        Set<String> urls = new HashSet<>();
        profiles.findByUserId(userId)
                .ifPresent(
                        (FarmerProfile profile) -> {
                            addAll(urls, profile.getPhotoPaths());
                            addAll(urls, profile.getVideoPath());
                        });
        List<FarmerApplicationHistory> attempts = history.findByUserIdOrderByAttemptDesc(userId);
        for (FarmerApplicationHistory attempt : attempts) {
            addAll(urls, attempt.getPhotoPaths());
            addAll(urls, attempt.getVideoPath());
        }
        return urls;
    }

    private static void addAll(Set<String> urls, String stored) {
        if (stored == null || stored.isBlank()) {
            return;
        }
        for (String url : stored.split(SEPARATOR)) {
            if (!url.isBlank()) {
                urls.add(url);
            }
        }
    }
}

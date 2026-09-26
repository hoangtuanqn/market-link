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
 * A user uploads an image and abandons it without submitting: the file stays on disk forever. Once
 * an hour it sweeps, deleting images/videos older than 24 hours that no application — current or
 * historical — still points to. Same approach as {@code
 * ChatAttachmentCleanupJob}. @EnableScheduling is already on in AppConfig.
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

    /** Every path this account still uses: the current application plus every past submission. */
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

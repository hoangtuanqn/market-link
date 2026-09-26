package com.techx.intervue.modules.conversation;

import com.techx.intervue.modules.farmer.repositories.FarmerProfileRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

/**
 * Spec §8.1 makes StallAccessPolicy fail-closed: an account with the farmer role but no
 * farmer_profiles row is not an open stall, so it cannot be messaged — neither sending nor
 * receiving.
 *
 * <p>That is the right behavior, but it breaks silently: the customer only sees "stall not open"
 * and nobody knows the cause is a missing DB row. The only ways that data arises are a wrong seed
 * or a manual edit of the DB (FarmerService only sets role = FARMER on approve). One WARN line at
 * startup is enough for the person building the seed to see it right away instead of hunting for it
 * during a demo.
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

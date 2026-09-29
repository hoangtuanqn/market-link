package com.techx.intervue.modules.conversation;

import com.techx.intervue.modules.farmer.repositories.FarmerProfileRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

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

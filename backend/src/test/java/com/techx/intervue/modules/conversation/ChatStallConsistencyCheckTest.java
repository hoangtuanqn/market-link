package com.techx.intervue.modules.conversation;

import static org.assertj.core.api.Assertions.assertThat;

import com.techx.intervue.modules.farmer.entities.FarmerProfile;
import com.techx.intervue.modules.farmer.enums.ApprovalStatus;
import com.techx.intervue.modules.farmer.repositories.FarmerProfileRepository;
import com.techx.intervue.modules.user.entities.User;
import com.techx.intervue.modules.user.enums.RoleType;
import com.techx.intervue.modules.user.repositories.UserRepository;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

/**
 * StallAccessPolicy fails closed: a FARMER role with no farmer_profiles row cannot be messaged, in
 * either direction. That is the right behavior per spec §8.1 — but it is silent, and a demo seed or
 * one manual DB edit is enough to produce that data. This query is what turns "chat just breaks"
 * into a warning line at startup.
 */
@SpringBootTest
@Transactional
class ChatStallConsistencyCheckTest {

    @Autowired UserRepository users;
    @Autowired FarmerProfileRepository farmerProfiles;

    @Test
    void countsFarmerAccountsThatHaveNoStallProfile() {
        long before = farmerProfiles.countFarmersWithoutAProfile();

        newUser(RoleType.FARMER); // does not create a profile: exactly the kind of inconsistent
        // data that needs detecting

        assertThat(farmerProfiles.countFarmersWithoutAProfile()).isEqualTo(before + 1);
    }

    @Test
    void doesNotCountAFarmerThatHasAProfileWhateverItsApprovalStatus() {
        long before = farmerProfiles.countFarmersWithoutAProfile();

        User pending = newUser(RoleType.FARMER);
        FarmerProfile profile = new FarmerProfile();
        profile.setUserId(pending.getId());
        profile.setStallName("Consistency stall");
        profile.setContactPerson(pending.getFullName());
        profile.setApprovalStatus(ApprovalStatus.SUSPENDED);
        farmerProfiles.saveAndFlush(profile);

        assertThat(farmerProfiles.countFarmersWithoutAProfile()).isEqualTo(before);
    }

    @Test
    void doesNotCountCustomers() {
        long before = farmerProfiles.countFarmersWithoutAProfile();

        newUser(RoleType.CUSTOMER);

        assertThat(farmerProfiles.countFarmersWithoutAProfile()).isEqualTo(before);
    }

    private User newUser(RoleType role) {
        String tag = UUID.randomUUID().toString().substring(0, 8);
        return users.saveAndFlush(
                User.builder()
                        .fullName("Test " + tag)
                        .email(tag + "@consistency.test")
                        .phone("05" + String.format("%08d", Math.abs(tag.hashCode()) % 100_000_000))
                        .passwordHash("x")
                        .role(role)
                        .build());
    }
}

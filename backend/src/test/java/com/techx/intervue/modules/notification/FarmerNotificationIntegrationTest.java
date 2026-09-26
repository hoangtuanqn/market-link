package com.techx.intervue.modules.notification;

import static org.assertj.core.api.Assertions.assertThat;

import com.techx.intervue.modules.farmer.entities.FarmerProfile;
import com.techx.intervue.modules.farmer.enums.ApprovalStatus;
import com.techx.intervue.modules.farmer.repositories.FarmerProfileRepository;
import com.techx.intervue.modules.farmer.services.interfaces.FarmerServiceInterface;
import com.techx.intervue.modules.notification.entities.Notification;
import com.techx.intervue.modules.notification.enums.NotificationKind;
import com.techx.intervue.modules.notification.repositories.NotificationRepository;
import com.techx.intervue.modules.user.entities.User;
import com.techx.intervue.modules.user.entities.UserSettings;
import com.techx.intervue.modules.user.enums.RoleType;
import com.techx.intervue.modules.user.repositories.UserRepository;
import com.techx.intervue.modules.user.repositories.UserSettingsRepository;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.domain.PageRequest;
import org.springframework.transaction.annotation.Transactional;

/**
 * The real path: FarmerService → NotificationService → the notifications table, text in the
 * applicant's language.
 */
@SpringBootTest
@Transactional
class FarmerNotificationIntegrationTest {

    @Autowired FarmerServiceInterface farmers;
    @Autowired FarmerProfileRepository profiles;
    @Autowired UserRepository users;
    @Autowired UserSettingsRepository userSettings;
    @Autowired NotificationRepository notifications;

    private User user(RoleType role) {
        String tag = UUID.randomUUID().toString().substring(0, 8);
        return users.save(
                User.builder()
                        .fullName("F " + tag)
                        .email(tag + "@farmer-notif.test")
                        .phone("08" + String.format("%08d", Math.abs(tag.hashCode()) % 100_000_000))
                        .passwordHash("x")
                        .role(role)
                        .build());
    }

    private void language(User u, String language) {
        userSettings.save(
                UserSettings.builder()
                        .userId(u.getId())
                        .theme("light")
                        .language(language)
                        .currency("VND")
                        .units("metric")
                        .dateFormat("dmy")
                        .clock("h24")
                        .build());
    }

    private FarmerProfile pending(User owner, String stall) {
        return profiles.save(
                FarmerProfile.builder()
                        .userId(owner.getId())
                        .stallName(stall)
                        .contactPerson("Tư")
                        .approvalStatus(ApprovalStatus.PENDING)
                        .build());
    }

    private List<Notification> of(User u) {
        return notifications
                .findByUserIdOrderByCreatedAtDescIdDesc(u.getId(), PageRequest.of(0, 10))
                .getContent();
    }

    @Test
    void aVietnameseOwnerGetsTheApprovalInVietnamese() {
        User owner = user(RoleType.CUSTOMER);
        language(owner, "vi");
        User admin = user(RoleType.ADMIN);
        FarmerProfile profile = pending(owner, "Cô Tư Garden");

        farmers.approve(profile.getId(), admin.getId());

        assertThat(of(owner))
                .singleElement()
                .satisfies(
                        n -> {
                            assertThat(n.getKind()).isEqualTo(NotificationKind.FARMER_APPROVED);
                            assertThat(n.getTitle()).isEqualTo("Sạp của bạn đã được duyệt");
                            assertThat(n.getMessage()).contains("Cô Tư Garden");
                            assertThat(n.getLink()).isEqualTo("/farmer");
                        });
    }

    @Test
    void anOwnerWithAnUnknownLanguageGetsEnglish() {
        User owner = user(RoleType.CUSTOMER);
        language(owner, "xx");
        User admin = user(RoleType.ADMIN);

        farmers.approve(pending(owner, "Stall X").getId(), admin.getId());

        assertThat(of(owner))
                .singleElement()
                .extracting(Notification::getTitle)
                .isEqualTo("Your stall is approved");
    }
}

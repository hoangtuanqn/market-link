package com.techx.intervue.modules.notification.repositories;

import static org.assertj.core.api.Assertions.assertThat;

import com.techx.intervue.modules.notification.entities.Announcement;
import com.techx.intervue.modules.notification.entities.Notification;
import com.techx.intervue.modules.notification.enums.Audience;
import com.techx.intervue.modules.notification.enums.NotificationKind;
import com.techx.intervue.modules.user.entities.User;
import com.techx.intervue.modules.user.enums.RoleType;
import com.techx.intervue.modules.user.enums.UserStatus;
import com.techx.intervue.modules.user.repositories.UserRepository;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

/** Chạy trên MySQL thật: câu fan-out là SQL native nên phải kiểm trên đúng engine. */
@SpringBootTest
@Transactional
class NotificationRepositoryTest {

    @Autowired NotificationRepository notifications;
    @Autowired AnnouncementRepository announcements;
    @Autowired UserRepository users;

    private User user(RoleType role, UserStatus status) {
        String tag = UUID.randomUUID().toString().substring(0, 8);
        User u =
                User.builder()
                        .fullName("N " + tag)
                        .email(tag + "@notif.test")
                        .phone("07" + String.format("%08d", Math.abs(tag.hashCode()) % 100_000_000))
                        .passwordHash("x")
                        .role(role)
                        .build();
        u.setStatus(status);
        return users.save(u);
    }

    @Test
    void fanOutReachesOnlyActiveUsersOfTheAudienceWithARoleSpecificLink() {
        User customer = user(RoleType.CUSTOMER, UserStatus.ACTIVE);
        User farmer = user(RoleType.FARMER, UserStatus.ACTIVE);
        User suspended = user(RoleType.CUSTOMER, UserStatus.SUSPENDED);
        User admin = user(RoleType.ADMIN, UserStatus.ACTIVE);
        Announcement a =
                announcements.save(
                        Announcement.builder()
                                .title("Closed Sunday")
                                .content("Thảo Điền closes on 04/10")
                                .audience(Audience.ALL)
                                .createdBy(admin.getId())
                                .build());

        int inserted =
                notifications.fanOutAnnouncement(
                        a.getId(), a.getTitle(), a.getContent(), Audience.ALL.roleCodes());

        List<NotificationRepository.Recipient> got = notifications.recipientsOf(a.getId());
        assertThat(got)
                .extracting(NotificationRepository.Recipient::getUserId)
                .contains(customer.getId(), farmer.getId())
                .doesNotContain(suspended.getId(), admin.getId());
        assertThat(inserted).isEqualTo(got.size());
        NotificationRepository.Recipient forFarmer =
                got.stream()
                        .filter(r -> r.getUserId().equals(farmer.getId()))
                        .findFirst()
                        .orElseThrow();
        assertThat(forFarmer.getLink()).isEqualTo("/farmer/notifications");
        Notification row = notifications.findById(forFarmer.getId()).orElseThrow();
        assertThat(row.getKind()).isEqualTo(NotificationKind.ANNOUNCEMENT);
        assertThat(row.isRead()).isFalse();
        assertThat(row.getMessage()).isEqualTo("Thảo Điền closes on 04/10");
    }

    @Test
    void customersAudienceLeavesFarmersOut() {
        User customer = user(RoleType.CUSTOMER, UserStatus.ACTIVE);
        User farmer = user(RoleType.FARMER, UserStatus.ACTIVE);
        User admin = user(RoleType.ADMIN, UserStatus.ACTIVE);
        Announcement a =
                announcements.save(
                        Announcement.builder()
                                .title("t")
                                .content("c")
                                .audience(Audience.CUSTOMERS)
                                .createdBy(admin.getId())
                                .build());

        notifications.fanOutAnnouncement(
                a.getId(), a.getTitle(), a.getContent(), Audience.CUSTOMERS.roleCodes());

        assertThat(notifications.recipientsOf(a.getId()))
                .extracting(NotificationRepository.Recipient::getUserId)
                .contains(customer.getId())
                .doesNotContain(farmer.getId());
    }

    @Test
    void markAllReadTouchesOnlyTheOwnersRowsAndCountsFollow() {
        User me = user(RoleType.CUSTOMER, UserStatus.ACTIVE);
        User other = user(RoleType.CUSTOMER, UserStatus.ACTIVE);
        notifications.save(
                Notification.builder()
                        .userId(me.getId())
                        .kind(NotificationKind.FARMER_APPROVED)
                        .title("t")
                        .message("m")
                        .build());
        notifications.save(
                Notification.builder()
                        .userId(other.getId())
                        .kind(NotificationKind.FARMER_APPROVED)
                        .title("t")
                        .message("m")
                        .build());

        assertThat(notifications.markAllRead(me.getId())).isEqualTo(1);
        assertThat(notifications.countByUserIdAndReadFalse(me.getId())).isZero();
        assertThat(notifications.countByUserIdAndReadFalse(other.getId())).isEqualTo(1);
        assertThat(notifications.unreadCounts(List.of(me.getId(), other.getId())))
                .extracting(NotificationRepository.UnreadRow::getUserId)
                .containsExactly(other.getId());
    }

    @Test
    void activeAdminIdsListsOnlyActiveAdmins() {
        User admin = user(RoleType.ADMIN, UserStatus.ACTIVE);
        User inactiveAdmin = user(RoleType.ADMIN, UserStatus.INACTIVE);
        User customer = user(RoleType.CUSTOMER, UserStatus.ACTIVE);

        assertThat(notifications.activeAdminIds())
                .contains(admin.getId())
                .doesNotContain(inactiveAdmin.getId(), customer.getId());
    }
}

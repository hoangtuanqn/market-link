package com.techx.intervue.modules.notification.enums;

import static org.assertj.core.api.Assertions.assertThat;

import com.techx.intervue.modules.user.enums.RoleType;
import java.util.List;
import org.junit.jupiter.api.Test;

class NotificationKindTest {

    @Test
    void theAdminsEscalationHasItsOwnGroupAndTheRestGoWithOrders() {
        assertThat(NotificationKind.QUALITY_ESCALATED.category())
                .isEqualTo(NotificationCategory.QUALITY_REPORTS);
        assertThat(
                        List.of(
                                NotificationKind.QUALITY_REPORTED,
                                NotificationKind.QUALITY_DECIDED,
                                NotificationKind.SHELF_LIFE_VIOLATION,
                                NotificationKind.SHELF_LIFE_LOCKED))
                .allMatch(k -> k.category() == NotificationCategory.ORDERS && k.persistent());
        assertThat(NotificationKind.QUALITY_ESCALATED.persistent()).isTrue();
    }

    @Test
    void theSpoilageGroupIsForAdminsOnly() {
        assertThat(NotificationCategory.QUALITY_REPORTS.code()).isEqualTo("qualityReports");
        assertThat(NotificationCategory.QUALITY_REPORTS.visibleTo(RoleType.ADMIN)).isTrue();
        assertThat(NotificationCategory.QUALITY_REPORTS.visibleTo(RoleType.CUSTOMER)).isFalse();
        assertThat(NotificationCategory.QUALITY_REPORTS.visibleTo(RoleType.FARMER)).isFalse();
    }

    @Test
    void everyCodeFitsItsColumn() {
        assertThat(NotificationKind.values()).allMatch(k -> k.code().length() <= 40);
        assertThat(NotificationCategory.values()).allMatch(c -> c.code().length() <= 30);
    }
}

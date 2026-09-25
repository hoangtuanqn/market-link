package com.techx.intervue.modules.conversation.services.impl;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.techx.intervue.modules.conversation.exceptions.AccountRestrictedException;
import com.techx.intervue.modules.conversation.exceptions.ConversationClosedException;
import com.techx.intervue.modules.conversation.exceptions.StallNotOpenException;
import com.techx.intervue.modules.user.entities.User;
import com.techx.intervue.modules.user.enums.RoleType;
import com.techx.intervue.modules.user.enums.UserStatus;
import org.junit.jupiter.api.Test;

class StallAccessPolicyTest {

    private final StallAccessPolicy policy = new StallAccessPolicy();

    private static User user(RoleType role, UserStatus status) {
        return User.builder().id(1L).role(role).status(status).build();
    }

    @Test
    void anActiveFarmerCanBeMessaged() {
        assertThatCode(() -> policy.assertCanBeMessaged(user(RoleType.FARMER, UserStatus.ACTIVE)))
                .doesNotThrowAnyException();
    }

    @Test
    void aCustomerCannotBeTheTargetOfANewThread() {
        assertThatThrownBy(
                        () ->
                                policy.assertCanBeMessaged(
                                        user(RoleType.CUSTOMER, UserStatus.ACTIVE)))
                .isInstanceOf(StallNotOpenException.class);
    }

    @Test
    void anAdminCannotBeTheTargetOfANewThread() {
        assertThatThrownBy(
                        () -> policy.assertCanBeMessaged(user(RoleType.ADMIN, UserStatus.ACTIVE)))
                .isInstanceOf(StallNotOpenException.class);
    }

    @Test
    void aSuspendedFarmerIsNotOpenForNewThreads() {
        assertThatThrownBy(
                        () ->
                                policy.assertCanBeMessaged(
                                        user(RoleType.FARMER, UserStatus.SUSPENDED)))
                .isInstanceOf(StallNotOpenException.class);
    }

    @Test
    void anInactiveAccountCannotStartOrSend() {
        User me = user(RoleType.CUSTOMER, UserStatus.INACTIVE);
        User stall = user(RoleType.FARMER, UserStatus.ACTIVE);

        assertThatThrownBy(() -> policy.assertCanStart(me))
                .isInstanceOf(AccountRestrictedException.class);
        assertThatThrownBy(() -> policy.assertCanSend(me, stall))
                .isInstanceOf(AccountRestrictedException.class);
    }

    @Test
    void sendingToASuspendedRecipientIsClosedNotForbidden() {
        User me = user(RoleType.CUSTOMER, UserStatus.ACTIVE);
        User stall = user(RoleType.FARMER, UserStatus.SUSPENDED);

        assertThatThrownBy(() -> policy.assertCanSend(me, stall))
                .isInstanceOf(ConversationClosedException.class);
    }

    @Test
    void aFarmerMayReplyToACustomer() {
        User stall = user(RoleType.FARMER, UserStatus.ACTIVE);
        User customer = user(RoleType.CUSTOMER, UserStatus.ACTIVE);

        assertThatCode(() -> policy.assertCanSend(stall, customer)).doesNotThrowAnyException();
    }
}

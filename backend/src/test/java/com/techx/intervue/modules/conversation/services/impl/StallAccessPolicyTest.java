package com.techx.intervue.modules.conversation.services.impl;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.techx.intervue.modules.conversation.exceptions.AccountRestrictedException;
import com.techx.intervue.modules.conversation.exceptions.ConversationClosedException;
import com.techx.intervue.modules.conversation.exceptions.StallNotOpenException;
import com.techx.intervue.modules.farmer.entities.FarmerProfile;
import com.techx.intervue.modules.farmer.enums.ApprovalStatus;
import com.techx.intervue.modules.farmer.repositories.FarmerProfileRepository;
import com.techx.intervue.modules.user.entities.User;
import com.techx.intervue.modules.user.enums.RoleType;
import com.techx.intervue.modules.user.enums.UserStatus;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class StallAccessPolicyTest {

    private FarmerProfileRepository farmerProfiles;
    private StallAccessPolicy policy;

    @BeforeEach
    void setUp() {
        farmerProfiles = mock(FarmerProfileRepository.class);
        // Mặc định: mọi stall trong các ca cũ là stall đã được duyệt
        when(farmerProfiles.findByUserId(anyLong()))
                .thenReturn(Optional.of(profileWith(ApprovalStatus.APPROVED)));
        policy = new StallAccessPolicy(farmerProfiles);
    }

    private static User user(RoleType role, UserStatus status) {
        return User.builder().id(1L).role(role).status(status).build();
    }

    private static FarmerProfile profileWith(ApprovalStatus status) {
        FarmerProfile profile = new FarmerProfile();
        profile.setApprovalStatus(status);
        return profile;
    }

    private void stallIs(ApprovalStatus status) {
        when(farmerProfiles.findByUserId(1L)).thenReturn(Optional.of(profileWith(status)));
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

    @Test
    void aSuspendedStallCannotBeMessagedForTheFirstTime() {
        stallIs(ApprovalStatus.SUSPENDED);

        assertThatThrownBy(
                        () -> policy.assertCanBeMessaged(user(RoleType.FARMER, UserStatus.ACTIVE)))
                .isInstanceOf(StallNotOpenException.class);
    }

    @Test
    void aSuspendedStallCannotReceiveAnyMoreMessages() {
        stallIs(ApprovalStatus.SUSPENDED);
        User customer =
                User.builder().id(4L).role(RoleType.CUSTOMER).status(UserStatus.ACTIVE).build();

        assertThatThrownBy(
                        () ->
                                policy.assertCanSend(
                                        customer, user(RoleType.FARMER, UserStatus.ACTIVE)))
                .isInstanceOf(ConversationClosedException.class);
    }

    @Test
    void aSuspendedStallCannotSendEither() {
        stallIs(ApprovalStatus.SUSPENDED);
        User customer =
                User.builder().id(4L).role(RoleType.CUSTOMER).status(UserStatus.ACTIVE).build();

        assertThatThrownBy(
                        () ->
                                policy.assertCanSend(
                                        user(RoleType.FARMER, UserStatus.ACTIVE), customer))
                .isInstanceOf(ConversationClosedException.class);
    }

    @Test
    void aFarmerWithoutAProfileRowIsTreatedAsNotOpen() {
        when(farmerProfiles.findByUserId(1L)).thenReturn(Optional.empty());

        assertThatThrownBy(
                        () -> policy.assertCanBeMessaged(user(RoleType.FARMER, UserStatus.ACTIVE)))
                .isInstanceOf(StallNotOpenException.class);
    }

    @Test
    void twoCustomersMessagingEachOtherNeverTouchTheFarmerTable() {
        farmerProfiles = mock(FarmerProfileRepository.class);
        policy = new StallAccessPolicy(farmerProfiles);
        User a = User.builder().id(4L).role(RoleType.CUSTOMER).status(UserStatus.ACTIVE).build();
        User b = User.builder().id(5L).role(RoleType.CUSTOMER).status(UserStatus.ACTIVE).build();

        policy.assertCanSend(a, b);

        verifyNoInteractions(farmerProfiles);
    }
}

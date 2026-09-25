package com.techx.intervue.modules.farmer.services.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.techx.intervue.modules.farmer.entities.FarmerApplicationHistory;
import com.techx.intervue.modules.farmer.entities.FarmerProfile;
import com.techx.intervue.modules.farmer.enums.ApprovalStatus;
import com.techx.intervue.modules.farmer.exceptions.FarmerApplicationExistsException;
import com.techx.intervue.modules.farmer.exceptions.FarmerProfileNotFoundException;
import com.techx.intervue.modules.farmer.exceptions.InvalidApprovalTransitionException;
import com.techx.intervue.modules.farmer.repositories.FarmerApplicationHistoryRepository;
import com.techx.intervue.modules.farmer.repositories.FarmerProfileRepository;
import com.techx.intervue.modules.farmer.requests.FarmerApplicationRequest;
import com.techx.intervue.modules.farmer.requests.RejectFarmerRequest;
import com.techx.intervue.modules.farmer.requests.SuspendFarmerRequest;
import com.techx.intervue.modules.farmer.resources.AdminFarmerDetailResource;
import com.techx.intervue.modules.farmer.resources.FarmerProfileResource;
import com.techx.intervue.modules.user.entities.User;
import com.techx.intervue.modules.user.enums.RoleType;
import com.techx.intervue.modules.user.repositories.UserRepository;
import com.techx.intervue.modules.user.services.impl.UserSessionCache;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

class FarmerServiceTest {

    private static final long USER_ID = 1L;
    private static final long FARMER_ID = 10L;
    private static final long ADMIN_ID = 99L;

    private FarmerProfileRepository farmerProfileRepository;
    private FarmerApplicationHistoryRepository historyRepository;
    private UserRepository userRepository;
    private UserSessionCache userSessionCache;
    private FarmerService service;

    @BeforeEach
    void setUp() {
        farmerProfileRepository = mock(FarmerProfileRepository.class);
        historyRepository = mock(FarmerApplicationHistoryRepository.class);
        when(historyRepository.findByUserIdOrderByAttemptDesc(any())).thenReturn(List.of());
        when(historyRepository.findFirstByUserIdOrderByAttemptDesc(any()))
                .thenReturn(Optional.empty());
        when(historyRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        userRepository = mock(UserRepository.class);
        userSessionCache = mock(UserSessionCache.class);
        service =
                new FarmerService(
                        farmerProfileRepository,
                        historyRepository,
                        userRepository,
                        userSessionCache);
    }

    private static FarmerProfile pendingProfile() {
        return FarmerProfile.builder()
                .id(FARMER_ID)
                .userId(USER_ID)
                .stallName("Khang Family Greens")
                .contactPerson("Nguyen Minh Khang")
                .approvalStatus(ApprovalStatus.PENDING)
                .build();
    }

    private static User customer() {
        return User.builder()
                .id(USER_ID)
                .email("khang@example.com")
                .role(RoleType.CUSTOMER)
                .build();
    }

    /** Điền hai trường bắt buộc, để mô tả và ảnh/video trống. */
    private static FarmerApplicationRequest minimalRequest(String stallName, String contactPerson) {
        return new FarmerApplicationRequest(stallName, contactPerson, null, null, null);
    }

    @Test
    void apply_createsPendingProfile_whenNoneExists() {
        when(farmerProfileRepository.findByUserId(USER_ID)).thenReturn(Optional.empty());
        when(farmerProfileRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        FarmerProfileResource result =
                service.apply(USER_ID, minimalRequest(" Khang Family Greens ", " Khang "));

        assertThat(result.stallName()).isEqualTo("Khang Family Greens");
        assertThat(result.contactPerson()).isEqualTo("Khang");
        assertThat(result.approvalStatus()).isEqualTo(ApprovalStatus.PENDING);
    }

    @Test
    void apply_persistsDescriptionAndEvidence_whenProvided() {
        when(farmerProfileRepository.findByUserId(USER_ID)).thenReturn(Optional.empty());
        when(farmerProfileRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        FarmerApplicationRequest request =
                new FarmerApplicationRequest(
                        "Khang Family Greens",
                        "Khang",
                        "Grown with love",
                        List.of(
                                "/uploads/farmer-applications/a.jpg",
                                "/uploads/farmer-applications/b.jpg"),
                        "/uploads/farmer-applications/c.mp4");

        FarmerProfileResource result = service.apply(USER_ID, request);

        assertThat(result.description()).isEqualTo("Grown with love");
        assertThat(result.photoUrls())
                .containsExactly(
                        "/uploads/farmer-applications/a.jpg", "/uploads/farmer-applications/b.jpg");
        assertThat(result.videoUrl()).isEqualTo("/uploads/farmer-applications/c.mp4");
        assertThat(result.approvalStatus()).isEqualTo(ApprovalStatus.PENDING);
    }

    @Test
    void apply_throws_whenAlreadyApplied() {
        when(farmerProfileRepository.findByUserId(USER_ID))
                .thenReturn(Optional.of(pendingProfile()));

        assertThatThrownBy(() -> service.apply(USER_ID, minimalRequest("Stall", "Person")))
                .isInstanceOf(FarmerApplicationExistsException.class);
        verify(farmerProfileRepository, never()).save(any());
    }

    /** Bị từ chối không còn là ngõ cụt: đơn cũ bị ghi đè, lần nộp mới được ghi vào lịch sử. */
    @Test
    void apply_reopensTheRejectedApplication_andRecordsANewAttempt() {
        FarmerProfile rejected = pendingProfile();
        rejected.setApprovalStatus(ApprovalStatus.REJECTED);
        rejected.setRejectReason("Photos do not show the plot");
        when(farmerProfileRepository.findByUserId(USER_ID)).thenReturn(Optional.of(rejected));
        when(farmerProfileRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(historyRepository.countByUserId(USER_ID)).thenReturn(1L);

        FarmerProfileResource result =
                service.apply(USER_ID, minimalRequest("Second try", "Khang"));

        assertThat(result.approvalStatus()).isEqualTo(ApprovalStatus.PENDING);
        assertThat(result.rejectReason()).isNull();
        assertThat(rejected.getRejectReason()).isNull();

        ArgumentCaptor<FarmerApplicationHistory> saved =
                ArgumentCaptor.forClass(FarmerApplicationHistory.class);
        verify(historyRepository).save(saved.capture());
        assertThat(saved.getValue().getAttempt()).isEqualTo(2);
        assertThat(saved.getValue().getStallName()).isEqualTo("Second try");
        assertThat(saved.getValue().getStatus()).isEqualTo(ApprovalStatus.PENDING);
    }

    @Test
    void getMyProfile_returnsNull_whenNoneExists() {
        when(farmerProfileRepository.findByUserId(USER_ID)).thenReturn(Optional.empty());

        assertThat(service.getMyProfile(USER_ID)).isNull();
    }

    @Test
    void approve_flipsStatusAndRole_whenPending() {
        FarmerProfile profile = pendingProfile();
        User owner = customer();
        when(farmerProfileRepository.findById(FARMER_ID)).thenReturn(Optional.of(profile));
        when(userRepository.findById(USER_ID)).thenReturn(Optional.of(owner));
        when(farmerProfileRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(userRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        AdminFarmerDetailResource result = service.approve(FARMER_ID, ADMIN_ID);

        assertThat(result.approvalStatus()).isEqualTo(ApprovalStatus.APPROVED);
        assertThat(owner.getRole()).isEqualTo(RoleType.FARMER);
        assertThat(profile.getApprovedBy()).isEqualTo(ADMIN_ID);
        assertThat(profile.getApprovedAt()).isNotNull();
    }

    /**
     * JwtAuthFilter dựng authority từ UserSessionCache chứ không từ claim của token: chỉ ghi
     * users.role thì Farmer vừa được duyệt vẫn mang ROLE_CUSTOMER tới hết TTL access token.
     */
    @Test
    void approve_refreshesCachedSessionRole_soTheNewRoleAppliesOnTheNextRequest() {
        FarmerProfile profile = pendingProfile();
        User owner = customer();
        when(farmerProfileRepository.findById(FARMER_ID)).thenReturn(Optional.of(profile));
        when(userRepository.findById(USER_ID)).thenReturn(Optional.of(owner));
        when(farmerProfileRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(userRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        service.approve(FARMER_ID, ADMIN_ID);

        verify(userSessionCache).updateRoles(USER_ID, Set.of(RoleType.FARMER));
    }

    /** Suspend không đổi role (D-09: vẫn là farmer, vẫn đăng nhập được) nên không đụng phiên. */
    @Test
    void suspend_leavesTheCachedSessionAlone() {
        FarmerProfile profile = pendingProfile();
        profile.setApprovalStatus(ApprovalStatus.APPROVED);
        User owner = customer();
        owner.setRole(RoleType.FARMER);
        when(farmerProfileRepository.findById(FARMER_ID)).thenReturn(Optional.of(profile));
        when(userRepository.findById(USER_ID)).thenReturn(Optional.of(owner));
        when(farmerProfileRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        service.suspend(FARMER_ID, new SuspendFarmerRequest("Repeated no-shows"), ADMIN_ID);

        verify(userSessionCache, never()).updateRoles(any(), any());
    }

    @Test
    void approve_throws_whenNotPending() {
        FarmerProfile profile = pendingProfile();
        profile.setApprovalStatus(ApprovalStatus.APPROVED);
        when(farmerProfileRepository.findById(FARMER_ID)).thenReturn(Optional.of(profile));

        assertThatThrownBy(() -> service.approve(FARMER_ID, ADMIN_ID))
                .isInstanceOf(InvalidApprovalTransitionException.class);
        verify(userRepository, never()).save(any());
    }

    @Test
    void approve_throws_whenProfileMissing() {
        when(farmerProfileRepository.findById(FARMER_ID)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.approve(FARMER_ID, ADMIN_ID))
                .isInstanceOf(FarmerProfileNotFoundException.class);
    }

    @Test
    void suspend_flipsStatus_whenApproved_andKeepsFarmerRole() {
        FarmerProfile profile = pendingProfile();
        profile.setApprovalStatus(ApprovalStatus.APPROVED);
        User owner = customer();
        owner.setRole(RoleType.FARMER);
        when(farmerProfileRepository.findById(FARMER_ID)).thenReturn(Optional.of(profile));
        when(userRepository.findById(USER_ID)).thenReturn(Optional.of(owner));
        when(farmerProfileRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        AdminFarmerDetailResource result =
                service.suspend(FARMER_ID, new SuspendFarmerRequest("Repeated no-shows"), ADMIN_ID);

        assertThat(result.approvalStatus()).isEqualTo(ApprovalStatus.SUSPENDED);
        assertThat(owner.getRole()).isEqualTo(RoleType.FARMER);
        verify(userRepository, never()).save(any());
    }

    @Test
    void suspend_throws_whenNotApproved() {
        FarmerProfile profile = pendingProfile();
        when(farmerProfileRepository.findById(FARMER_ID)).thenReturn(Optional.of(profile));

        assertThatThrownBy(
                        () ->
                                service.suspend(
                                        FARMER_ID,
                                        new SuspendFarmerRequest("Repeated no-shows"),
                                        ADMIN_ID))
                .isInstanceOf(InvalidApprovalTransitionException.class);
    }

    @Test
    void reject_flipsStatusAndStoresReason_whenPending() {
        FarmerProfile profile = pendingProfile();
        User owner = customer();
        when(farmerProfileRepository.findById(FARMER_ID)).thenReturn(Optional.of(profile));
        when(userRepository.findById(USER_ID)).thenReturn(Optional.of(owner));
        when(farmerProfileRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        AdminFarmerDetailResource result =
                service.reject(FARMER_ID, new RejectFarmerRequest(" Market is full "), ADMIN_ID);

        assertThat(result.approvalStatus()).isEqualTo(ApprovalStatus.REJECTED);
        assertThat(result.rejectReason()).isEqualTo("Market is full");
        assertThat(owner.getRole()).isEqualTo(RoleType.CUSTOMER);
        verify(userRepository, never()).save(any());
    }

    @Test
    void reject_throws_whenNotPending() {
        FarmerProfile profile = pendingProfile();
        profile.setApprovalStatus(ApprovalStatus.APPROVED);
        when(farmerProfileRepository.findById(FARMER_ID)).thenReturn(Optional.of(profile));

        assertThatThrownBy(
                        () -> service.reject(FARMER_ID, new RejectFarmerRequest("Other"), ADMIN_ID))
                .isInstanceOf(InvalidApprovalTransitionException.class);
    }

    @Test
    void reinstate_flipsStatus_whenSuspended() {
        FarmerProfile profile = pendingProfile();
        profile.setApprovalStatus(ApprovalStatus.SUSPENDED);
        User owner = customer();
        owner.setRole(RoleType.FARMER);
        when(farmerProfileRepository.findById(FARMER_ID)).thenReturn(Optional.of(profile));
        when(userRepository.findById(USER_ID)).thenReturn(Optional.of(owner));
        when(farmerProfileRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        AdminFarmerDetailResource result = service.reinstate(FARMER_ID);

        assertThat(result.approvalStatus()).isEqualTo(ApprovalStatus.APPROVED);
        assertThat(owner.getRole()).isEqualTo(RoleType.FARMER);
    }

    @Test
    void reinstate_throws_whenNotSuspended() {
        FarmerProfile profile = pendingProfile();
        when(farmerProfileRepository.findById(FARMER_ID)).thenReturn(Optional.of(profile));

        assertThatThrownBy(() -> service.reinstate(FARMER_ID))
                .isInstanceOf(InvalidApprovalTransitionException.class);
    }
}

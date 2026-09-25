package com.techx.intervue.modules.farmer.services.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.techx.intervue.modules.farmer.entities.FarmerProfile;
import com.techx.intervue.modules.farmer.enums.ApprovalStatus;
import com.techx.intervue.modules.farmer.exceptions.FarmerApplicationExistsException;
import com.techx.intervue.modules.farmer.exceptions.FarmerProfileNotFoundException;
import com.techx.intervue.modules.farmer.exceptions.InvalidApprovalTransitionException;
import com.techx.intervue.modules.farmer.repositories.FarmerProfileRepository;
import com.techx.intervue.modules.farmer.requests.FarmerApplicationRequest;
import com.techx.intervue.modules.farmer.requests.RejectFarmerRequest;
import com.techx.intervue.modules.farmer.resources.AdminFarmerDetailResource;
import com.techx.intervue.modules.farmer.resources.FarmerProfileResource;
import com.techx.intervue.modules.notification.enums.NotificationKind;
import com.techx.intervue.modules.notification.services.interfaces.NotificationServiceInterface;
import com.techx.intervue.modules.user.entities.User;
import com.techx.intervue.modules.user.enums.RoleType;
import com.techx.intervue.modules.user.repositories.UserRepository;
import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class FarmerServiceTest {

    private static final long USER_ID = 1L;
    private static final long FARMER_ID = 10L;
    private static final long ADMIN_ID = 99L;

    private FarmerProfileRepository farmerProfileRepository;
    private UserRepository userRepository;
    private NotificationServiceInterface notifications;
    private FarmerService service;

    @BeforeEach
    void setUp() {
        farmerProfileRepository = mock(FarmerProfileRepository.class);
        userRepository = mock(UserRepository.class);
        notifications = mock(NotificationServiceInterface.class);
        service = new FarmerService(farmerProfileRepository, userRepository, notifications);
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

    /** Điền các trường bắt buộc, để mọi trường mở rộng (prototype) null/rỗng. */
    private static FarmerApplicationRequest minimalRequest(String stallName, String contactPerson) {
        return new FarmerApplicationRequest(
                stallName,
                contactPerson,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null);
    }

    @Test
    void apply_createsPendingProfile_whenNoneExists() {
        when(farmerProfileRepository.existsByUserId(USER_ID)).thenReturn(false);
        when(farmerProfileRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        FarmerProfileResource result =
                service.apply(USER_ID, minimalRequest(" Khang Family Greens ", " Khang "));

        assertThat(result.stallName()).isEqualTo("Khang Family Greens");
        assertThat(result.contactPerson()).isEqualTo("Khang");
        assertThat(result.approvalStatus()).isEqualTo(ApprovalStatus.PENDING);
    }

    @Test
    void apply_persistsPrototypeFields_whenProvided() {
        when(farmerProfileRepository.existsByUserId(USER_ID)).thenReturn(false);
        when(farmerProfileRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        FarmerApplicationRequest request =
                new FarmerApplicationRequest(
                        "Khang Family Greens",
                        "Khang",
                        "Grown with love",
                        List.of("Leafy greens", "Herbs"),
                        "Water spinach, choy sum",
                        "About 120 bunches",
                        "No pesticides",
                        "Hamlet 3, Hoc Mon",
                        "5,000 m2",
                        2019,
                        new BigDecimal("10.87210000"),
                        new BigDecimal("106.59310000"),
                        List.of(
                                "/uploads/farmer-applications/a.jpg",
                                "/uploads/farmer-applications/b.jpg"),
                        "/uploads/farmer-applications/c.mp4",
                        "Bà Chiểu Green Market");

        FarmerProfileResource result = service.apply(USER_ID, request);

        assertThat(result.categories()).containsExactly("Leafy greens", "Herbs");
        assertThat(result.photoUrls())
                .containsExactly(
                        "/uploads/farmer-applications/a.jpg", "/uploads/farmer-applications/b.jpg");
        assertThat(result.videoUrl()).isEqualTo("/uploads/farmer-applications/c.mp4");
        assertThat(result.plotLatitude()).isEqualByComparingTo("10.87210000");
        assertThat(result.preferredMarketName()).isEqualTo("Bà Chiểu Green Market");
        assertThat(result.growingSinceYear()).isEqualTo(2019);
    }

    @Test
    void apply_throws_whenAlreadyApplied() {
        when(farmerProfileRepository.existsByUserId(USER_ID)).thenReturn(true);

        assertThatThrownBy(() -> service.apply(USER_ID, minimalRequest("Stall", "Person")))
                .isInstanceOf(FarmerApplicationExistsException.class);
        verify(farmerProfileRepository, never()).save(any());
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

        AdminFarmerDetailResource result = service.suspend(FARMER_ID);

        assertThat(result.approvalStatus()).isEqualTo(ApprovalStatus.SUSPENDED);
        assertThat(owner.getRole()).isEqualTo(RoleType.FARMER);
        verify(userRepository, never()).save(any());
    }

    @Test
    void suspend_throws_whenNotApproved() {
        FarmerProfile profile = pendingProfile();
        when(farmerProfileRepository.findById(FARMER_ID)).thenReturn(Optional.of(profile));

        assertThatThrownBy(() -> service.suspend(FARMER_ID))
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
                service.reject(FARMER_ID, new RejectFarmerRequest(" Market is full "));

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

        assertThatThrownBy(() -> service.reject(FARMER_ID, new RejectFarmerRequest("Other")))
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

    // FR-042: mỗi quyết định về đơn Farmer báo cho người liên quan

    private FarmerProfile withStatus(ApprovalStatus status) {
        FarmerProfile profile = pendingProfile();
        profile.setApprovalStatus(status);
        when(farmerProfileRepository.findById(FARMER_ID)).thenReturn(Optional.of(profile));
        when(userRepository.findById(USER_ID)).thenReturn(Optional.of(customer()));
        when(farmerProfileRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(userRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        return profile;
    }

    @Test
    void applyingTellsTheAdminsWithALinkToTheApplication() {
        when(farmerProfileRepository.existsByUserId(USER_ID)).thenReturn(false);
        when(farmerProfileRepository.save(any()))
                .thenAnswer(
                        inv -> {
                            FarmerProfile p = inv.getArgument(0);
                            p.setId(FARMER_ID);
                            return p;
                        });

        service.apply(USER_ID, minimalRequest("Khang Family Greens", "Khang"));

        verify(notifications)
                .notifyAdmins(
                        argThat(
                                e ->
                                        e.kind() == NotificationKind.FARMER_APPLICATION
                                                && e.link().equals("/admin/farmers/" + FARMER_ID)
                                                && e.params()
                                                        .get("stall")
                                                        .equals("Khang Family Greens")));
    }

    @Test
    void approvingTellsTheOwner() {
        withStatus(ApprovalStatus.PENDING);

        service.approve(FARMER_ID, ADMIN_ID);

        verify(notifications)
                .dispatch(
                        eq(List.of(USER_ID)),
                        argThat(
                                e ->
                                        e.kind() == NotificationKind.FARMER_APPROVED
                                                && e.link().equals("/farmer")
                                                && e.params()
                                                        .get("stall")
                                                        .equals("Khang Family Greens")));
    }

    @Test
    void rejectingSendsTheReasonToTheOwner() {
        withStatus(ApprovalStatus.PENDING);

        service.reject(FARMER_ID, new RejectFarmerRequest(" Market is full "));

        verify(notifications)
                .dispatch(
                        eq(List.of(USER_ID)),
                        argThat(
                                e ->
                                        e.kind() == NotificationKind.FARMER_REJECTED
                                                && e.link().equals("/become-farmer")
                                                && e.params()
                                                        .get("reason")
                                                        .equals("Market is full")));
    }

    @Test
    void suspendingTellsTheOwner() {
        withStatus(ApprovalStatus.APPROVED);

        service.suspend(FARMER_ID);

        verify(notifications)
                .dispatch(
                        eq(List.of(USER_ID)),
                        argThat(
                                e ->
                                        e.kind() == NotificationKind.FARMER_SUSPENDED
                                                && e.link().equals("/farmer/pending")));
    }

    @Test
    void reinstatingTellsTheOwner() {
        withStatus(ApprovalStatus.SUSPENDED);

        service.reinstate(FARMER_ID);

        verify(notifications)
                .dispatch(
                        eq(List.of(USER_ID)),
                        argThat(
                                e ->
                                        e.kind() == NotificationKind.FARMER_REINSTATED
                                                && e.link().equals("/farmer")));
    }

    @Test
    void aRefusedTransitionSendsNothing() {
        withStatus(ApprovalStatus.APPROVED);

        assertThatThrownBy(() -> service.approve(FARMER_ID, ADMIN_ID))
                .isInstanceOf(InvalidApprovalTransitionException.class);
        verifyNoInteractions(notifications);
    }
}

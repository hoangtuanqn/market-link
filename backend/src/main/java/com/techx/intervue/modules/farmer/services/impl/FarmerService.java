package com.techx.intervue.modules.farmer.services.impl;

import com.techx.intervue.helpers.TransactionHelper;
import com.techx.intervue.modules.farmer.entities.FarmerApplicationHistory;
import com.techx.intervue.modules.farmer.entities.FarmerProfile;
import com.techx.intervue.modules.farmer.enums.ApprovalStatus;
import com.techx.intervue.modules.farmer.exceptions.FarmerApplicationExistsException;
import com.techx.intervue.modules.farmer.exceptions.FarmerProfileNotFoundException;
import com.techx.intervue.modules.farmer.exceptions.InvalidApprovalTransitionException;
import com.techx.intervue.modules.farmer.repositories.AdminFarmerStatusHistoryQueryRepository;
import com.techx.intervue.modules.farmer.repositories.FarmerApplicationHistoryRepository;
import com.techx.intervue.modules.farmer.repositories.FarmerProfileRepository;
import com.techx.intervue.modules.farmer.requests.FarmerApplicationRequest;
import com.techx.intervue.modules.farmer.requests.RejectFarmerRequest;
import com.techx.intervue.modules.farmer.requests.SuspendFarmerRequest;
import com.techx.intervue.modules.farmer.resources.AdminFarmerDetailResource;
import com.techx.intervue.modules.farmer.resources.AdminFarmerListItemResource;
import com.techx.intervue.modules.farmer.resources.AdminFarmerStatusHistoryResource;
import com.techx.intervue.modules.farmer.resources.FarmerApplicationHistoryResource;
import com.techx.intervue.modules.farmer.resources.FarmerProfileResource;
import com.techx.intervue.modules.farmer.services.interfaces.FarmerServiceInterface;
import com.techx.intervue.modules.notification.enums.NotificationKind;
import com.techx.intervue.modules.notification.resources.NotificationEvent;
import com.techx.intervue.modules.notification.services.interfaces.NotificationServiceInterface;
import com.techx.intervue.modules.quality.resources.ShelfLifeStandingResource;
import com.techx.intervue.modules.quality.services.interfaces.ShelfLifeStandingServiceInterface;
import com.techx.intervue.modules.user.entities.User;
import com.techx.intervue.modules.user.enums.RoleType;
import com.techx.intervue.modules.user.exceptions.InvalidFieldException;
import com.techx.intervue.modules.user.repositories.UserRepository;
import com.techx.intervue.modules.user.services.impl.UserSessionCache;
import com.techx.intervue.resources.PageResource;
import com.techx.intervue.services.interfaces.JobQueueInterface;
import java.time.Duration;
import java.time.Instant;
import java.util.Collections;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import lombok.AllArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service
@AllArgsConstructor
public class FarmerService implements FarmerServiceInterface {

    public static final String JOB_NOTIFY_SUSPENDED = "farmer.notify-suspended";
    public static final String JOB_NOTIFY_REINSTATED = "farmer.notify-reinstated";

    private static final String LIST_SEPARATOR = ";";
    private static final int MAX_PAGE_SIZE = 50;

    private static final Duration KEEP_FRESH_UPLOADS_FOR = Duration.ofHours(1);

    private final FarmerProfileRepository farmerProfileRepository;
    private final FarmerApplicationHistoryRepository historyRepository;
    private final FarmerUploadService uploadService;
    private final UserRepository userRepository;
    private final UserSessionCache userSessionCache;
    private final NotificationServiceInterface notifications;
    private final ShelfLifeStandingServiceInterface shelfLifeStanding;
    private final FarmerStatusHistoryWriter statusHistory;
    private final JobQueueInterface jobQueue;
    private final AdminFarmerStatusHistoryQueryRepository statusHistoryQueries;

    @Override
    @Transactional
    public FarmerProfileResource apply(Long userId, FarmerApplicationRequest request) {
        FarmerProfile profile =
                farmerProfileRepository.findByUserId(userId).orElseGet(FarmerProfile::new);
        if (profile.getId() != null && profile.getApprovalStatus() != ApprovalStatus.REJECTED) {
            throw new FarmerApplicationExistsException();
        }

        assertOwnsFiles(userId, request);

        profile.setUserId(userId);
        profile.setStallName(request.stallName().trim());
        profile.setContactPerson(request.contactPerson().trim());
        profile.setDescription(normalize(request.description()));
        profile.setPhotoPaths(joinList(request.photoUrls()));
        profile.setVideoPath(normalize(request.videoUrl()));
        profile.setApprovalStatus(ApprovalStatus.PENDING);
        profile.setRejectReason(null);
        profile.setApprovedBy(null);
        profile.setApprovedAt(null);
        farmerProfileRepository.save(profile);

        historyRepository.save(
                FarmerApplicationHistory.builder()
                        .userId(userId)
                        .attempt((int) historyRepository.countByUserId(userId) + 1)
                        .stallName(profile.getStallName())
                        .contactPerson(profile.getContactPerson())
                        .description(profile.getDescription())
                        .photoPaths(profile.getPhotoPaths())
                        .videoPath(profile.getVideoPath())
                        .status(ApprovalStatus.PENDING)
                        .build());

        cleanUpFiles(userId);
        notifications.notifyAdmins(
                NotificationEvent.of(
                        NotificationKind.FARMER_APPLICATION,
                        "/admin/farmers/" + profile.getId(),
                        Map.of("stall", profile.getStallName())));
        return toOwnResource(profile, historyOf(userId));
    }

    @Override
    @Transactional
    public void withdraw(Long userId) {
        FarmerProfile profile =
                farmerProfileRepository
                        .findByUserId(userId)
                        .orElseThrow(FarmerProfileNotFoundException::new);
        if (profile.getApprovalStatus() != ApprovalStatus.PENDING) {
            throw new InvalidApprovalTransitionException(
                    "Only an application that is still waiting can be withdrawn.");
        }
        historyRepository
                .findFirstByUserIdOrderByAttemptDesc(userId)
                .filter(attempt -> attempt.getStatus() == ApprovalStatus.PENDING)
                .ifPresent(historyRepository::delete);
        farmerProfileRepository.delete(profile);
        cleanUpFiles(userId);
    }

    private void assertOwnsFiles(Long userId, FarmerApplicationRequest request) {
        List<String> urls = request.photoUrls() == null ? List.of() : request.photoUrls();
        for (String url : urls) {
            if (!uploadService.isOwnedBy(url, userId)) {
                throw new InvalidFieldException("photoUrls", "Upload the photos again.");
            }
        }
        if (!uploadService.isOwnedBy(request.videoUrl(), userId)) {
            throw new InvalidFieldException("videoUrl", "Upload the video again.");
        }
    }

    private void cleanUpFiles(Long userId) {
        Set<String> keep = new HashSet<>();
        farmerProfileRepository
                .findByUserId(userId)
                .ifPresent(
                        profile -> {
                            keep.addAll(splitList(profile.getPhotoPaths()));
                            if (profile.getVideoPath() != null) {
                                keep.add(profile.getVideoPath());
                            }
                        });
        for (FarmerApplicationHistory attempt :
                historyRepository.findByUserIdOrderByAttemptDesc(userId)) {
            keep.addAll(splitList(attempt.getPhotoPaths()));
            if (attempt.getVideoPath() != null) {
                keep.add(attempt.getVideoPath());
            }
        }
        uploadService.deleteUnreferenced(userId, keep, Instant.now().minus(KEEP_FRESH_UPLOADS_FOR));
    }

    @Override
    public FarmerProfileResource getMyProfile(Long userId) {
        return farmerProfileRepository
                .findByUserId(userId)
                .map(profile -> toOwnResource(profile, historyOf(userId)))
                .orElse(null);
    }

    @Override
    public PageResource<AdminFarmerListItemResource> listForAdmin(
            ApprovalStatus status, String query, int page, int pageSize) {
        String like =
                StringUtils.hasText(query)
                        ? "%" + query.trim().toLowerCase(Locale.ROOT) + "%"
                        : null;
        Pageable pageable = PageRequest.of(Math.max(page - 1, 0), pageSize);
        Page<AdminFarmerListItemResource> result =
                farmerProfileRepository.search(status, like, pageable);
        return PageResource.<AdminFarmerListItemResource>builder()
                .items(result.getContent())
                .page(page)
                .pageSize(pageSize)
                .total(result.getTotalElements())
                .build();
    }

    @Override
    public AdminFarmerDetailResource getDetailForAdmin(Long farmerId) {
        FarmerProfile profile = findProfileOrThrow(farmerId);
        return toDetailResource(profile, findOwnerOrThrow(profile));
    }

    @Override
    @Transactional
    public AdminFarmerDetailResource approve(Long farmerId, Long adminUserId) {
        FarmerProfile profile = findProfileOrThrow(farmerId);
        if (profile.getApprovalStatus() != ApprovalStatus.PENDING) {
            throw new InvalidApprovalTransitionException(
                    "Only a pending application can be approved.");
        }
        Instant now = Instant.now();
        profile.setApprovalStatus(ApprovalStatus.APPROVED);
        profile.setApprovedBy(adminUserId);
        profile.setApprovedAt(now);
        farmerProfileRepository.save(profile);
        decideLatestAttempt(profile.getUserId(), ApprovalStatus.APPROVED, null, adminUserId, now);

        User owner = findOwnerOrThrow(profile);
        owner.setRole(RoleType.FARMER);
        userRepository.save(owner);
        userSessionCache.updateRoles(owner.getId(), Set.of(RoleType.FARMER));

        tellOwner(profile, NotificationKind.FARMER_APPROVED, "/farmer", Map.of());
        return toDetailResource(profile, owner);
    }

    @Override
    @Transactional
    public AdminFarmerDetailResource reject(
            Long farmerId, RejectFarmerRequest request, Long adminUserId) {
        FarmerProfile profile = findProfileOrThrow(farmerId);
        if (profile.getApprovalStatus() != ApprovalStatus.PENDING) {
            throw new InvalidApprovalTransitionException(
                    "Only a pending application can be rejected.");
        }
        String reason = request.reason().trim();
        profile.setApprovalStatus(ApprovalStatus.REJECTED);
        profile.setRejectReason(reason);
        farmerProfileRepository.save(profile);
        decideLatestAttempt(
                profile.getUserId(), ApprovalStatus.REJECTED, reason, adminUserId, Instant.now());
        tellOwner(
                profile,
                NotificationKind.FARMER_REJECTED,
                "/become-farmer",
                Map.of("reason", reason));
        return toDetailResource(profile, findOwnerOrThrow(profile));
    }

    private void decideLatestAttempt(
            Long userId, ApprovalStatus status, String reason, Long adminUserId, Instant at) {
        historyRepository
                .findFirstByUserIdOrderByAttemptDesc(userId)
                .ifPresent(
                        attempt -> {
                            attempt.setStatus(status);
                            attempt.setRejectReason(reason);
                            attempt.setDecidedBy(adminUserId);
                            attempt.setDecidedAt(at);
                            historyRepository.save(attempt);
                        });
    }

    @Override
    @Transactional
    public AdminFarmerDetailResource suspend(
            Long farmerId, SuspendFarmerRequest request, Long adminUserId) {
        FarmerProfile profile = findProfileOrThrow(farmerId);
        if (profile.getApprovalStatus() != ApprovalStatus.APPROVED) {
            throw new InvalidApprovalTransitionException(
                    "Only an approved farmer can be suspended.");
        }
        if (request.until() != null && !request.until().isAfter(Instant.now())) {
            throw new InvalidFieldException(
                    "until", "The suspension end time must be in the future.");
        }
        ApprovalStatus from = profile.getApprovalStatus();
        String reason = request.reason().trim();
        profile.setApprovalStatus(ApprovalStatus.SUSPENDED);
        profile.setSuspendReason(reason);
        profile.setSuspendedBy(adminUserId);
        profile.setSuspendedAt(Instant.now());
        profile.setSuspendedUntil(request.until());
        farmerProfileRepository.save(profile);
        statusHistory.record(
                profile.getId(),
                from,
                ApprovalStatus.SUSPENDED,
                reason,
                request.until(),
                adminUserId);
        tellOwner(profile, NotificationKind.FARMER_SUSPENDED, "/farmer/pending", Map.of());

        User owner = findOwnerOrThrow(profile);
        Long ownerId = owner.getId();
        Map<String, String> payload = new HashMap<>();
        payload.put("userId", String.valueOf(ownerId));
        payload.put("email", owner.getEmail());
        payload.put("fullName", owner.getFullName());
        payload.put("stallName", profile.getStallName());
        payload.put("reason", reason);
        payload.put("until", request.until() == null ? "" : request.until().toString());
        TransactionHelper.afterCommit(
                () -> {
                    userSessionCache.revokeAll(ownerId);
                    jobQueue.enqueue(JOB_NOTIFY_SUSPENDED, payload);
                });
        return toDetailResource(profile, owner);
    }

    @Override
    @Transactional
    public AdminFarmerDetailResource reinstate(Long farmerId, Long actorId) {
        FarmerProfile profile = findProfileOrThrow(farmerId);
        if (profile.getApprovalStatus() != ApprovalStatus.SUSPENDED) {
            throw new InvalidApprovalTransitionException(
                    "Only a suspended farmer can be reinstated.");
        }
        ApprovalStatus from = profile.getApprovalStatus();
        profile.setApprovalStatus(ApprovalStatus.APPROVED);
        profile.setSuspendReason(null);
        profile.setSuspendedBy(null);
        profile.setSuspendedAt(null);
        profile.setSuspendedUntil(null);
        farmerProfileRepository.save(profile);
        statusHistory.record(profile.getId(), from, ApprovalStatus.APPROVED, null, null, actorId);
        tellOwner(profile, NotificationKind.FARMER_REINSTATED, "/farmer", Map.of());

        User owner = findOwnerOrThrow(profile);
        Map<String, String> payload = new HashMap<>();
        payload.put("userId", String.valueOf(owner.getId()));
        payload.put("email", owner.getEmail());
        payload.put("fullName", owner.getFullName());
        payload.put("stallName", profile.getStallName());
        TransactionHelper.afterCommit(() -> jobQueue.enqueue(JOB_NOTIFY_REINSTATED, payload));
        return toDetailResource(profile, owner);
    }

    @Override
    @Transactional(readOnly = true)
    public PageResource<AdminFarmerStatusHistoryResource> statusHistory(
            long farmerId, int page, int pageSize) {
        findProfileOrThrow(farmerId);
        return statusHistoryQueries.search(
                farmerId, Math.max(1, page), Math.min(MAX_PAGE_SIZE, Math.max(1, pageSize)));
    }

    private void tellOwner(
            FarmerProfile profile, NotificationKind kind, String link, Map<String, String> extra) {
        Map<String, String> params = new HashMap<>(extra);
        params.put("stall", profile.getStallName());
        notifications.dispatch(
                List.of(profile.getUserId()), NotificationEvent.of(kind, link, params));
    }

    private FarmerProfile findProfileOrThrow(Long farmerId) {
        return farmerProfileRepository
                .findById(farmerId)
                .orElseThrow(FarmerProfileNotFoundException::new);
    }

    private User findOwnerOrThrow(FarmerProfile profile) {
        return userRepository
                .findById(profile.getUserId())
                .orElseThrow(() -> new BadCredentialsException("Account not found."));
    }

    private List<FarmerApplicationHistoryResource> historyOf(Long userId) {
        return historyRepository.findByUserIdOrderByAttemptDesc(userId).stream()
                .map(FarmerService::toHistoryResource)
                .toList();
    }

    private static FarmerApplicationHistoryResource toHistoryResource(
            FarmerApplicationHistory attempt) {
        return FarmerApplicationHistoryResource.builder()
                .id(attempt.getId())
                .attempt(attempt.getAttempt())
                .stallName(attempt.getStallName())
                .contactPerson(attempt.getContactPerson())
                .description(attempt.getDescription())
                .photoUrls(splitList(attempt.getPhotoPaths()))
                .videoUrl(attempt.getVideoPath())
                .status(attempt.getStatus())
                .rejectReason(attempt.getRejectReason())
                .decidedAt(attempt.getDecidedAt())
                .submittedAt(attempt.getSubmittedAt())
                .build();
    }

    private AdminFarmerDetailResource toDetailResource(FarmerProfile profile, User owner) {
        ShelfLifeStandingResource strikes = shelfLifeStanding.standing(profile.getId());
        return AdminFarmerDetailResource.builder()
                .id(profile.getId())
                .userId(owner.getId())
                .stallName(profile.getStallName())
                .contactPerson(profile.getContactPerson())
                .description(profile.getDescription())
                .photoUrls(splitList(profile.getPhotoPaths()))
                .videoUrl(profile.getVideoPath())
                .email(owner.getEmail())
                .phone(owner.getPhone())
                .address(owner.getAddress())
                .approvalStatus(profile.getApprovalStatus())
                .rejectReason(profile.getRejectReason())
                .suspendReason(profile.getSuspendReason())
                .approvedAt(profile.getApprovedAt())
                .suspendedAt(profile.getSuspendedAt())
                .createdAt(profile.getCreatedAt())
                .history(historyOf(profile.getUserId()))
                .customerSince(owner.getCreatedAt())
                .accountStatus(owner.getStatus())
                .activeViolations(strikes.activeViolations())
                .extensionLockedUntil(strikes.extensionLockedUntil())
                .build();
    }

    private static FarmerProfileResource toOwnResource(
            FarmerProfile profile, List<FarmerApplicationHistoryResource> history) {
        return FarmerProfileResource.builder()
                .id(profile.getId())
                .stallName(profile.getStallName())
                .contactPerson(profile.getContactPerson())
                .description(profile.getDescription())
                .photoUrls(splitList(profile.getPhotoPaths()))
                .videoUrl(profile.getVideoPath())
                .approvalStatus(profile.getApprovalStatus())
                .rejectReason(profile.getRejectReason())
                .suspendReason(profile.getSuspendReason())
                .history(history)
                .createdAt(profile.getCreatedAt())
                .build();
    }

    private static String normalize(String value) {
        return StringUtils.hasText(value) ? value.trim() : null;
    }

    private static String joinList(List<String> values) {
        if (values == null || values.isEmpty()) {
            return null;
        }
        String joined =
                values.stream()
                        .filter(StringUtils::hasText)
                        .map(String::trim)
                        .reduce((a, b) -> a + LIST_SEPARATOR + b)
                        .orElse(null);
        return StringUtils.hasText(joined) ? joined : null;
    }

    private static List<String> splitList(String stored) {
        if (!StringUtils.hasText(stored)) {
            return Collections.emptyList();
        }
        return List.of(stored.split(LIST_SEPARATOR));
    }
}

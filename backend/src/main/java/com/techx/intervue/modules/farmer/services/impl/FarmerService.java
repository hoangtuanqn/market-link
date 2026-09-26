package com.techx.intervue.modules.farmer.services.impl;

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
import com.techx.intervue.modules.farmer.resources.AdminFarmerListItemResource;
import com.techx.intervue.modules.farmer.resources.FarmerApplicationHistoryResource;
import com.techx.intervue.modules.farmer.resources.FarmerProfileResource;
import com.techx.intervue.modules.farmer.services.interfaces.FarmerServiceInterface;
import com.techx.intervue.modules.notification.enums.NotificationKind;
import com.techx.intervue.modules.notification.resources.NotificationEvent;
import com.techx.intervue.modules.notification.services.interfaces.NotificationServiceInterface;
import com.techx.intervue.modules.user.entities.User;
import com.techx.intervue.modules.user.enums.RoleType;
import com.techx.intervue.modules.user.exceptions.InvalidFieldException;
import com.techx.intervue.modules.user.repositories.UserRepository;
import com.techx.intervue.modules.user.services.impl.UserSessionCache;
import com.techx.intervue.resources.PageResource;
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

/**
 * Bước 3 roadmap backend (docs/MarketLink-Farmer-Profile-and-Approval.md), mở rộng theo prototype
 * (docs/prototype/customer/become-farmer.html). Model role-transition: một tài khoản chỉ có một
 * role tại một thời điểm (D-08 — không multi-profile). Customer nộp đơn vẫn giữ role customer tới
 * khi Admin duyệt mới chuyển sang farmer (§4, §7).
 *
 * <p>Đơn chỉ gồm thông tin sạp, ảnh/video và các cam kết. Mặt hàng, cách canh tác và chợ muốn bán
 * được khai sau khi duyệt ở panel Farmer (FR-060…FR-064), nên không nằm trong đơn.
 *
 * <p>Ảnh/video lưu path cục bộ do {@code FarmerUploadService} sinh ra — chỉ phục vụ test/demo,
 * không phải hạ tầng lưu trữ production.
 */
@Service
@AllArgsConstructor
public class FarmerService implements FarmerServiceInterface {

    private static final String LIST_SEPARATOR = ";";

    /** Ảnh vừa tải lên chưa kịp gửi kèm đơn thì chưa phải rác — chỉ dọn file cũ hơn mốc này. */
    private static final Duration KEEP_FRESH_UPLOADS_FOR = Duration.ofHours(1);

    private final FarmerProfileRepository farmerProfileRepository;
    private final FarmerApplicationHistoryRepository historyRepository;
    private final FarmerUploadService uploadService;
    private final UserRepository userRepository;
    private final UserSessionCache userSessionCache;
    private final NotificationServiceInterface notifications;

    /**
     * §4: tạo hồ sơ PENDING, không nhận approval_status từ client.
     *
     * <p>Bị từ chối thì được nộp lại: hồ sơ cũ bị ghi đè (rejected → pending, xoá lý do) để giữ
     * UNIQUE(user_id), còn nội dung và lý do của lần trước vẫn nằm nguyên trong
     * farmer_application_history. Đang chờ duyệt, đã duyệt hay đang bị đình chỉ thì không nộp nữa.
     */
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

        // Nộp lại thì ảnh của lần trước không còn ai trỏ tới nữa: dọn ngay thay vì đợi job.
        cleanUpFiles(userId);
        notifications.notifyAdmins(
                NotificationEvent.of(
                        NotificationKind.FARMER_APPLICATION,
                        "/admin/farmers/" + profile.getId(),
                        Map.of("stall", profile.getStallName())));
        return toOwnResource(profile, historyOf(userId));
    }

    /**
     * Rút đơn khi còn đang chờ duyệt: hồ sơ và lần nộp đó biến mất, tài khoản trở lại như chưa từng
     * nộp. Đã duyệt, đã bị từ chối hay đang đình chỉ thì không rút — những trạng thái đó là kết quả
     * đã có, không phải việc đang chờ.
     */
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

    /** Ảnh/video gửi kèm phải là file chính tài khoản đó vừa tải lên. */
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

    /** Xoá file của tài khoản này mà không đơn nào — hiện tại hay trong lịch sử — còn trỏ tới. */
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

    /**
     * §5.1: null nếu tài khoản chưa từng nộp đơn — FE coi đây là trạng thái "empty", không phải
     * lỗi.
     */
    @Override
    public FarmerProfileResource getMyProfile(Long userId) {
        return farmerProfileRepository
                .findByUserId(userId)
                .map(profile -> toOwnResource(profile, historyOf(userId)))
                .orElse(null);
    }

    /**
     * §6.1: phân trang, lọc theo trạng thái duyệt, tìm theo tên sạp / người liên hệ / email / điện
     * thoại. Thứ tự sắp xếp nằm trong câu JPQL nên Pageable ở đây không mang Sort.
     */
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

    /** §6.2. */
    @Override
    public AdminFarmerDetailResource getDetailForAdmin(Long farmerId) {
        FarmerProfile profile = findProfileOrThrow(farmerId);
        return toDetailResource(profile, findOwnerOrThrow(profile));
    }

    /** §7: chỉ PENDING mới được duyệt; role chuyển sang farmer trong cùng transaction. */
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
        // JwtAuthFilter đọc role từ phiên trong Redis, không từ claim: không ghi lại thì Farmer
        // vừa duyệt vẫn mang ROLE_CUSTOMER tới hết TTL access token.
        userSessionCache.updateRoles(owner.getId(), Set.of(RoleType.FARMER));

        tellOwner(profile, NotificationKind.FARMER_APPROVED, "/farmer", Map.of());
        return toDetailResource(profile, owner);
    }

    /**
     * docs/prototype/admin/farmers.html — chỉ PENDING mới bị từ chối; role vẫn customer (chưa từng
     * chuyển sang farmer).
     */
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

    /**
     * Kết quả của Admin ghi vào lần nộp mới nhất. Không tìm thấy hàng nào (hồ sơ có từ trước khi
     * bảng lịch sử ra đời và migration bỏ sót) thì bỏ qua — không chặn việc duyệt vì thiếu lịch sử.
     */
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

    /**
     * §8: chỉ APPROVED mới bị đình chỉ; role vẫn farmer (D-09 — vẫn đăng nhập được). Lý do là bắt
     * buộc vì chính Farmer đọc lại nó trên trang hồ sơ của mình.
     */
    @Override
    @Transactional
    public AdminFarmerDetailResource suspend(
            Long farmerId, SuspendFarmerRequest request, Long adminUserId) {
        FarmerProfile profile = findProfileOrThrow(farmerId);
        if (profile.getApprovalStatus() != ApprovalStatus.APPROVED) {
            throw new InvalidApprovalTransitionException(
                    "Only an approved farmer can be suspended.");
        }
        profile.setApprovalStatus(ApprovalStatus.SUSPENDED);
        profile.setSuspendReason(request.reason().trim());
        profile.setSuspendedBy(adminUserId);
        profile.setSuspendedAt(Instant.now());
        farmerProfileRepository.save(profile);
        tellOwner(profile, NotificationKind.FARMER_SUSPENDED, "/farmer/pending", Map.of());
        return toDetailResource(profile, findOwnerOrThrow(profile));
    }

    /**
     * docs/prototype/admin/farmers.html "Reinstate" — chỉ SUSPENDED mới quay lại APPROVED; role đã
     * là farmer từ lúc approve, suspend không đổi role nên không cần đổi lại ở đây.
     */
    @Override
    @Transactional
    public AdminFarmerDetailResource reinstate(Long farmerId) {
        FarmerProfile profile = findProfileOrThrow(farmerId);
        if (profile.getApprovalStatus() != ApprovalStatus.SUSPENDED) {
            throw new InvalidApprovalTransitionException(
                    "Only a suspended farmer can be reinstated.");
        }
        profile.setApprovalStatus(ApprovalStatus.APPROVED);
        // Gỡ đình chỉ thì lý do cũ không còn đúng nữa: Farmer không nên thấy banner đỏ của lần
        // trước.
        profile.setSuspendReason(null);
        profile.setSuspendedBy(null);
        profile.setSuspendedAt(null);
        farmerProfileRepository.save(profile);
        tellOwner(profile, NotificationKind.FARMER_REINSTATED, "/farmer", Map.of());
        return toDetailResource(profile, findOwnerOrThrow(profile));
    }

    /** FR-042: báo chủ đơn; đẩy realtime sau commit (NotificationService dùng afterCommit). */
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

    /** Lịch sử nộp đơn của một tài khoản, mới nhất trước. */
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

    /** Trường text optional — chuỗi rỗng/toàn khoảng trắng lưu thành NULL, không lưu rác. */
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

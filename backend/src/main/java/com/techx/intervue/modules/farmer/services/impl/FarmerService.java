package com.techx.intervue.modules.farmer.services.impl;

import com.techx.intervue.modules.farmer.entities.FarmerProfile;
import com.techx.intervue.modules.farmer.enums.ApprovalStatus;
import com.techx.intervue.modules.farmer.exceptions.FarmerApplicationExistsException;
import com.techx.intervue.modules.farmer.exceptions.FarmerProfileNotFoundException;
import com.techx.intervue.modules.farmer.exceptions.InvalidApprovalTransitionException;
import com.techx.intervue.modules.farmer.repositories.FarmerProfileRepository;
import com.techx.intervue.modules.farmer.requests.FarmerApplicationRequest;
import com.techx.intervue.modules.farmer.requests.RejectFarmerRequest;
import com.techx.intervue.modules.farmer.resources.AdminFarmerDetailResource;
import com.techx.intervue.modules.farmer.resources.AdminFarmerListItemResource;
import com.techx.intervue.modules.farmer.resources.FarmerProfileResource;
import com.techx.intervue.modules.farmer.services.interfaces.FarmerServiceInterface;
import com.techx.intervue.modules.user.entities.User;
import com.techx.intervue.modules.user.enums.RoleType;
import com.techx.intervue.modules.user.repositories.UserRepository;
import com.techx.intervue.modules.user.services.impl.UserSessionCache;
import com.techx.intervue.resources.PageResource;
import java.time.Instant;
import java.util.Collections;
import java.util.List;
import java.util.Set;
import lombok.AllArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
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

    private final FarmerProfileRepository farmerProfileRepository;
    private final UserRepository userRepository;
    private final UserSessionCache userSessionCache;

    /**
     * §4: tạo hồ sơ PENDING, không nhận approval_status từ client. Một tài khoản chỉ nộp một lần.
     */
    @Override
    @Transactional
    public FarmerProfileResource apply(Long userId, FarmerApplicationRequest request) {
        if (farmerProfileRepository.existsByUserId(userId)) {
            throw new FarmerApplicationExistsException();
        }
        FarmerProfile profile =
                farmerProfileRepository.save(
                        FarmerProfile.builder()
                                .userId(userId)
                                .stallName(request.stallName().trim())
                                .contactPerson(request.contactPerson().trim())
                                .description(normalize(request.description()))
                                .photoPaths(joinList(request.photoUrls()))
                                .videoPath(normalize(request.videoUrl()))
                                .approvalStatus(ApprovalStatus.PENDING)
                                .build());
        return toOwnResource(profile);
    }

    /**
     * §5.1: null nếu tài khoản chưa từng nộp đơn — FE coi đây là trạng thái "empty", không phải
     * lỗi.
     */
    @Override
    public FarmerProfileResource getMyProfile(Long userId) {
        return farmerProfileRepository
                .findByUserId(userId)
                .map(FarmerService::toOwnResource)
                .orElse(null);
    }

    /** §6.1: phân trang, lọc theo trạng thái duyệt. */
    @Override
    public PageResource<AdminFarmerListItemResource> listForAdmin(
            ApprovalStatus status, int page, int pageSize) {
        Pageable pageable =
                PageRequest.of(
                        Math.max(page - 1, 0), pageSize, Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<FarmerProfile> result =
                status != null
                        ? farmerProfileRepository.findByApprovalStatus(status, pageable)
                        : farmerProfileRepository.findAll(pageable);
        return PageResource.<AdminFarmerListItemResource>builder()
                .items(result.map(this::toAdminListItem).getContent())
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
        profile.setApprovalStatus(ApprovalStatus.APPROVED);
        profile.setApprovedBy(adminUserId);
        profile.setApprovedAt(Instant.now());
        farmerProfileRepository.save(profile);

        User owner = findOwnerOrThrow(profile);
        owner.setRole(RoleType.FARMER);
        userRepository.save(owner);
        // JwtAuthFilter đọc role từ phiên trong Redis, không từ claim: không ghi lại thì Farmer
        // vừa duyệt vẫn mang ROLE_CUSTOMER tới hết TTL access token.
        userSessionCache.updateRoles(owner.getId(), Set.of(RoleType.FARMER));

        return toDetailResource(profile, owner);
    }

    /**
     * docs/prototype/admin/farmers.html — chỉ PENDING mới bị từ chối; role vẫn customer (chưa từng
     * chuyển sang farmer).
     */
    @Override
    @Transactional
    public AdminFarmerDetailResource reject(Long farmerId, RejectFarmerRequest request) {
        FarmerProfile profile = findProfileOrThrow(farmerId);
        if (profile.getApprovalStatus() != ApprovalStatus.PENDING) {
            throw new InvalidApprovalTransitionException(
                    "Only a pending application can be rejected.");
        }
        profile.setApprovalStatus(ApprovalStatus.REJECTED);
        profile.setRejectReason(request.reason().trim());
        farmerProfileRepository.save(profile);
        return toDetailResource(profile, findOwnerOrThrow(profile));
    }

    /** §8: chỉ APPROVED mới bị đình chỉ; role vẫn farmer (D-09 — vẫn đăng nhập được). */
    @Override
    @Transactional
    public AdminFarmerDetailResource suspend(Long farmerId) {
        FarmerProfile profile = findProfileOrThrow(farmerId);
        if (profile.getApprovalStatus() != ApprovalStatus.APPROVED) {
            throw new InvalidApprovalTransitionException(
                    "Only an approved farmer can be suspended.");
        }
        profile.setApprovalStatus(ApprovalStatus.SUSPENDED);
        farmerProfileRepository.save(profile);
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
        farmerProfileRepository.save(profile);
        return toDetailResource(profile, findOwnerOrThrow(profile));
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

    private AdminFarmerListItemResource toAdminListItem(FarmerProfile profile) {
        User owner = findOwnerOrThrow(profile);
        return AdminFarmerListItemResource.builder()
                .id(profile.getId())
                .stallName(profile.getStallName())
                .contactPerson(profile.getContactPerson())
                .email(owner.getEmail())
                .approvalStatus(profile.getApprovalStatus())
                .createdAt(profile.getCreatedAt())
                .build();
    }

    private static AdminFarmerDetailResource toDetailResource(FarmerProfile profile, User owner) {
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
                .approvedAt(profile.getApprovedAt())
                .createdAt(profile.getCreatedAt())
                .customerSince(owner.getCreatedAt())
                .accountStatus(owner.getStatus())
                .build();
    }

    private static FarmerProfileResource toOwnResource(FarmerProfile profile) {
        return FarmerProfileResource.builder()
                .id(profile.getId())
                .stallName(profile.getStallName())
                .contactPerson(profile.getContactPerson())
                .description(profile.getDescription())
                .photoUrls(splitList(profile.getPhotoPaths()))
                .videoUrl(profile.getVideoPath())
                .approvalStatus(profile.getApprovalStatus())
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

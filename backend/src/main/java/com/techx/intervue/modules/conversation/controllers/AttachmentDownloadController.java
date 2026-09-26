package com.techx.intervue.modules.conversation.controllers;

import com.techx.intervue.modules.conversation.services.interfaces.AttachmentServiceInterface;
import com.techx.intervue.modules.user.resources.CustomUserDetails;
import java.time.Duration;
import lombok.AllArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * FR-115, spec §8.2. Trả file nhị phân nên KHÔNG bọc ApiResource — đây là ngoại lệ có chủ ý của quy
 * ước envelope, giống mọi endpoint tải file. Lỗi thì ConversationExceptionHandler vẫn trả envelope
 * bình thường.
 *
 * <p>Cache-Control private: ảnh riêng tư, proxy dùng chung không được giữ lại.
 */
@RestController
@RequestMapping("/api/v1/attachments")
@AllArgsConstructor
public class AttachmentDownloadController {

    private final AttachmentServiceInterface attachmentService;

    @GetMapping("/{id}")
    public ResponseEntity<Resource> download(
            @PathVariable Long id, @AuthenticationPrincipal CustomUserDetails me) {
        // Admin đi con đường riêng (spec §8.3): hẹp hơn, chỉ mở với tin đã bị báo cáo, và có log.
        AttachmentServiceInterface.StoredFile file =
                isAdmin(me)
                        ? attachmentService.readAsAdmin(me.getId(), id)
                        : attachmentService.read(me.getId(), id);
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(file.mime()))
                .contentLength(file.sizeBytes())
                .cacheControl(CacheControl.maxAge(Duration.ofDays(1)).cachePrivate())
                .header("Content-Disposition", "inline")
                .header("X-Content-Type-Options", "nosniff")
                .body(file.body());
    }

    /**
     * Hệ quả có chủ ý: một admin ĐỒNG THỜI là khách hàng trong thread nào đó sẽ đi nhánh admin và
     * không xem được ảnh riêng của chính mình ở đó nếu tin chưa bị báo cáo. Đánh đổi đi đúng hướng
     * — ranh giới của admin hẹp hơn, không rộng hơn.
     */
    private static boolean isAdmin(CustomUserDetails me) {
        return me.getAuthorities().stream().anyMatch(a -> "ROLE_ADMIN".equals(a.getAuthority()));
    }
}

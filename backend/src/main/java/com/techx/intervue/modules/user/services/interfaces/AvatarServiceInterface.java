package com.techx.intervue.modules.user.services.interfaces;

import com.techx.intervue.modules.user.resources.UserResource;
import org.springframework.web.multipart.MultipartFile;

/** Ảnh đại diện của chính user đang đăng nhập (trang Account). */
public interface AvatarServiceInterface {

    /** Đặt hoặc thay ảnh (JPEG/PNG, tối đa 2 MB); server lưu lại thành JPEG vuông tối đa 512px. */
    UserResource setAvatar(Long userId, MultipartFile file);

    /** Gỡ ảnh: FE quay về chữ cái đầu của tên. */
    UserResource removeAvatar(Long userId);
}

package com.techx.intervue.modules.user.services.interfaces;

import com.techx.intervue.modules.user.resources.UserResource;
import org.springframework.web.multipart.MultipartFile;

public interface AvatarServiceInterface {

    UserResource setAvatar(Long userId, MultipartFile file);

    UserResource removeAvatar(Long userId);
}

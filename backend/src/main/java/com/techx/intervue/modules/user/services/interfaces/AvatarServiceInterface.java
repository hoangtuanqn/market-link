package com.techx.intervue.modules.user.services.interfaces;

import com.techx.intervue.modules.user.resources.UserResource;
import org.springframework.web.multipart.MultipartFile;

/** The avatar of the signed-in user themself (Account page). */
public interface AvatarServiceInterface {

    /**
     * Set or replace the image (JPEG/PNG, up to 2 MB); the server stores it as a square JPEG of at
     * most 512px.
     */
    UserResource setAvatar(Long userId, MultipartFile file);

    /** Remove the image: the FE goes back to the initial letter of the name. */
    UserResource removeAvatar(Long userId);
}

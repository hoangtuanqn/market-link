package com.techx.intervue.modules.user.services.interfaces;

import com.techx.intervue.modules.user.requests.UpdateSettingsRequest;
import com.techx.intervue.modules.user.resources.SettingsResource;

/** The display preferences of the signed-in user themself (Settings page). */
public interface SettingsServiceInterface {

    /** If never saved, return null so the client keeps its own (device) choices. */
    SettingsResource get(Long userId);

    SettingsResource update(Long userId, UpdateSettingsRequest request);
}

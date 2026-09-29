package com.techx.intervue.modules.user.services.interfaces;

import com.techx.intervue.modules.user.requests.UpdateSettingsRequest;
import com.techx.intervue.modules.user.resources.SettingsResource;

public interface SettingsServiceInterface {

    SettingsResource get(Long userId);

    SettingsResource update(Long userId, UpdateSettingsRequest request);
}

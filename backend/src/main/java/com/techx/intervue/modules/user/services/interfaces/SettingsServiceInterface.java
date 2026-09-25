package com.techx.intervue.modules.user.services.interfaces;

import com.techx.intervue.modules.user.requests.UpdateSettingsRequest;
import com.techx.intervue.modules.user.resources.SettingsResource;

/** Tuỳ chọn hiển thị của chính user đang đăng nhập (trang Settings). */
public interface SettingsServiceInterface {

    /** Chưa lưu lần nào thì trả mặc định (light, en, VND, metric, dd/MM/yyyy, 24h). */
    SettingsResource get(Long userId);

    SettingsResource update(Long userId, UpdateSettingsRequest request);
}

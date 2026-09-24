package com.techx.intervue.modules.user.requests;

/** Luật validate dùng chung cho các form đăng ký. */
final class RegisterRules {
    /** Di động Việt Nam: 10 số, đầu 03/05/07/08/09. */
    static final String PHONE_REGEX = "^0[35789][0-9]{8}$";

    static final String PHONE_MESSAGE = "Số điện thoại không hợp lệ!";

    static final int PASSWORD_MIN = 6;

    /** BCrypt chỉ nhận tối đa 72 byte. */
    static final int PASSWORD_MAX = 72;

    static final String PASSWORD_MESSAGE = "Mật khẩu phải từ 6 đến 72 ký tự!";

    private RegisterRules() {}
}

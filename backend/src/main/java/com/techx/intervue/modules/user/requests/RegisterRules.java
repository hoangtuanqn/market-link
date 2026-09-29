package com.techx.intervue.modules.user.requests;

final class RegisterRules {
    static final String PHONE_REGEX = "^0[35789][0-9]{8}$";

    static final String PHONE_MESSAGE = "Enter a valid Vietnamese mobile number (10 digits).";

    static final String EMAIL_REGEX = "^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$";

    static final String EMAIL_MESSAGE = "Enter a valid email address.";

    static final int PASSWORD_MIN = 6;

    static final int PASSWORD_MAX = 72;

    static final String PASSWORD_MESSAGE = "Password must be 6 to 72 characters.";

    static final String PASSWORD_BYTES_MESSAGE =
            "Password is too long. Letters with accents and emoji take more room, so use a shorter"
                    + " one.";

    private RegisterRules() {}
}

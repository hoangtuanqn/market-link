package com.techx.intervue.modules.user.requests;

/** Validation rules shared by the sign-up forms. */
final class RegisterRules {
    /** Vietnamese mobile: 10 digits, starting with 03/05/07/08/09. */
    static final String PHONE_REGEX = "^0[35789][0-9]{8}$";

    static final String PHONE_MESSAGE = "Enter a valid Vietnamese mobile number (10 digits).";

    static final int PASSWORD_MIN = 6;

    /** BCrypt only accepts at most 72 bytes. */
    static final int PASSWORD_MAX = 72;

    static final String PASSWORD_MESSAGE = "Password must be 6 to 72 characters.";

    private RegisterRules() {}
}

package com.techx.intervue.modules.user.resources;

import com.techx.intervue.modules.geo.entities.AddressColumns;

/**
 * FR-009: what the sign-up form sent, held in Redis until the code mailed to `email` is entered.
 * `tokenHash` is the SHA-256 of the signup token handed to the browser that filled in the form:
 * only that browser can finish, resend or change this sign-up.
 */
public record PendingSignup(
        String fullName,
        String email,
        String phone,
        String address,
        AddressColumns addressParts,
        String passwordHash,
        String language,
        String tokenHash) {

    public PendingSignup withTokenHash(String hash) {
        return new PendingSignup(
                fullName, email, phone, address, addressParts, passwordHash, language, hash);
    }
}

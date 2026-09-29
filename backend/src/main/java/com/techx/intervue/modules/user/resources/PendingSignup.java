package com.techx.intervue.modules.user.resources;

import com.techx.intervue.modules.geo.entities.AddressColumns;

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

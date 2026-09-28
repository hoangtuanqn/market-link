package com.techx.intervue.modules.user.resources;

import com.techx.intervue.modules.geo.entities.AddressColumns;

/**
 * FR-009: what the sign-up form sent, held in Redis until the code mailed to `email` is entered.
 */
public record PendingSignup(
        String fullName,
        String email,
        String phone,
        String address,
        AddressColumns addressParts,
        String passwordHash,
        String language) {}

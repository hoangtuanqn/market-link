package com.techx.intervue.services.interfaces;

import java.time.Instant;

public interface BlacklistServiceInterface {
    static final String PREFIX = "blacklist:jti:";

    public void revoke(String jti, Instant expiresAt);

    public Boolean isRevoked(String jti);
}

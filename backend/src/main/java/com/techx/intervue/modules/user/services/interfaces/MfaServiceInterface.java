package com.techx.intervue.modules.user.services.interfaces;

import com.techx.intervue.modules.user.resources.MfaSetupResource;
import com.techx.intervue.modules.user.resources.MfaStatusResource;
import java.util.List;

public interface MfaServiceInterface {

    record PendingLogin(Long userId, boolean rememberMe) {}

    boolean isEnabled(Long userId);

    boolean isSetupRequired(Long userId);

    String startChallenge(Long userId, boolean rememberMe);

    PendingLogin verifyChallenge(String mfaToken, String code, String recoveryCode);

    MfaStatusResource status(Long userId);

    MfaSetupResource setup(Long userId, String email);

    List<String> enable(Long userId, String code);

    void disable(Long userId, String code);

    List<String> regenerateRecoveryCodes(Long userId, String code);
}

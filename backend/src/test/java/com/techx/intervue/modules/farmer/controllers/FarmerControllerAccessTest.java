package com.techx.intervue.modules.farmer.controllers;

import static org.assertj.core.api.Assertions.assertThat;

import java.lang.reflect.Method;
import org.junit.jupiter.api.Test;
import org.springframework.security.access.prepost.PreAuthorize;

/**
 * The repo has no MockMvc/spring-security-test yet so it cannot call the real endpoint to get a 403
 * (that belongs to the controller/integration test item). This test pins exactly one thing: the
 * permission rule of /farmer/apply is not forgotten when someone edits the controller.
 */
class FarmerControllerAccessTest {

    private static String preAuthorizeOf(String methodName, Class<?>... parameterTypes)
            throws NoSuchMethodException {
        Method method = FarmerController.class.getDeclaredMethod(methodName, parameterTypes);
        PreAuthorize annotation = method.getAnnotation(PreAuthorize.class);
        return annotation == null ? null : annotation.value();
    }

    /**
     * Reading your own application: a Customer who is pending / rejected and a Farmer who is
     * approved / suspended all need it. Admin does not — Admin views through /admin/farmers.
     */
    @Test
    void readingYourOwnApplicationIsLimitedToCustomerAndFarmer() throws NoSuchMethodException {
        String rule =
                preAuthorizeOf(
                        "myApplication",
                        com.techx.intervue.modules.user.resources.CustomUserDetails.class);

        assertThat(rule).isNotNull();
        assertThat(rule).contains("CUSTOMER").contains("FARMER");
    }
}

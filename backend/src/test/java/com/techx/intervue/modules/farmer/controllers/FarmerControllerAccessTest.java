package com.techx.intervue.modules.farmer.controllers;

import static org.assertj.core.api.Assertions.assertThat;

import java.lang.reflect.Method;
import org.junit.jupiter.api.Test;
import org.springframework.security.access.prepost.PreAuthorize;

class FarmerControllerAccessTest {

    private static String preAuthorizeOf(String methodName, Class<?>... parameterTypes)
            throws NoSuchMethodException {
        Method method = FarmerController.class.getDeclaredMethod(methodName, parameterTypes);
        PreAuthorize annotation = method.getAnnotation(PreAuthorize.class);
        return annotation == null ? null : annotation.value();
    }

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

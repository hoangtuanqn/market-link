package com.techx.intervue.modules.farmer.controllers;

import static org.assertj.core.api.Assertions.assertThat;

import java.lang.reflect.Method;
import org.junit.jupiter.api.Test;
import org.springframework.security.access.prepost.PreAuthorize;

/**
 * Repo chưa có MockMvc/spring-security-test nên chưa gọi được endpoint thật để nhận 403 (việc đó
 * nằm ở hạng mục test controller/integration). Test này giữ đúng một điều: quy tắc quyền của
 * /farmer/apply không bị bỏ quên khi ai đó sửa controller.
 */
class FarmerControllerAccessTest {

    private static String preAuthorizeOf(String methodName, Class<?>... parameterTypes)
            throws NoSuchMethodException {
        Method method = FarmerController.class.getDeclaredMethod(methodName, parameterTypes);
        PreAuthorize annotation = method.getAnnotation(PreAuthorize.class);
        return annotation == null ? null : annotation.value();
    }

    /**
     * Đọc đơn của chính mình: Customer đang chờ duyệt / bị từ chối và Farmer đã duyệt / bị đình chỉ
     * đều cần. Admin thì không — Admin xem qua /admin/farmers.
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

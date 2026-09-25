package com.techx.intervue.modules.conversation.controllers;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.Arrays;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.web.bind.annotation.RestControllerAdvice;

/**
 * Ghim một lỗi đã xảy ra thật: `assignableTypes` bị bỏ sót một controller thì mọi exception của
 * module bay thẳng ra Tomcat và người dùng nhận 500 thay vì 403/404/413/415/429 mà spec §6.3 hứa.
 * Unit test của service không thấy được điều đó vì nó không đi qua MVC.
 */
class ConversationExceptionHandlerScopeTest {

    @Test
    void everyControllerOfThisModuleIsCoveredByTheHandler() {
        RestControllerAdvice advice =
                ConversationExceptionHandler.class.getAnnotation(RestControllerAdvice.class);

        List<Class<?>> covered = Arrays.asList(advice.assignableTypes());

        assertThat(covered)
                .containsExactlyInAnyOrder(
                        ConversationController.class,
                        AttachmentController.class,
                        AttachmentDownloadController.class);
    }
}

package com.techx.intervue.modules.conversation.controllers;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.Arrays;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.web.bind.annotation.RestControllerAdvice;

/**
 * Pins a bug that really happened: if `assignableTypes` misses one controller then every exception
 * of the module flies straight out to Tomcat and the user gets 500 instead of the
 * 403/404/413/415/429 that spec §6.3 promises. The service's unit test cannot see that because it
 * does not go through MVC.
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
                        AttachmentDownloadController.class,
                        MessageReportController.class,
                        AdminMessageReportController.class,
                        AdminMessageController.class);
    }
}

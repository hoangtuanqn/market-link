package com.techx.intervue.modules.conversation.controllers;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.Arrays;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.web.bind.annotation.RestControllerAdvice;

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

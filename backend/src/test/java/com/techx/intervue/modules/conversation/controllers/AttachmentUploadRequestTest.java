package com.techx.intervue.modules.conversation.controllers;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.techx.intervue.modules.conversation.services.interfaces.AttachmentServiceInterface;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

/**
 * FR-115: an upload without a file is the client's mistake, so it gets the module's 400 envelope,
 * not a 500 with Spring's default body.
 */
class AttachmentUploadRequestTest {

    AttachmentServiceInterface service;
    MockMvc mvc;

    @BeforeEach
    void setUp() {
        service = mock(AttachmentServiceInterface.class);
        mvc =
                MockMvcBuilders.standaloneSetup(new AttachmentController(service))
                        .setControllerAdvice(new ConversationExceptionHandler())
                        .build();
    }

    @Test
    void aRequestThatIsNotMultipartIsA400OnTheFileField() throws Exception {
        mvc.perform(
                        post("/api/v1/attachments")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code").value("VALIDATION_ERROR"))
                .andExpect(jsonPath("$.error.details[0].field").value("file"));
        verify(service, never()).upload(anyLong(), any());
    }

    @Test
    void aMultipartRequestWithoutTheFilePartIsA400OnTheFileField() throws Exception {
        mvc.perform(multipart("/api/v1/attachments").param("other", "1"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code").value("VALIDATION_ERROR"))
                .andExpect(jsonPath("$.error.details[0].field").value("file"));
        verify(service, never()).upload(anyLong(), any());
    }
}

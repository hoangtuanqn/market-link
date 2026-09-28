package com.techx.intervue.modules.conversation.controllers;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyChar;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.techx.intervue.modules.conversation.exceptions.StreamLinkInvalidException;
import com.techx.intervue.modules.conversation.services.interfaces.AttachmentServiceInterface;
import com.techx.intervue.modules.conversation.services.interfaces.AttachmentServiceInterface.StoredFile;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Arrays;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.core.io.FileSystemResource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

/**
 * FR-115 §5: the stream endpoint behind a signed link. MockMvc runs the real Spring MVC return
 * value handling, which is what turns a Range request into 206 — the part a browser needs to seek.
 * The signature and permission rules are AttachmentServiceTest's job; the real filter chain
 * (permitAll without a token) is covered in AttachmentDownloadControllerTest.
 */
class AttachmentStreamControllerTest {

    static final String LINK = "/api/v1/attachments/55/stream?u=3&s=u&e=1790000000&t=sig";

    @TempDir Path dir;

    AttachmentServiceInterface service;
    MockMvc mvc;
    byte[] video;

    @BeforeEach
    void setUp() throws Exception {
        service = mock(AttachmentServiceInterface.class);
        video = new byte[100];
        Arrays.fill(video, (byte) 7);
        video[0] = 1;
        Path file = Files.write(dir.resolve("clip.mp4"), video);
        when(service.stream(55L, 3L, 'u', 1790000000L, "sig"))
                .thenReturn(new StoredFile(new FileSystemResource(file), "video/mp4", 100));
        mvc =
                MockMvcBuilders.standaloneSetup(new AttachmentDownloadController(service))
                        .setControllerAdvice(new ConversationExceptionHandler())
                        .build();
    }

    @Test
    void servesARangeWith206() throws Exception {
        mvc.perform(get(LINK).header("Range", "bytes=0-9"))
                .andExpect(status().isPartialContent())
                .andExpect(header().string("Content-Range", "bytes 0-9/100"))
                .andExpect(header().string("Content-Type", "video/mp4"))
                .andExpect(content().bytes(Arrays.copyOf(video, 10)));
    }

    @Test
    void servesTheWholeFileWithoutARange() throws Exception {
        mvc.perform(get(LINK))
                .andExpect(status().isOk())
                .andExpect(header().string("Accept-Ranges", "bytes"))
                .andExpect(header().string("Content-Disposition", "inline"))
                .andExpect(header().string("X-Content-Type-Options", "nosniff"))
                .andExpect(header().string("Cache-Control", "private"))
                .andExpect(content().bytes(video));
    }

    @Test
    void theDownloadFlagAsksTheBrowserToSaveTheFile() throws Exception {
        mvc.perform(get(LINK + "&download=1"))
                .andExpect(status().isOk())
                .andExpect(
                        header().string(
                                        "Content-Disposition",
                                        "attachment; filename=\"marketlink-55.mp4\""));
    }

    @Test
    void aBadSignatureIsForbiddenWithItsOwnCode() throws Exception {
        when(service.stream(eq(55L), anyLong(), anyChar(), anyLong(), any()))
                .thenThrow(new StreamLinkInvalidException());

        mvc.perform(get("/api/v1/attachments/55/stream?u=3&s=u&e=1790000000&t=forged"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error.code").value("STREAM_LINK_INVALID"));
    }

    /**
     * A link with a missing or mangled part is just as invalid as a forged one — never a 400/500.
     */
    @Test
    void aMalformedLinkIsForbiddenToo() throws Exception {
        for (String query :
                new String[] {
                    "",
                    "?u=3&s=u&e=1790000000",
                    "?u=abc&s=u&e=1790000000&t=sig",
                    "?u=3&s=user&e=1790000000&t=sig",
                    "?u=3&s=u&e=soon&t=sig"
                }) {
            mvc.perform(get("/api/v1/attachments/55/stream" + query))
                    .andExpect(status().isForbidden())
                    .andExpect(jsonPath("$.error.code").value("STREAM_LINK_INVALID"));
        }
    }
}

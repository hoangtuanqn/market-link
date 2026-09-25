package com.techx.intervue.modules.conversation.resources;

/** FR-115. url là đường dẫn tới endpoint có kiểm quyền, không phải link tĩnh. */
public record AttachmentResource(Long attachmentId, String url, Integer width, Integer height) {

    public static final String URL_PREFIX = "/api/v1/attachments/";

    public static AttachmentResource of(Long id, Integer width, Integer height) {
        return new AttachmentResource(id, URL_PREFIX + id, width, height);
    }
}

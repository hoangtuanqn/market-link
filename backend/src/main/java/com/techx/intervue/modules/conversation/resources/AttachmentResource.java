package com.techx.intervue.modules.conversation.resources;

/** FR-115. url is the path to a permission-checked endpoint, not a static link. */
public record AttachmentResource(Long attachmentId, String url, Integer width, Integer height) {

    public static final String URL_PREFIX = "/api/v1/attachments/";

    public static AttachmentResource of(Long id, Integer width, Integer height) {
        return new AttachmentResource(id, URL_PREFIX + id, width, height);
    }
}

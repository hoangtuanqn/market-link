package com.techx.intervue.modules.conversation.resources;

/** FR-115. url is the path to a permission-checked endpoint, not a static link. */
/** FR-115: `mime` tells the client whether to send an image or a video message. */
public record AttachmentResource(
        Long attachmentId, String url, String mime, Integer width, Integer height) {

    public static final String URL_PREFIX = "/api/v1/attachments/";

    public static AttachmentResource of(Long id, String mime, Integer width, Integer height) {
        return new AttachmentResource(id, URL_PREFIX + id, mime, width, height);
    }
}

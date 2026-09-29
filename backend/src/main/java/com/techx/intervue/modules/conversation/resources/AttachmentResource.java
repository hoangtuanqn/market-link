package com.techx.intervue.modules.conversation.resources;

public record AttachmentResource(
        Long attachmentId, String url, String mime, Integer width, Integer height) {

    public static final String URL_PREFIX = "/api/v1/attachments/";

    public static AttachmentResource of(Long id, String mime, Integer width, Integer height) {
        return new AttachmentResource(id, URL_PREFIX + id, mime, width, height);
    }
}

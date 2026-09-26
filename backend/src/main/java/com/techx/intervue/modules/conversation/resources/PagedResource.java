package com.techx.intervue.modules.conversation.resources;

import java.util.List;

/** Trang dữ liệu; page bắt đầu từ 1 để khớp query string. */
public record PagedResource<T>(List<T> items, int page, int pageSize, long total) {}

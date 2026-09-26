package com.techx.intervue.resources;

import java.util.List;
import lombok.Builder;

/** Hình dạng chung cho danh sách có phân trang (envelope §"danh sách có phân trang"). */
@Builder
public record PageResource<T>(List<T> items, int page, int pageSize, long total) {}

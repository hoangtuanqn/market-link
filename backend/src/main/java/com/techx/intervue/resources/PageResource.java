package com.techx.intervue.resources;

import java.util.List;
import lombok.Builder;

@Builder
public record PageResource<T>(List<T> items, int page, int pageSize, long total) {}

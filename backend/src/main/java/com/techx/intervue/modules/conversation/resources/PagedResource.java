package com.techx.intervue.modules.conversation.resources;

import java.util.List;

public record PagedResource<T>(List<T> items, int page, int pageSize, long total) {}

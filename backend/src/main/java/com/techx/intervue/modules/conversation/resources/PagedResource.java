package com.techx.intervue.modules.conversation.resources;

import java.util.List;

/** A page of data; page starts at 1 to match the query string. */
public record PagedResource<T>(List<T> items, int page, int pageSize, long total) {}

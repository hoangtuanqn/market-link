package com.techx.intervue.modules.product.resources;

import java.util.List;

/** Result of applying one weekday: how many products were refilled, which had no template. */
public record ApplyTemplateResultResource(int productsUpdated, List<String> skipped) {}

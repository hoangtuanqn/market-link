package com.techx.intervue.modules.order.resources;

/**
 * The customer's contact — only the order's Farmer sees it, to call the customer when they do not
 * come to pick up (FR-036). A customer viewing their own order needs nothing more about themself
 * here.
 */
public record CustomerSummaryResource(Long userId, String fullName, String phone, String email) {}

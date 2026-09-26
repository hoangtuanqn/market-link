package com.techx.intervue.modules.user.services.interfaces;

import com.techx.intervue.modules.user.resources.AdminCustomerResource;
import com.techx.intervue.resources.PageResource;

/** FR-072 — view, activate or deactivate customer accounts (contract §10). */
public interface AdminCustomerServiceInterface {

    /** {@code status} null = any; {@code query} matches name, email or phone. */
    PageResource<AdminCustomerResource> list(String status, String query, int page, int pageSize);

    /** {@code "active"} | {@code "inactive"}; other values and non-customer accounts are a 400. */
    AdminCustomerResource setStatus(long userId, String status);
}

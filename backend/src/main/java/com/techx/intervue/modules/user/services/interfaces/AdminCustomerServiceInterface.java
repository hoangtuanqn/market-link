package com.techx.intervue.modules.user.services.interfaces;

import com.techx.intervue.modules.user.resources.AdminCustomerResource;
import com.techx.intervue.modules.user.resources.AdminCustomerStatusHistoryResource;
import com.techx.intervue.resources.PageResource;
import java.time.Instant;

public interface AdminCustomerServiceInterface {

    PageResource<AdminCustomerResource> list(String status, String query, int page, int pageSize);

    AdminCustomerResource setStatus(
            long userId, String status, String reason, Instant until, Long actorId);

    AdminCustomerResource detail(long userId);

    PageResource<AdminCustomerStatusHistoryResource> statusHistory(
            long userId, int page, int pageSize);
}

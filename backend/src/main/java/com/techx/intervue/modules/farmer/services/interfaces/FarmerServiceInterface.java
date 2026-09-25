package com.techx.intervue.modules.farmer.services.interfaces;

import com.techx.intervue.modules.farmer.enums.ApprovalStatus;
import com.techx.intervue.modules.farmer.requests.FarmerApplicationRequest;
import com.techx.intervue.modules.farmer.requests.RejectFarmerRequest;
import com.techx.intervue.modules.farmer.requests.SuspendFarmerRequest;
import com.techx.intervue.modules.farmer.resources.AdminFarmerDetailResource;
import com.techx.intervue.modules.farmer.resources.AdminFarmerListItemResource;
import com.techx.intervue.modules.farmer.resources.FarmerProfileResource;
import com.techx.intervue.resources.PageResource;

public interface FarmerServiceInterface {
    FarmerProfileResource apply(Long userId, FarmerApplicationRequest request);

    FarmerProfileResource getMyProfile(Long userId);

    PageResource<AdminFarmerListItemResource> listForAdmin(
            ApprovalStatus status, String query, int page, int pageSize);

    AdminFarmerDetailResource getDetailForAdmin(Long farmerId);

    AdminFarmerDetailResource approve(Long farmerId, Long adminUserId);

    AdminFarmerDetailResource reject(Long farmerId, RejectFarmerRequest request, Long adminUserId);

    AdminFarmerDetailResource suspend(
            Long farmerId, SuspendFarmerRequest request, Long adminUserId);

    AdminFarmerDetailResource reinstate(Long farmerId);
}

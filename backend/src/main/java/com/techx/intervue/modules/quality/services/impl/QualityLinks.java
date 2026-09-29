package com.techx.intervue.modules.quality.services.impl;

final class QualityLinks {

    static final String FARMER_REPORTS = "/farmer/reviews?tab=spoiled";

    static final String ADMIN_QUEUE = "/admin/moderation?tab=quality";

    static final String FARMER_HOME = "/farmer";

    private QualityLinks() {}

    static String order(long orderId) {
        return "/orders/" + orderId;
    }

    static String farmerProduct(long productId) {
        return "/farmer/products/" + productId + "/edit";
    }
}

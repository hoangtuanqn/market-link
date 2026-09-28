package com.techx.intervue.modules.quality.services.impl;

/** Where the spoilage notifications take people (frontend routes, spec §4.6). */
final class QualityLinks {

    /** The stall's reports: Reviews → Spoiled reports. */
    static final String FARMER_REPORTS = "/farmer/reviews?tab=spoiled";

    /** The admin queue: Moderation → Spoiled reports. */
    static final String ADMIN_QUEUE = "/admin/moderation?tab=quality";

    /** The stall's own dashboard, used when there is no single product to point at. */
    static final String FARMER_HOME = "/farmer";

    private QualityLinks() {}

    /** The customer's order detail page. */
    static String order(long orderId) {
        return "/orders/" + orderId;
    }

    /** The stall's edit page for one product, so it can lower the shelf life itself. */
    static String farmerProduct(long productId) {
        return "/farmer/products/" + productId + "/edit";
    }
}

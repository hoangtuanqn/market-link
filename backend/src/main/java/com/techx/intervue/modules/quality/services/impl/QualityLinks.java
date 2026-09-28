package com.techx.intervue.modules.quality.services.impl;

/** Where the spoilage notifications take people (frontend routes, spec §4.6). */
final class QualityLinks {

    /** The stall's reports: Reviews → Spoiled reports. */
    static final String FARMER_REPORTS = "/farmer/reviews?tab=spoiled";

    /** The admin queue: Moderation → Spoiled reports. */
    static final String ADMIN_QUEUE = "/admin/moderation?tab=quality";

    private QualityLinks() {}
}

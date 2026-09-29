package com.techx.intervue.modules.chat.resources;

import java.util.List;

public record FarmerBriefingResource(
        List<String> marketsToday,
        long ordersToday,
        long waitingToBeAccepted,
        long cutoffAlreadyPassed,
        long soldOutProducts,
        long lowStockProducts) {}

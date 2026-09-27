package com.techx.intervue.modules.chat.resources;

import java.util.List;

/**
 * FR-093: what the Farmer Overview banner says at the start of a market day.
 *
 * <p>The numbers are counted in SQL and the sentence is built on the client from its own
 * translations. Wording a handful of counts is not worth an API call, it has to work when no API
 * key is configured, and ten hand-written translations read better than ten generated ones.
 *
 * @param marketsToday markets this stall sells at today, in the order the schedule lists them
 * @param ordersToday orders for today that are still alive (declined and cancelled left out)
 * @param waitingToBeAccepted of those, how many are still waiting for the Farmer to decide
 * @param cutoffAlreadyPassed of those waiting, how many can no longer be edited by the customer
 * @param soldOutProducts products currently marked sold out
 * @param lowStockProducts products still on sale but at or below the low-stock threshold
 */
public record FarmerBriefingResource(
        List<String> marketsToday,
        long ordersToday,
        long waitingToBeAccepted,
        long cutoffAlreadyPassed,
        long soldOutProducts,
        long lowStockProducts) {}

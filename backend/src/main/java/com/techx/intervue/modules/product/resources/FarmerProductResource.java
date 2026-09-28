package com.techx.intervue.modules.product.resources;

/**
 * A product as seen by the owning Farmer: adds the description and the admin's hide flag with its
 * reason (FR-074), so the Farmer knows why it disappeared from the public page. On the list ({@code
 * GET /farmer/products}) it also carries the nearest date a customer can still order for ({@code
 * nextDate}, ISO, null when none within 14 days), what is left for that date and how many units
 * placed/accepted/ready orders hold for it (FR-031, FR-063). The two counts are null whenever
 * {@code nextDate} is, so no client reads a missing date as "0 left". {@code item.stockQuantity}
 * stays the Farmer's own reference number, which the edit form starts from. {@code shelfLife} is
 * filled on the one-product endpoints and null on the list endpoints.
 */
public record FarmerProductResource(
        ProductListItemResource item,
        String description,
        boolean hidden,
        String hiddenReason,
        String nextDate,
        Integer nextDateAvailable,
        Integer nextDateReserved,
        ShelfLifeResource shelfLife) {

    /** List rows (mine, the admin's hidden list): no next-date overlay, no shelf-life block. */
    public FarmerProductResource(
            ProductListItemResource item, String description, boolean hidden, String hiddenReason) {
        this(item, description, hidden, hiddenReason, null, null, null, null);
    }

    /** One product (GET/POST/PUT): carries its shelf-life block for the edit form. */
    public FarmerProductResource(
            ProductListItemResource item,
            String description,
            boolean hidden,
            String hiddenReason,
            ShelfLifeResource shelfLife) {
        this(item, description, hidden, hiddenReason, null, null, null, shelfLife);
    }

    public FarmerProductResource withNextDate(String date, int available, int reserved) {
        return date == null
                ? this
                : new FarmerProductResource(
                        item,
                        description,
                        hidden,
                        hiddenReason,
                        date,
                        available,
                        reserved,
                        shelfLife);
    }
}

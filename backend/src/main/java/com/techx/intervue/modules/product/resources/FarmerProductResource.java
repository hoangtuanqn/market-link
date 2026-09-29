package com.techx.intervue.modules.product.resources;

public record FarmerProductResource(
        ProductListItemResource item,
        String description,
        boolean hidden,
        String hiddenReason,
        String nextDate,
        Integer nextDateAvailable,
        Integer nextDateReserved,
        ShelfLifeResource shelfLife) {

    public FarmerProductResource(
            ProductListItemResource item, String description, boolean hidden, String hiddenReason) {
        this(item, description, hidden, hiddenReason, null, null, null, null);
    }

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

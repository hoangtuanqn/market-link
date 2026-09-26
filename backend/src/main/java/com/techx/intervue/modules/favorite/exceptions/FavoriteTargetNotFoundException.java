package com.techx.intervue.modules.favorite.exceptions;

/** The stall, product or market does not exist or is not public → 404. */
public class FavoriteTargetNotFoundException extends RuntimeException {
    public FavoriteTargetNotFoundException() {
        super("There is nothing to add to favourites here.");
    }
}

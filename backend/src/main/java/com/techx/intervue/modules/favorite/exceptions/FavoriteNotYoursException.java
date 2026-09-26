package com.techx.intervue.modules.favorite.exceptions;

/** R-06: {favoriteId} belongs to someone else → 403, even though the row exists. */
public class FavoriteNotYoursException extends RuntimeException {
    public FavoriteNotYoursException() {
        super("This favourite belongs to another account.");
    }
}

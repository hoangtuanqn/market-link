package com.techx.intervue.modules.favorite.exceptions;

public class FavoriteTargetNotFoundException extends RuntimeException {
    public FavoriteTargetNotFoundException() {
        super("There is nothing to add to favourites here.");
    }
}

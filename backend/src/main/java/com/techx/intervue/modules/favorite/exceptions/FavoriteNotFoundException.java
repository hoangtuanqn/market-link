package com.techx.intervue.modules.favorite.exceptions;

public class FavoriteNotFoundException extends RuntimeException {
    public FavoriteNotFoundException() {
        super("Favourite not found.");
    }
}

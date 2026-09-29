package com.techx.intervue.modules.favorite.exceptions;

public class FavoriteNotYoursException extends RuntimeException {
    public FavoriteNotYoursException() {
        super("This favourite belongs to another account.");
    }
}

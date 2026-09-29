package com.techx.intervue.modules.farmer.exceptions;

public class FarmerApplicationExistsException extends RuntimeException {
    public FarmerApplicationExistsException() {
        super("You already have a farmer application on this account.");
    }
}

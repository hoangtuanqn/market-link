package com.techx.intervue.modules.farmer.exceptions;

/**
 * The account already has a Farmer profile (pending, approved or suspended) → cannot apply again.
 */
public class FarmerApplicationExistsException extends RuntimeException {
    public FarmerApplicationExistsException() {
        super("You already have a farmer application on this account.");
    }
}

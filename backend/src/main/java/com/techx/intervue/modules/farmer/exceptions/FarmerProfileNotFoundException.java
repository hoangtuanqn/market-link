package com.techx.intervue.modules.farmer.exceptions;

/** An Admin calls with the `{id}` of a Farmer profile that does not exist → 404 (R-06). */
public class FarmerProfileNotFoundException extends RuntimeException {
    public FarmerProfileNotFoundException() {
        super("Farmer profile not found.");
    }
}

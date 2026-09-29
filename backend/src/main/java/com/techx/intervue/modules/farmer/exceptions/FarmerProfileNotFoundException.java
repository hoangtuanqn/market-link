package com.techx.intervue.modules.farmer.exceptions;

public class FarmerProfileNotFoundException extends RuntimeException {
    public FarmerProfileNotFoundException() {
        super("Farmer profile not found.");
    }
}

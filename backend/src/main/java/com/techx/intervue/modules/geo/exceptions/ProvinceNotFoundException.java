package com.techx.intervue.modules.geo.exceptions;

/** The province code in the path is not one of the 34 provinces → 404. */
public class ProvinceNotFoundException extends RuntimeException {

    public ProvinceNotFoundException(String code) {
        super("Province " + code + " was not found.");
    }
}

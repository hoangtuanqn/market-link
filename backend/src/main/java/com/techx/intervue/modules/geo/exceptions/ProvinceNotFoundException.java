package com.techx.intervue.modules.geo.exceptions;

public class ProvinceNotFoundException extends RuntimeException {

    public ProvinceNotFoundException(String code) {
        super("Province " + code + " was not found.");
    }
}

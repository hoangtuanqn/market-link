package com.techx.intervue.modules.geo.resources;

/** A ward, commune or special zone as the address form lists it under its province. */
public record WardResource(String code, String name, String fullName) {}
